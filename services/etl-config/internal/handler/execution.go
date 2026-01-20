package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

// ExecutionHandler handles execution HTTP requests
type ExecutionHandler struct {
	repo *repository.ExecutionRepository
}

// NewExecutionHandler creates a new ExecutionHandler
func NewExecutionHandler() *ExecutionHandler {
	return &ExecutionHandler{
		repo: repository.NewExecutionRepository(),
	}
}

// List returns paginated executions
func (h *ExecutionHandler) List(c *gin.Context) {
	scheduleID := c.Query("scheduleId")
	pipelineID := c.Query("pipelineId")
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	executions, total, err := h.repo.List(c.Request.Context(), scheduleID, pipelineID, status, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if executions == nil {
		executions = []model.Execution{}
	}

	c.JSON(http.StatusOK, model.PaginatedResponse[model.Execution]{
		Data:     executions,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Get returns an execution by ID
func (h *ExecutionHandler) Get(c *gin.Context) {
	id := c.Param("id")

	e, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if e == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "execution not found"})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Execution]{Data: e})
}

// GetLogs returns logs for an execution
func (h *ExecutionHandler) GetLogs(c *gin.Context) {
	id := c.Param("id")
	taskID := c.Query("taskId")
	level := c.Query("level")

	logs, err := h.repo.GetLogs(c.Request.Context(), id, taskID, level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if logs == nil {
		logs = []string{}
	}

	c.JSON(http.StatusOK, model.APIResponse[[]string]{Data: logs})
}
