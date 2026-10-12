package main

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func connectDatabase() {
	databaseURL := "postgres://postgres:postgres@localhost:5432/casona54_app"
	var err error

	db, err = pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}

	err = db.Ping(context.Background())
	if err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}

	log.Println("Connected to the database successfully")
}
