package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
)

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")

		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var userID int
		var expiresAt time.Time

		err = db.QueryRow(
			r.Context(),
			`
				SELECT user_id, expires_at
				FROM sessions
				WHERE token = $1
			`,
			cookie.Value,
		).Scan(&userID, &expiresAt)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			http.Error(w, "failed to validate session", http.StatusInternalServerError)
			return
		}

		if time.Now().After(expiresAt) {
			http.Error(w, "session expired", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}