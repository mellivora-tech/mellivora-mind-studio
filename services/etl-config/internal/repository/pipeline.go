package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
)

// PipelineRepository handles pipeline database operations
type PipelineRepository struct{}

// NewPipelineRepository creates a new PipelineRepository
func NewPipelineRepository() *PipelineRepository {
	return &PipelineRepository{}
}

// List returns paginated pipelines
func (r *PipelineRepository) List(ctx context.Context, status string, page, pageSize int) ([]model.Pipeline, int, error) {
	query := `
		SELECT id, name, version, description, trigger, parameters, steps, status, created_at, updated_at
		FROM etl_pipelines
		WHERE ($1 = '' OR status = $1::pipeline_status)
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	countQuery := `
		SELECT COUNT(*) FROM etl_pipelines
		WHERE ($1 = '' OR status = $1::pipeline_status)
	`

	offset := (page - 1) * pageSize

	rows, err := DB.Query(ctx, query, status, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var pipelines []model.Pipeline
	for rows.Next() {
		var p model.Pipeline
		err := rows.Scan(
			&p.ID, &p.Name, &p.Version, &p.Description,
			&p.Trigger, &p.Parameters, &p.Steps, &p.Status,
			&p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		pipelines = append(pipelines, p)
	}

	var total int
	err = DB.QueryRow(ctx, countQuery, status).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return pipelines, total, nil
}

// GetByID returns a pipeline by ID
func (r *PipelineRepository) GetByID(ctx context.Context, id string) (*model.Pipeline, error) {
	query := `
		SELECT id, name, version, description, trigger, parameters, steps, status, created_at, updated_at
		FROM etl_pipelines
		WHERE id = $1
	`

	var p model.Pipeline
	err := DB.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.Name, &p.Version, &p.Description,
		&p.Trigger, &p.Parameters, &p.Steps, &p.Status,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &p, nil
}

// Create creates a new pipeline
func (r *PipelineRepository) Create(ctx context.Context, p *model.Pipeline) (*model.Pipeline, error) {
	query := `
		INSERT INTO etl_pipelines (name, description, trigger, parameters, steps, status)
		VALUES ($1, $2, $3, $4, $5, $6::pipeline_status)
		RETURNING id, name, version, description, trigger, parameters, steps, status, created_at, updated_at
	`

	status := p.Status
	if status == "" {
		status = "draft"
	}

	var result model.Pipeline
	err := DB.QueryRow(ctx, query,
		p.Name, p.Description, p.Trigger, p.Parameters, p.Steps, status,
	).Scan(
		&result.ID, &result.Name, &result.Version, &result.Description,
		&result.Trigger, &result.Parameters, &result.Steps, &result.Status,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Update updates a pipeline
func (r *PipelineRepository) Update(ctx context.Context, id string, p *model.Pipeline) (*model.Pipeline, error) {
	query := `
		UPDATE etl_pipelines
		SET description = $2, trigger = $3, parameters = $4, steps = $5, status = $6::pipeline_status
		WHERE id = $1
		RETURNING id, name, version, description, trigger, parameters, steps, status, created_at, updated_at
	`

	var result model.Pipeline
	err := DB.QueryRow(ctx, query,
		id, p.Description, p.Trigger, p.Parameters, p.Steps, p.Status,
	).Scan(
		&result.ID, &result.Name, &result.Version, &result.Description,
		&result.Trigger, &result.Parameters, &result.Steps, &result.Status,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Delete deletes a pipeline
func (r *PipelineRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM etl_pipelines WHERE id = $1`
	_, err := DB.Exec(ctx, query, id)
	return err
}
