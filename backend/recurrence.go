package main

import (
	"context"
	"fmt"
	"log"
	"time"
)

type paymentRecurrenceRule struct {
	ID             int
	Description    string
	Amount         float64
	Frequency      string
	FirstDueDate   time.Time
	NextOccurrence int
	Category       string
	Responsible    string
}

func generateUpcomingPayments(ctx context.Context) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin recurring payment generation: %w", err)
	}
	defer tx.Rollback(context.Background())

	rows, err := tx.Query(
		ctx,
		`
			SELECT
				id,
				description,
				amount,
				frequency,
				first_due_date,
				next_occurrence,
				category,
				responsible
			FROM payment_recurrence_rules
			WHERE is_active = TRUE
			ORDER BY id
			FOR UPDATE SKIP LOCKED
		`,
	)
	if err != nil {
		return fmt.Errorf("fetch recurrence rules: %w", err)
	}

	rules := make([]paymentRecurrenceRule, 0)

	for rows.Next() {
		var rule paymentRecurrenceRule

		if err := rows.Scan(
			&rule.ID,
			&rule.Description,
			&rule.Amount,
			&rule.Frequency,
			&rule.FirstDueDate,
			&rule.NextOccurrence,
			&rule.Category,
			&rule.Responsible,
		); err != nil {
			rows.Close()
			return fmt.Errorf("scan recurrence rule: %w", err)
		}

		rules = append(rules, rule)
	}

	if err := rows.Err(); err != nil {
		rows.Close()
		return fmt.Errorf("read recurrence rules: %w", err)
	}

	rows.Close()

	location, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return fmt.Errorf("load São Paulo timezone: %w", err)
	}

	now := time.Now().In(location)
	today := time.Date(
		now.Year(),
		now.Month(),
		now.Day(),
		0, 0, 0, 0,
		time.UTC,
	)
	horizon := addMonthsKeepingDay(today, 12)

	for i := range rules {
		rule := &rules[i]

		for {
			dueDate, err := recurrenceDate(
				rule.FirstDueDate,
				rule.Frequency,
				rule.NextOccurrence,
			)
			if err != nil {
				return fmt.Errorf(
					"calculate next date for recurrence rule %d: %w",
					rule.ID,
					err,
				)
			}

			if dueDate.After(horizon) {
				break
			}

			_, err = tx.Exec(
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
					VALUES ($1, $2, $3, $4, $5, 'pending', NULL, $6, $7)
					ON CONFLICT (recurrence_rule_id, due_date)
					WHERE recurrence_rule_id IS NOT NULL
					DO NOTHING
				`,
				rule.Description,
				rule.Amount,
				dueDate,
				rule.Category,
				rule.Responsible,
				rule.Frequency,
				rule.ID,
			)
			if err != nil {
				return fmt.Errorf(
					"create payment for recurrence rule %d: %w",
					rule.ID,
					err,
				)
			}

			rule.NextOccurrence++
		}

		_, err = tx.Exec(
			ctx,
			`
				UPDATE payment_recurrence_rules
				SET next_occurrence = $1
				WHERE id = $2
			`,
			rule.NextOccurrence,
			rule.ID,
		)
		if err != nil {
			return fmt.Errorf(
				"advance recurrence rule %d: %w",
				rule.ID,
				err,
			)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit recurring payment generation: %w", err)
	}

	return nil
}

func recurrenceDate(firstDueDate time.Time, frequency string, occurrence int) (time.Time, error) {
	if occurrence < 1 {
		return time.Time{}, fmt.Errorf("occurrence must be at least 1")
	}

	start := time.Date(
		firstDueDate.Year(),
		firstDueDate.Month(),
		firstDueDate.Day(),
		0, 0, 0, 0,
		time.UTC,
	)

	switch frequency {
	case "weekly":
		return start.AddDate(0, 0, 7*occurrence), nil
	case "monthly":
		return addMonthsKeepingDay(start, occurrence), nil
	case "yearly":
		return addMonthsKeepingDay(start, 12*occurrence), nil
	default:
		return time.Time{}, fmt.Errorf("invalid frequency: %s", frequency)
	}
}

func addMonthsKeepingDay(start time.Time, months int) time.Time {
	targetMonth := time.Date(
		start.Year(),
		start.Month()+time.Month(months),
		1,
		0, 0, 0, 0,
		time.UTC,
	)

	lastDayOfTargetMonth := time.Date(
		targetMonth.Year(),
		targetMonth.Month()+1,
		0,
		0, 0, 0, 0,
		time.UTC,
	).Day()

	day := start.Day()
	if day > lastDayOfTargetMonth {
		day = lastDayOfTargetMonth
	}

	return time.Date(
		targetMonth.Year(),
		targetMonth.Month(),
		day,
		0, 0, 0, 0,
		time.UTC,
	)
}

func startRecurringPaymentScheduler(ctx context.Context) {
    go func() {
        run := func() {
            if err := generateUpcomingPayments(ctx); err != nil && ctx.Err() == nil {
                log.Printf("failed to generate recurring payments: %v", err)
            }
        }

        run()

        ticker := time.NewTicker(24 * time.Hour)
        defer ticker.Stop()

        for {
            select {
            case <-ctx.Done():
                return
            case <-ticker.C:
                run()
            }
        }
    }()
}
