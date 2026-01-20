package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
)

// ScheduleRepository handles schedule database operations
type ScheduleRepository struct{}

// NewScheduleRepository creates a new ScheduleRepository
func NewScheduleRepository() *ScheduleRepository {
	return &ScheduleRepository{}
}

// List returns paginated schedules
func (r *ScheduleRepository) List(ctx context.Context, enabled *bool, page, pageSize int) ([]model.Schedule, int, error) {
	query := `
		SELECT id, name, description, cron_expr, timezone, enabled, dag, last_run_at, next_run_at, created_at, updated_at
		FROM etl_schedules
		WHERE ($1::boolean IS NULL OR enabled = $1)
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	countQuery := `
		SELECT COUNT(*) FROM etl_schedules
		WHERE ($1::boolean IS NULL OR enabled = $1)
	`

	offset := (page - 1) * pageSize

	rows, err := DB.Query(ctx, query, enabled, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var schedules []model.Schedule
	for rows.Next() {
		var s model.Schedule
		err := rows.Scan(
			&s.ID, &s.Name, &s.Description, &s.CronExpr, &s.Timezone,
			&s.Enabled, &s.DAG, &s.LastRunAt, &s.NextRunAt,
			&s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		schedules = append(schedules, s)
	}

	var total int
	err = DB.QueryRow(ctx, countQuery, enabled).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return schedules, total, nil
}

// GetByID returns a schedule by ID
func (r *ScheduleRepository) GetByID(ctx context.Context, id string) (*model.Schedule, error) {
	query := `
		SELECT id, name, description, cron_expr, timezone, enabled, dag, last_run_at, next_run_at, created_at, updated_at
		FROM etl_schedules
		WHERE id = $1
	`

	var s model.Schedule
	err := DB.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.Name, &s.Description, &s.CronExpr, &s.Timezone,
		&s.Enabled, &s.DAG, &s.LastRunAt, &s.NextRunAt,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &s, nil
}

// Create creates a new schedule
func (r *ScheduleRepository) Create(ctx context.Context, s *model.Schedule) (*model.Schedule, error) {
	query := `
		INSERT INTO etl_schedules (name, description, cron_expr, timezone, enabled, dag)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, description, cron_expr, timezone, enabled, dag, last_run_at, next_run_at, created_at, updated_at
	`

	var result model.Schedule
	err := DB.QueryRow(ctx, query,
		s.Name, s.Description, s.CronExpr, s.Timezone, s.Enabled, s.DAG,
	).Scan(
		&result.ID, &result.Name, &result.Description, &result.CronExpr, &result.Timezone,
		&result.Enabled, &result.DAG, &result.LastRunAt, &result.NextRunAt,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Update updates a schedule
func (r *ScheduleRepository) Update(ctx context.Context, id string, s *model.Schedule) (*model.Schedule, error) {
	query := `
		UPDATE etl_schedules
		SET name = $2, description = $3, cron_expr = $4, timezone = $5, enabled = $6, dag = $7
		WHERE id = $1
		RETURNING id, name, description, cron_expr, timezone, enabled, dag, last_run_at, next_run_at, created_at, updated_at
	`

	var result model.Schedule
	err := DB.QueryRow(ctx, query,
		id, s.Name, s.Description, s.CronExpr, s.Timezone, s.Enabled, s.DAG,
	).Scan(
		&result.ID, &result.Name, &result.Description, &result.CronExpr, &result.Timezone,
		&result.Enabled, &result.DAG, &result.LastRunAt, &result.NextRunAt,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Delete deletes a schedule
func (r *ScheduleRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM etl_schedules WHERE id = $1`
	_, err := DB.Exec(ctx, query, id)
	return err
}

// SetEnabled enables or disables a schedule
func (r *ScheduleRepository) SetEnabled(ctx context.Context, id string, enabled bool) (*model.Schedule, error) {
	query := `
		UPDATE etl_schedules SET enabled = $2
		WHERE id = $1
		RETURNING id, name, description, cron_expr, timezone, enabled, dag, last_run_at, next_run_at, created_at, updated_at
	`

	var result model.Schedule
	err := DB.QueryRow(ctx, query, id, enabled).Scan(
		&result.ID, &result.Name, &result.Description, &result.CronExpr, &result.Timezone,
		&result.Enabled, &result.DAG, &result.LastRunAt, &result.NextRunAt,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}
