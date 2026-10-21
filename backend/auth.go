package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var loginRequest LoginRequest

	if !decodeJSONRequest(w, r, &loginRequest, "invalid request payload") {
		return
	}

	if loginRequest.Email == "" || loginRequest.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	var userID int
	var passwordHash string

	err := db.QueryRow(
		r.Context(),
		`
			SELECT id, password_hash
			FROM users
			WHERE email = $1
		`,
		loginRequest.Email,
	).Scan(&userID, &passwordHash)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}

		log.Printf("failed to query user: %v", err)
		http.Error(w, "failed to login", http.StatusInternalServerError)
		return
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(passwordHash),
		[]byte(loginRequest.Password),
	)

	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := generateSessionToken()
	if err != nil {
		log.Printf("failed to generate session token: %v", err)
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	expiresAt := time.Now().Add(24 * time.Hour)

	_, err = db.Exec(
		r.Context(),
		`
			INSERT INTO sessions (
				user_id,
				token,
				expires_at
			)
			VALUES ($1, $2, $3)
		`,
		userID,
		token,
		expiresAt,
	)

	if err != nil {
		log.Printf("failed to save session: %v", err)
		http.Error(w, "failed to create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: http.SameSiteLaxMode,
		Expires:  expiresAt,
	})

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]string{
		"message": "login successful",
	})
}

func generateSessionToken() (string, error) {
	bytes := make([]byte, 32)

	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(bytes), nil
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_token")
	if err == nil {
		_, _ = db.Exec(
			r.Context(),
			`
				DELETE FROM sessions
				WHERE token = $1
			`,
			cookie.Value,
		)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   os.Getenv("APP_ENV") == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	w.WriteHeader(http.StatusNoContent)
}

func authenticateHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")

	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var user struct {
		ID    int    `json:"id"`
		Email string `json:"email"`
	}

	err = db.QueryRow(
		r.Context(),
		`
			SELECT u.id, u.email
			FROM users u
			JOIN sessions s ON u.id = s.user_id
			WHERE s.token = $1
			AND s.expires_at > NOW()
		`,
		cookie.Value,
	).Scan(&user.ID, &user.Email)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		http.Error(w, "failed to authenticate", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cookie, err := r.Cookie("session_token")
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var userID int
	var passwordHash string

	err = db.QueryRow(
		r.Context(),
		`
			SELECT u.id, u.password_hash
			FROM users u
			JOIN sessions s ON u.id = s.user_id
			WHERE s.token = $1
			AND s.expires_at > NOW()
		`,
		cookie.Value,
	).Scan(&userID, &passwordHash)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		http.Error(w, "failed to change password", http.StatusInternalServerError)
		return
	}

	var request ChangePasswordRequest

	if !decodeJSONRequest(w, r, &request, "invalid request payload") {
		return
	}

	if request.NewPassword == "" {
		http.Error(w, "New password is required", http.StatusBadRequest)
		return
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(passwordHash),
		[]byte(request.CurrentPassword),
	)

	if err != nil {
		http.Error(w, "current password is incorrect", http.StatusUnauthorized)
		return
	}

	newPasswordHash, err := bcrypt.GenerateFromPassword(
		[]byte(request.NewPassword),
		bcrypt.DefaultCost,
	)

	if err != nil {
		http.Error(w, "failed to hash new password", http.StatusInternalServerError)
		return
	}

	_, err = db.Exec(
		r.Context(),
		`
			UPDATE users
			SET password_hash = $1
			WHERE id = $2
		`,
		string(newPasswordHash),
		userID,
	)

	if err != nil {
		http.Error(w, "failed to update password", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
