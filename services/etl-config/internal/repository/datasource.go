package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
)

// DataSourceRepository handles data source database operations
type DataSourceRepository struct{}

// NewDataSourceRepository creates a new DataSourceRepository
func NewDataSourceRepository() *DataSourceRepository {
	return &DataSourceRepository{}
}

// List returns paginated data sources
func (r *DataSourceRepository) List(ctx context.Context, typeFilter, statusFilter string, page, pageSize int) ([]model.DataSource, int, error) {
	query := `
		SELECT id, name, type, plugin, description, config, capabilities, status, 
		       last_sync_at, error_message, created_at, updated_at
		FROM etl_datasources
		WHERE ($1 = '' OR type = $1::datasource_type)
		  AND ($2 = '' OR status = $2::datasource_status)
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`

	countQuery := `
		SELECT COUNT(*) FROM etl_datasources
		WHERE ($1 = '' OR type = $1::datasource_type)
		  AND ($2 = '' OR status = $2::datasource_status)
	`

	offset := (page - 1) * pageSize

	rows, err := DB.Query(ctx, query, typeFilter, statusFilter, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var datasources []model.DataSource
	for rows.Next() {
		var ds model.DataSource
		err := rows.Scan(
			&ds.ID, &ds.Name, &ds.Type, &ds.Plugin, &ds.Description,
			&ds.Config, &ds.Capabilities, &ds.Status,
			&ds.LastSyncAt, &ds.ErrorMessage, &ds.CreatedAt, &ds.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		datasources = append(datasources, ds)
	}

	var total int
	err = DB.QueryRow(ctx, countQuery, typeFilter, statusFilter).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return datasources, total, nil
}

// GetByID returns a data source by ID
func (r *DataSourceRepository) GetByID(ctx context.Context, id string) (*model.DataSource, error) {
	query := `
		SELECT id, name, type, plugin, description, config, capabilities, status,
		       last_sync_at, error_message, created_at, updated_at
		FROM etl_datasources
		WHERE id = $1
	`

	var ds model.DataSource
	err := DB.QueryRow(ctx, query, id).Scan(
		&ds.ID, &ds.Name, &ds.Type, &ds.Plugin, &ds.Description,
		&ds.Config, &ds.Capabilities, &ds.Status,
		&ds.LastSyncAt, &ds.ErrorMessage, &ds.CreatedAt, &ds.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// Create creates a new data source
func (r *DataSourceRepository) Create(ctx context.Context, form *model.DataSourceForm) (*model.DataSource, error) {
	query := `
		INSERT INTO etl_datasources (name, type, plugin, description, config, capabilities)
		VALUES ($1, $2::datasource_type, $3, $4, $5, $6)
		RETURNING id, name, type, plugin, description, config, capabilities, status,
		          last_sync_at, error_message, created_at, updated_at
	`

	configJSON := form.Config
	if configJSON == nil {
		configJSON = json.RawMessage(`{}`)
	}

	var ds model.DataSource
	err := DB.QueryRow(ctx, query,
		form.Name, form.Type, form.Plugin, form.Description, configJSON, form.Capabilities,
	).Scan(
		&ds.ID, &ds.Name, &ds.Type, &ds.Plugin, &ds.Description,
		&ds.Config, &ds.Capabilities, &ds.Status,
		&ds.LastSyncAt, &ds.ErrorMessage, &ds.CreatedAt, &ds.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// Update updates a data source
func (r *DataSourceRepository) Update(ctx context.Context, id string, form *model.DataSourceForm) (*model.DataSource, error) {
	query := `
		UPDATE etl_datasources
		SET name = $2, type = $3::datasource_type, plugin = $4, description = $5,
		    config = $6, capabilities = $7
		WHERE id = $1
		RETURNING id, name, type, plugin, description, config, capabilities, status,
		          last_sync_at, error_message, created_at, updated_at
	`

	configJSON := form.Config
	if configJSON == nil {
		configJSON = json.RawMessage(`{}`)
	}

	var ds model.DataSource
	err := DB.QueryRow(ctx, query,
		id, form.Name, form.Type, form.Plugin, form.Description, configJSON, form.Capabilities,
	).Scan(
		&ds.ID, &ds.Name, &ds.Type, &ds.Plugin, &ds.Description,
		&ds.Config, &ds.Capabilities, &ds.Status,
		&ds.LastSyncAt, &ds.ErrorMessage, &ds.CreatedAt, &ds.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// Delete deletes a data source
func (r *DataSourceRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM etl_datasources WHERE id = $1`
	_, err := DB.Exec(ctx, query, id)
	return err
}

// UpdateStatus updates the status of a data source
func (r *DataSourceRepository) UpdateStatus(ctx context.Context, id string, status string, errMsg *string) error {
	query := `
		UPDATE etl_datasources
		SET status = $2::datasource_status, error_message = $3, last_sync_at = NOW()
		WHERE id = $1
	`
	_, err := DB.Exec(ctx, query, id, status, errMsg)
	return err
}
