package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

type Payment struct {
	ID          int     `json:"id"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	DueDate     string  `json:"due_date"`
	Category    string  `json:"category"`
	Responsible string  `json:"responsible"`
	Status      string  `json:"status"`
	PaidAt      string  `json:"paid_at"`
	Frequency   string  `json:"frequency"`
}

func isValidPaymentFrequency(frequency string) bool {
	switch frequency {
	case "once", "weekly", "monthly", "yearly":
		return true
	default:
		return false
	}
}

func paymentsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		getPayments(w, r)
	case http.MethodPost:
		createPayment(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getPayments(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(
		context.Background(),
		`
			SELECT
				id,
				description,
				amount,
				due_date::text,
				category,
				responsible,
				status,
				COALESCE(paid_at::text, ''),
				frequency
			FROM payments
			ORDER BY id
		`,
	)
	if err != nil {
		log.Printf("failed to fetch payments: %v", err)
		http.Error(w, "Failed to get payments", http.StatusInternalServerError)
		return
	}

	defer rows.Close()

	payments := make([]Payment, 0)

	for rows.Next() {
		var payment Payment

		err := rows.Scan(
			&payment.ID,
			&payment.Description,
			&payment.Amount,
			&payment.DueDate,
			&payment.Category,
			&payment.Responsible,
			&payment.Status,
			&payment.PaidAt,
			&payment.Frequency,
		)

		if err != nil {
			log.Printf("failed to scan payment row: %v", err)
			http.Error(w, "Failed to get payments", http.StatusInternalServerError)
			return
		}

		payments = append(payments, payment)
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(payments)
}

func createPayment(w http.ResponseWriter, r *http.Request) {
	var payment Payment

	if err := json.NewDecoder(r.Body).Decode(&payment); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if payment.Description == "" {
		http.Error(w, "Description is required", http.StatusBadRequest)
		return
	}

	if payment.Amount <= 0 {
		http.Error(w, "Amount must be greater than zero", http.StatusBadRequest)
		return
	}

	if payment.Status == "" {
		http.Error(w, "Status is required", http.StatusBadRequest)
		return
	}

	if payment.DueDate == "" {
		http.Error(w, "Due date is required", http.StatusBadRequest)
		return
	}

	if !isValidPaymentFrequency(payment.Frequency) {
		http.Error(w, "Invalid payment frequency", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Printf("failed to begin payment transaction: %v", err)
		http.Error(w, "Failed to create payment", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	recurrenceRuleID := 0

	if payment.Frequency != "once" {
		err = tx.QueryRow(
			ctx,
			`
				INSERT INTO payment_recurrence_rules (
					description,
					amount,
					frequency,
					first_due_date,
					category,
					responsible
				)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id
			`,
			payment.Description,
			payment.Amount,
			payment.Frequency,
			payment.DueDate,
			payment.Category,
			payment.Responsible,
		).Scan(&recurrenceRuleID)

		if err != nil {
			log.Printf("failed to create payment recurrence rule: %v", err)
			http.Error(w, "Failed to create payment", http.StatusInternalServerError)
			return
		}
	}

	err = tx.QueryRow(
		ctx,
		`
			INSERT INTO payments (
				description,
				amount,
				due_date,
				category,
				responsible,
				status,
				paid_at,
				frequency,
				recurrence_rule_id
			)
			VALUES (
				$1, $2, $3, $4, $5, $6,
				NULLIF($7, '')::date,
				$8,
				NULLIF($9, 0)
			)
			RETURNING id
		`,
		payment.Description,
		payment.Amount,
		payment.DueDate,
		payment.Category,
		payment.Responsible,
		payment.Status,
		payment.PaidAt,
		payment.Frequency,
		recurrenceRuleID,
	).Scan(&payment.ID)

	if err != nil {
		log.Printf("failed to create payment: %v", err)
		http.Error(w, "Failed to create payment", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("failed to commit payment transaction: %v", err)
		http.Error(w, "Failed to create payment", http.StatusInternalServerError)
		return
	}

	if recurrenceRuleID != 0 {
		if err := generateUpcomingPayments(ctx); err != nil {
			// O primeiro pagamento já foi salvo. O agendador tentará
			// gerar as próximas ocorrências novamente.
			log.Printf("failed to generate upcoming payments: %v", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)

	if err := json.NewEncoder(w).Encode(payment); err != nil {
		log.Printf("failed to encode created payment response: %v", err)
	}
}

func markPaymentAsPaid(w http.ResponseWriter, r *http.Request, id int) {
	var payment Payment

	err := db.QueryRow(
		r.Context(),
		`
			UPDATE payments
			SET
				status = 'paid',
				paid_at = COALESCE(
					paid_at,
					(NOW() AT TIME ZONE 'America/Sao_Paulo')::date
				)
			WHERE id = $1
			RETURNING
				id,
				description,
				amount,
				due_date::text,
				category,
				responsible,
				status,
				COALESCE(paid_at::text, ''),
				frequency
		`,
		id,
	).Scan(
		&payment.ID,
		&payment.Description,
		&payment.Amount,
		&payment.DueDate,
		&payment.Category,
		&payment.Responsible,
		&payment.Status,
		&payment.PaidAt,
		&payment.Frequency,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Payment not found", http.StatusNotFound)
			return
		}

		log.Printf("failed to mark payment as paid: %v", err)
		http.Error(w, "Failed to mark payment as paid", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

func paymentByIDHandler(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/payments/")
	isMarkingAsPaid := strings.HasSuffix(path, "/pay")

	if isMarkingAsPaid {
		path = strings.TrimSuffix(path, "/pay")
	}

	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid payment ID", http.StatusBadRequest)
		return
	}

	if isMarkingAsPaid {
		if r.Method != http.MethodPatch {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		markPaymentAsPaid(w, r, id)
		return
	}

	switch r.Method {
	case http.MethodGet:
		getPaymentByID(w, id)
	case http.MethodPut:
		updatePayment(w, r, id)
	case http.MethodDelete:
		deletePayment(w, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getPaymentByID(w http.ResponseWriter, id int) {
	var payment Payment

	err := db.QueryRow(
		context.Background(),
		`
			SELECT
				id,
				description,
				amount,
				due_date::text,
				category,
				responsible,
				status,
				COALESCE(paid_at::text, ''),
				frequency
			FROM payments
			WHERE id = $1
		`,
		id,
	).Scan(
		&payment.ID,
		&payment.Description,
		&payment.Amount,
		&payment.DueDate,
		&payment.Category,
		&payment.Responsible,
		&payment.Status,
		&payment.PaidAt,
		&payment.Frequency,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Payment not found", http.StatusNotFound)
			return
		}

		log.Printf("failed to get payment: %v", err)
		http.Error(w, "Failed to get payment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(payment)
}

func updatePayment(w http.ResponseWriter, r *http.Request, id int) {
	var updatedPayment Payment

	err := json.NewDecoder(r.Body).Decode(&updatedPayment)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if updatedPayment.Description == "" {
		http.Error(w, "Description is required", http.StatusBadRequest)
		return
	}

	if updatedPayment.Amount <= 0 {
		http.Error(w, "Amount must be greater than zero", http.StatusBadRequest)
		return
	}

	if updatedPayment.DueDate == "" {
		http.Error(w, "Due date is required", http.StatusBadRequest)
		return
	}

	if !isValidPaymentFrequency(updatedPayment.Frequency) {
		http.Error(w, "Invalid payment frequency", http.StatusBadRequest)
		return
	}

	err = db.QueryRow(
		context.Background(),
		`
			UPDATE payments
			SET
				description = $1,
				amount = $2,
				due_date = $3,
				category = $4,
				responsible = $5,
				status = $6,
				paid_at = CASE
					WHEN $6 = 'paid'
						THEN COALESCE(
							NULLIF($7, '')::date,
							paid_at,
							(NOW() AT TIME ZONE 'America/Sao_Paulo')::date
						)
					ELSE NULL
					END,
				frequency = $8
			WHERE id = $9
			RETURNING id
		`,
		updatedPayment.Description,
		updatedPayment.Amount,
		updatedPayment.DueDate,
		updatedPayment.Category,
		updatedPayment.Responsible,
		updatedPayment.Status,
		updatedPayment.PaidAt,
		updatedPayment.Frequency,
		id,
	).Scan(&updatedPayment.ID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Payment not found", http.StatusNotFound)
			return
		}

		log.Printf("failed to update payment: %v", err)
		http.Error(w, "Failed to update payment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedPayment)
}

func deletePayment(w http.ResponseWriter, id int) {
	commandTag, err := db.Exec(
		context.Background(),
		`
			DELETE FROM payments
			WHERE id = $1
		`,
		id,
	)

	if err != nil {
		log.Printf("failed to delete payment: %v", err)
		http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
		return
	}

	if commandTag.RowsAffected() == 0 {
		http.Error(w, "Payment not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
