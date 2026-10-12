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
				status
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

	var payments []Payment

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

	err := json.NewDecoder(r.Body).Decode(&payment)
	if err != nil {
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

	err = db.QueryRow(
		context.Background(),
		`
			INSERT INTO payments (
				description,
				amount,
				due_date,
				category,
				responsible,
				status
			)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`,
		payment.Description,
		payment.Amount,
		payment.DueDate,
		payment.Category,
		payment.Responsible,
		payment.Status,
	).Scan(&payment.ID)

	if err != nil {
		log.Printf("failted to create payment: %v", err)
		http.Error(w, "Failed to create payment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(payment)
}

func paymentByIDHandler(w http.ResponseWriter, r *http.Request) {
	idString := strings.TrimPrefix(r.URL.Path, "/payments/")

	id, err := strconv.Atoi(idString)
	if err != nil {
		http.Error(w, "Invalid payment ID", http.StatusBadRequest)
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
				status
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
				status = $6
			WHERE id = $7
			RETURNING id
		`,
		updatedPayment.Description,
		updatedPayment.Amount,
		updatedPayment.DueDate,
		updatedPayment.Category,
		updatedPayment.Responsible,
		updatedPayment.Status,
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
