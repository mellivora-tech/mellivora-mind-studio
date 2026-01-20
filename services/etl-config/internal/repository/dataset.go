package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
)

// DataSetRepository handles dataset database operations
type DataSetRepository struct{}

// NewDataSetRepository creates a new DataSetRepository
func NewDataSetRepository() *DataSetRepository {
	return &DataSetRepository{}
}

// List returns paginated datasets
func (r *DataSetRepository) List(ctx context.Context, category, storage string, page, pageSize int) ([]model.DataSet, int, error) {
	query := `
		SELECT id, name, version, category, description, schema, storage, indexes, labels, status, created_at, updated_at
		FROM etl_datasets
		WHERE ($1 = '' OR category = $1)
		  AND ($2 = '' OR storage->>'type' = $2)
		ORDER BY category, name
		LIMIT $3 OFFSET $4
	`

	countQuery := `
		SELECT COUNT(*) FROM etl_datasets
		WHERE ($1 = '' OR category = $1)
		  AND ($2 = '' OR storage->>'type' = $2)
	`

	offset := (page - 1) * pageSize

	rows, err := DB.Query(ctx, query, category, storage, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var datasets []model.DataSet
	for rows.Next() {
		var ds model.DataSet
		err := rows.Scan(
			&ds.ID, &ds.Name, &ds.Version, &ds.Category, &ds.Description,
			&ds.Schema, &ds.Storage, &ds.Indexes, &ds.Labels, &ds.Status,
			&ds.CreatedAt, &ds.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		datasets = append(datasets, ds)
	}

	var total int
	err = DB.QueryRow(ctx, countQuery, category, storage).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return datasets, total, nil
}

// GetByID returns a dataset by ID
func (r *DataSetRepository) GetByID(ctx context.Context, id string) (*model.DataSet, error) {
	query := `
		SELECT id, name, version, category, description, schema, storage, indexes, labels, status, created_at, updated_at
		FROM etl_datasets
		WHERE id = $1
	`

	var ds model.DataSet
	err := DB.QueryRow(ctx, query, id).Scan(
		&ds.ID, &ds.Name, &ds.Version, &ds.Category, &ds.Description,
		&ds.Schema, &ds.Storage, &ds.Indexes, &ds.Labels, &ds.Status,
		&ds.CreatedAt, &ds.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &ds, nil
}

// Create creates a new dataset
func (r *DataSetRepository) Create(ctx context.Context, ds *model.DataSet) (*model.DataSet, error) {
	query := `
		INSERT INTO etl_datasets (name, category, description, schema, storage, indexes, labels)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, version, category, description, schema, storage, indexes, labels, status, created_at, updated_at
	`

	schemaJSON, _ := json.Marshal(ds.Schema)
	storageJSON, _ := json.Marshal(ds.Storage)
	indexesJSON := ds.Indexes
	if indexesJSON == nil {
		indexesJSON = json.RawMessage(`[]`)
	}
	labelsJSON := ds.Labels
	if labelsJSON == nil {
		labelsJSON = json.RawMessage(`{}`)
	}

	var result model.DataSet
	err := DB.QueryRow(ctx, query,
		ds.Name, ds.Category, ds.Description, schemaJSON, storageJSON, indexesJSON, labelsJSON,
	).Scan(
		&result.ID, &result.Name, &result.Version, &result.Category, &result.Description,
		&result.Schema, &result.Storage, &result.Indexes, &result.Labels, &result.Status,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Update updates a dataset
func (r *DataSetRepository) Update(ctx context.Context, id string, ds *model.DataSet) (*model.DataSet, error) {
	query := `
		UPDATE etl_datasets
		SET category = $2, description = $3, schema = $4, storage = $5, indexes = $6, labels = $7
		WHERE id = $1
		RETURNING id, name, version, category, description, schema, storage, indexes, labels, status, created_at, updated_at
	`

	var result model.DataSet
	err := DB.QueryRow(ctx, query,
		id, ds.Category, ds.Description, ds.Schema, ds.Storage, ds.Indexes, ds.Labels,
	).Scan(
		&result.ID, &result.Name, &result.Version, &result.Category, &result.Description,
		&result.Schema, &result.Storage, &result.Indexes, &result.Labels, &result.Status,
		&result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &result, nil
}

// Delete deletes a dataset
func (r *DataSetRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM etl_datasets WHERE id = $1`
	_, err := DB.Exec(ctx, query, id)
	return err
}

// GetCategories returns all unique categories
func (r *DataSetRepository) GetCategories(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT category FROM etl_datasets ORDER BY category`
	rows, err := DB.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err != nil {
			return nil, err
		}
		categories = append(categories, cat)
	}
	return categories, nil
}
