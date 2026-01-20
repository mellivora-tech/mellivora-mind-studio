package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
)

// ExecutionRepository handles execution database operations
type ExecutionRepository struct{}

// NewExecutionRepository creates a new ExecutionRepository
func NewExecutionRepository() *ExecutionRepository {
	return &ExecutionRepository{}
}

// List returns paginated executions
func (r *ExecutionRepository) List(ctx context.Context, scheduleID, pipelineID, status string, page, pageSize int) ([]model.Execution, int, error) {
	query := `
		SELECT id, schedule_id, schedule_name, pipeline_id, pipeline_name, status, trigger, params,
		       started_at, finished_at, duration, error_message, created_at
		FROM etl_executions
		WHERE ($1 = '' OR schedule_id::text = $1)
		  AND ($2 = '' OR pipeline_id::text = $2)
		  AND ($3 = '' OR status = $3::execution_status)
		ORDER BY created_at DESC
		LIMIT $4 OFFSET $5
	`

	countQuery := `
		SELECT COUNT(*) FROM etl_executions
		WHERE ($1 = '' OR schedule_id::text = $1)
		  AND ($2 = '' OR pipeline_id::text = $2)
		  AND ($3 = '' OR status = $3::execution_status)
	`

	offset := (page - 1) * pageSize

	rows, err := DB.Query(ctx, query, scheduleID, pipelineID, status, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var executions []model.Execution
	for rows.Next() {
		var e model.Execution
		err := rows.Scan(
			&e.ID, &e.ScheduleID, &e.ScheduleName, &e.PipelineID, &e.PipelineName,
			&e.Status, &e.Trigger, &e.Params,
			&e.StartedAt, &e.FinishedAt, &e.Duration, &e.ErrorMessage, &e.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		// Load tasks for this execution
		tasks, err := r.GetTasks(ctx, e.ID)
		if err != nil {
			return nil, 0, err
		}
		e.Tasks = tasks

		executions = append(executions, e)
	}

	var total int
	err = DB.QueryRow(ctx, countQuery, scheduleID, pipelineID, status).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return executions, total, nil
}

// GetByID returns an execution by ID
func (r *ExecutionRepository) GetByID(ctx context.Context, id string) (*model.Execution, error) {
	query := `
		SELECT id, schedule_id, schedule_name, pipeline_id, pipeline_name, status, trigger, params,
		       started_at, finished_at, duration, error_message, created_at
		FROM etl_executions
		WHERE id = $1
	`

	var e model.Execution
	err := DB.QueryRow(ctx, query, id).Scan(
		&e.ID, &e.ScheduleID, &e.ScheduleName, &e.PipelineID, &e.PipelineName,
		&e.Status, &e.Trigger, &e.Params,
		&e.StartedAt, &e.FinishedAt, &e.Duration, &e.ErrorMessage, &e.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Load tasks
	tasks, err := r.GetTasks(ctx, e.ID)
	if err != nil {
		return nil, err
	}
	e.Tasks = tasks

	return &e, nil
}

// GetTasks returns tasks for an execution
func (r *ExecutionRepository) GetTasks(ctx context.Context, executionID string) ([]model.TaskExecution, error) {
	query := `
		SELECT id, node_id, node_name, status, started_at, finished_at, input_rows, output_rows, error_count, error
		FROM etl_execution_tasks
		WHERE execution_id = $1
		ORDER BY created_at
	`

	rows, err := DB.Query(ctx, query, executionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []model.TaskExecution
	for rows.Next() {
		var t model.TaskExecution
		err := rows.Scan(
			&t.ID, &t.NodeID, &t.NodeName, &t.Status,
			&t.StartedAt, &t.FinishedAt, &t.InputRows, &t.OutputRows, &t.ErrorCount, &t.Error,
		)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, t)
	}

	return tasks, nil
}

// GetLogs returns logs for an execution
func (r *ExecutionRepository) GetLogs(ctx context.Context, executionID string, taskID, level string) ([]string, error) {
	query := `
		SELECT message FROM etl_execution_logs
		WHERE execution_id = $1
		  AND ($2 = '' OR task_id::text = $2)
		  AND ($3 = '' OR level = $3)
		ORDER BY created_at
		LIMIT 1000
	`

	rows, err := DB.Query(ctx, query, executionID, taskID, level)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []string
	for rows.Next() {
		var msg string
		if err := rows.Scan(&msg); err != nil {
			return nil, err
		}
		logs = append(logs, msg)
	}

	return logs, nil
}
