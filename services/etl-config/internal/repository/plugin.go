package repository

import (
	"context"

	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
)

// PluginRepository handles plugin database operations
type PluginRepository struct{}

// NewPluginRepository creates a new PluginRepository
func NewPluginRepository() *PluginRepository {
	return &PluginRepository{}
}

// List returns plugins filtered by type
func (r *PluginRepository) List(ctx context.Context, pluginType string) ([]model.Plugin, error) {
	query := `
		SELECT id, name, type, display_name, description, version, config_schema, capabilities, enabled
		FROM etl_plugins
		WHERE ($1 = '' OR type = $1::plugin_type)
		  AND enabled = true
		ORDER BY type, display_name
	`

	rows, err := DB.Query(ctx, query, pluginType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plugins []model.Plugin
	for rows.Next() {
		var p model.Plugin
		err := rows.Scan(
			&p.ID, &p.Name, &p.Type, &p.DisplayName, &p.Description,
			&p.Version, &p.ConfigSchema, &p.Capabilities, &p.Enabled,
		)
		if err != nil {
			return nil, err
		}
		plugins = append(plugins, p)
	}

	return plugins, nil
}

// GetByName returns a plugin by name
func (r *PluginRepository) GetByName(ctx context.Context, name string) (*model.Plugin, error) {
	query := `
		SELECT id, name, type, display_name, description, version, config_schema, capabilities, enabled
		FROM etl_plugins
		WHERE name = $1
	`

	var p model.Plugin
	err := DB.QueryRow(ctx, query, name).Scan(
		&p.ID, &p.Name, &p.Type, &p.DisplayName, &p.Description,
		&p.Version, &p.ConfigSchema, &p.Capabilities, &p.Enabled,
	)
	if err != nil {
		return nil, err
	}

	return &p, nil
}
