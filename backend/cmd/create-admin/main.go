package main

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL não foi definida")
	}

	scanner := bufio.NewScanner(os.Stdin)

	fmt.Print("E-mail do admin: ")
	if !scanner.Scan() {
		log.Fatal("não foi possível ler o e-mail")
	}
	email := strings.TrimSpace(scanner.Text())

	fmt.Print("Senha do admin: ")
	if !scanner.Scan() {
		log.Fatal("não foi possível ler a senha")
	}
	password := strings.TrimSpace(scanner.Text())

	if email == "" || password == "" {
		log.Fatal("e-mail e senha são obrigatórios")
	}

	passwordHash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		log.Fatal(err)
	}

	pool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	_, err = pool.Exec(
		context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, $2)`,
		email,
		string(passwordHash),
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Usuário admin criado.")
}
