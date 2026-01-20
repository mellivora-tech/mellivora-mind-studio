package model

import (
	"encoding/json"
	"time"
)

// DataSource represents an ETL data source
type DataSource struct {
	ID           string          `json:"id" db:"id"`
	Name         string          `json:"name" db:"name"`
	Type         string          `json:"type" db:"type"`
	Plugin       string          `json:"plugin" db:"plugin"`
	Description  *string         `json:"description,omitempty" db:"description"`
	Config       json.RawMessage `json:"config" db:"config"`
	Capabilities []string        `json:"capabilities" db:"capabilities"`
	Status       string          `json:"status" db:"status"`
	LastSyncAt   *time.Time      `json:"lastSyncAt,omitempty" db:"last_sync_at"`
	ErrorMessage *string         `json:"errorMessage,omitempty" db:"error_message"`
	CreatedAt    time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time       `json:"updatedAt" db:"updated_at"`
}

// DataSourceForm is the form for creating/updating a data source
type DataSourceForm struct {
	Name         string          `json:"name" binding:"required"`
	Type         string          `json:"type" binding:"required,oneof=api database file message_queue"`
	Plugin       string          `json:"plugin" binding:"required"`
	Description  *string         `json:"description"`
	Config       json.RawMessage `json:"config"`
	Capabilities []string        `json:"capabilities"`
}

// DataSet represents an ETL dataset schema definition
type DataSet struct {
	ID          string          `json:"id" db:"id"`
	Name        string          `json:"name" db:"name"`
	Version     int             `json:"version" db:"version"`
	Category    string          `json:"category" db:"category"`
	Description *string         `json:"description,omitempty" db:"description"`
	Schema      json.RawMessage `json:"schema" db:"schema"`
	Storage     json.RawMessage `json:"storage" db:"storage"`
	Indexes     json.RawMessage `json:"indexes" db:"indexes"`
	Labels      json.RawMessage `json:"labels" db:"labels"`
	Status      string          `json:"status" db:"status"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

// Pipeline represents an ETL pipeline
type Pipeline struct {
	ID          string          `json:"id" db:"id"`
	Name        string          `json:"name" db:"name"`
	Version     int             `json:"version" db:"version"`
	Description *string         `json:"description,omitempty" db:"description"`
	Trigger     json.RawMessage `json:"trigger" db:"trigger"`
	Parameters  json.RawMessage `json:"parameters" db:"parameters"`
	Steps       json.RawMessage `json:"steps" db:"steps"`
	Status      string          `json:"status" db:"status"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

// Schedule represents a DAG-based schedule
type Schedule struct {
	ID          string          `json:"id" db:"id"`
	Name        string          `json:"name" db:"name"`
	Description *string         `json:"description,omitempty" db:"description"`
	CronExpr    string          `json:"cronExpr" db:"cron_expr"`
	Timezone    string          `json:"timezone" db:"timezone"`
	Enabled     bool            `json:"enabled" db:"enabled"`
	DAG         json.RawMessage `json:"dag" db:"dag"`
	LastRunAt   *time.Time      `json:"lastRunAt,omitempty" db:"last_run_at"`
	NextRunAt   *time.Time      `json:"nextRunAt,omitempty" db:"next_run_at"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

// Execution represents an ETL execution
type Execution struct {
	ID           string          `json:"id" db:"id"`
	ScheduleID   *string         `json:"scheduleId,omitempty" db:"schedule_id"`
	ScheduleName *string         `json:"scheduleName,omitempty" db:"schedule_name"`
	PipelineID   *string         `json:"pipelineId,omitempty" db:"pipeline_id"`
	PipelineName *string         `json:"pipelineName,omitempty" db:"pipeline_name"`
	Status       string          `json:"status" db:"status"`
	Trigger      string          `json:"trigger" db:"trigger"`
	Params       json.RawMessage `json:"params,omitempty" db:"params"`
	StartedAt    *time.Time      `json:"startedAt,omitempty" db:"started_at"`
	FinishedAt   *time.Time      `json:"finishedAt,omitempty" db:"finished_at"`
	Duration     *int64          `json:"duration,omitempty" db:"duration"`
	ErrorMessage *string         `json:"errorMessage,omitempty" db:"error_message"`
	Tasks        []TaskExecution `json:"tasks"`
	CreatedAt    time.Time       `json:"createdAt" db:"created_at"`
}

// TaskExecution represents a task within an execution
type TaskExecution struct {
	ID         string     `json:"id" db:"id"`
	NodeID     string     `json:"nodeId" db:"node_id"`
	NodeName   string     `json:"nodeName" db:"node_name"`
	Status     string     `json:"status" db:"status"`
	StartedAt  *time.Time `json:"startedAt,omitempty" db:"started_at"`
	FinishedAt *time.Time `json:"finishedAt,omitempty" db:"finished_at"`
	InputRows  *int64     `json:"inputRows,omitempty" db:"input_rows"`
	OutputRows *int64     `json:"outputRows,omitempty" db:"output_rows"`
	ErrorCount *int       `json:"errorCount,omitempty" db:"error_count"`
	Error      *string    `json:"error,omitempty" db:"error"`
}

// Plugin represents an ETL plugin
type Plugin struct {
	ID           string          `json:"id" db:"id"`
	Name         string          `json:"name" db:"name"`
	Type         string          `json:"type" db:"type"`
	DisplayName  string          `json:"displayName" db:"display_name"`
	Description  *string         `json:"description,omitempty" db:"description"`
	Version      string          `json:"version" db:"version"`
	ConfigSchema json.RawMessage `json:"configSchema" db:"config_schema"`
	Capabilities []string        `json:"capabilities" db:"capabilities"`
	Enabled      bool            `json:"enabled" db:"enabled"`
}

// PaginatedResponse is a generic paginated response
type PaginatedResponse[T any] struct {
	Data     []T `json:"data"`
	Total    int `json:"total"`
	Page     int `json:"page"`
	PageSize int `json:"pageSize"`
}

// APIResponse is a generic API response
type APIResponse[T any] struct {
	Data    T      `json:"data"`
	Message string `json:"message,omitempty"`
}
