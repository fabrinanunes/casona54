package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type Payment struct {
	ID             int     `json:"id"`
	Description    string  `json:"description"`
	Amount         float64 `json:"amount"`
	DueDate        string  `json:"due_date"`
	Category       string  `json:"category"`
	Responsible    string  `json:"responsible"`
	Status         string  `json:"status"`
	PaidAt         string  `json:"paid_at"`
	Frequency      string  `json:"frequency"`
	DurationMonths int     `json:"duration_months,omitempty"`
	IsRecurring    bool    `json:"is_recurring"`
}

func isValidPaymentFrequency(frequency string) bool {
	switch frequency {
	case "once", "weekly", "monthly", "yearly":
		return true
	default:
		return false
	}
}

func isValidPaymentResponsible(responsible string) bool {
	switch responsible {
	case "Fabrina", "Eduardo":
		return true
	default:
		return false
	}
}

func validatePayment(payment *Payment) error {
	payment.Description = strings.TrimSpace(payment.Description)
	payment.Category = strings.TrimSpace(payment.Category)
	payment.Responsible = strings.TrimSpace(payment.Responsible)
	payment.Status = strings.TrimSpace(payment.Status)
	payment.Frequency = strings.TrimSpace(payment.Frequency)
	payment.DueDate = strings.TrimSpace(payment.DueDate)
	payment.PaidAt = strings.TrimSpace(payment.PaidAt)

	if payment.Description == "" {
		return errors.New("Description is required")
	}
	if payment.Category == "" {
		return errors.New("Category is required")
	}
	if payment.Responsible == "" {
		return errors.New("Responsible is required")
	}
	if !isValidPaymentResponsible(payment.Responsible) {
		return errors.New("Invalid payment responsible")
	}
	if payment.Amount <= 0 {
		return errors.New("Amount must be greater than zero")
	}
	if !isValidPaymentFrequency(payment.Frequency) {
		return errors.New("Invalid payment frequency")
	}

	if _, err := time.Parse("2006-01-02", payment.DueDate); err != nil {
		return errors.New("Due date must be a valid date in YYYY-MM-DD format")
	}

	switch payment.Status {
	case "pending":
		if payment.PaidAt != "" {
			return errors.New("Paid date must be empty for pending payments")
		}
	case "paid":
		if _, err := time.Parse("2006-01-02", payment.PaidAt); err != nil {
			return errors.New("Paid date is required and must use YYYY-MM-DD format")
		}
	default:
		return errors.New("Invalid payment status")
	}

	return nil
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
		r.Context(),
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
				frequency,
				recurrence_rule_id IS NOT NULL
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
			&payment.IsRecurring,
		)

		if err != nil {
			log.Printf("failed to scan payment row: %v", err)
			http.Error(w, "Failed to get payments", http.StatusInternalServerError)
			return
		}

		payments = append(payments, payment)
	}

	if err := rows.Err(); err != nil {
		log.Printf("failed to iterate payments: %v", err)
		http.Error(w, "Failed to get payments", http.StatusInternalServerError)
		return
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

	if err := validatePayment(&payment); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if payment.Frequency != "once" && payment.DurationMonths < 1 {
		http.Error(w, "Duration must be at least 1 month", http.StatusBadRequest)
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
					responsible,
					duration_months
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				RETURNING id
			`,
			payment.Description,
			payment.Amount,
			payment.Frequency,
			payment.DueDate,
			payment.Category,
			payment.Responsible,
			payment.DurationMonths,
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
		payment.IsRecurring = true
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
		getPaymentByID(w, r, id)
	case http.MethodPut:
		updatePayment(w, r, id)
	case http.MethodDelete:
		deletePayment(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func getPaymentByID(w http.ResponseWriter, r *http.Request, id int) {
	var payment Payment

	err := db.QueryRow(
		r.Context(),
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

	if err := validatePayment(&updatedPayment); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = db.QueryRow(
		r.Context(),
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

func deletePayment(w http.ResponseWriter, r *http.Request, id int) {
	ctx := r.Context()
	tx, err := db.Begin(ctx)
	if err != nil {
		log.Printf("failed to begin payment deletion transaction: %v", err)
		http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	var recurrenceRuleID pgtype.Int4
	err = tx.QueryRow(
		ctx,
		`
			SELECT recurrence_rule_id
			FROM payments
			WHERE id = $1
			FOR UPDATE
		`,
		id,
	).Scan(&recurrenceRuleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Payment not found", http.StatusNotFound)
			return
		}

		log.Printf("failed to find payment for deletion: %v", err)
		http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
		return
	}

	if recurrenceRuleID.Valid {
		// The generator locks the same rule row before inserting occurrences.
		// Waiting for that lock ensures the deletion also catches any payments
		// the generator was already creating.
		var lockedRuleID int32
		err = tx.QueryRow(
			ctx,
			`SELECT id FROM payment_recurrence_rules WHERE id = $1 FOR UPDATE`,
			recurrenceRuleID.Int32,
		).Scan(&lockedRuleID)
		if err != nil {
			log.Printf("failed to lock recurrence rule for deletion: %v", err)
			http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
			return
		}

		// Occurrences are inserted in sequence order, so their payment IDs keep
		// that order even when a user edits an occurrence's due date.
		_, err = tx.Exec(
			ctx,
			`
				DELETE FROM payments
				WHERE recurrence_rule_id = $1
				  AND id >= $2
			`,
			recurrenceRuleID.Int32,
			id,
		)
		if err == nil {
			_, err = tx.Exec(
				ctx,
				`UPDATE payment_recurrence_rules SET is_active = FALSE WHERE id = $1`,
				recurrenceRuleID.Int32,
			)
		}
	} else {
		_, err = tx.Exec(
			ctx,
			`DELETE FROM payments WHERE id = $1`,
			id,
		)
	}

	if err != nil {
		log.Printf("failed to delete payment or stop recurrence: %v", err)
		http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("failed to commit payment deletion: %v", err)
		http.Error(w, "Failed to delete payment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
