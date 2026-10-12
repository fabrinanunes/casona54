package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func main() {
	if err := connectDatabase(); err != nil {
		log.Fatalf("Database startup failed: %v", err)
	}
	defer db.Close()

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/payments", authMiddleware(paymentsHandler))
	http.HandleFunc("/payments/", authMiddleware(paymentByIDHandler))
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/logout", logoutHandler)
	http.HandleFunc("/me", authMiddleware(authenticateHandler))
	http.HandleFunc("/me/password", authMiddleware(changePasswordHandler))

	log.Println("Server is running on port 8080")

	if err := http.ListenAndServe(
		":8080",
		corsMiddleware(http.DefaultServeMux),
	); err != nil {
		log.Printf("Server stopped: %v", err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
	})
}

// http.HandleFunc registra uma rota para o endpoint "/health" e define a função que será chamada quando uma requisição for feita para esse endpoint.

// http.ReponseWrite e é uma interface que permite escrever a resposta HTTP. Ele é usado para enviar dados de volta ao cliente que fez a requisição.

// *http.Request é uma struct que representa uma requisição HTTP recebida pelo servidor. Ele contém informações sobre a requisição, como o método HTTP, cabeçalhos, corpo da requisição, etc.
