package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

// ScheduleHandler handles schedule HTTP requests
type ScheduleHandler struct {
	repo *repository.ScheduleRepository
}

// NewScheduleHandler creates a new ScheduleHandler
func NewScheduleHandler() *ScheduleHandler {
	return &ScheduleHandler{
		repo: repository.NewScheduleRepository(),
	}
}

// List returns paginated schedules
func (h *ScheduleHandler) List(c *gin.Context) {
	enabledStr := c.Query("enabled")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Parse enabled filter
	var enabled *bool
	if enabledStr != "" {
		b := enabledStr == "true"
		enabled = &b
	}

	schedules, total, err := h.repo.List(c.Request.Context(), enabled, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if schedules == nil {
		schedules = []model.Schedule{}
	}

	c.JSON(http.StatusOK, model.PaginatedResponse[model.Schedule]{
		Data:     schedules,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Get returns a schedule by ID
func (h *ScheduleHandler) Get(c *gin.Context) {
	id := c.Param("id")

	s, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if s == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "schedule not found"})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Schedule]{Data: s})
}

// Create creates a new schedule
func (h *ScheduleHandler) Create(c *gin.Context) {
	var s model.Schedule
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default timezone if not provided
	if s.Timezone == "" {
		s.Timezone = "UTC"
	}

	result, err := h.repo.Create(c.Request.Context(), &s)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse[*model.Schedule]{Data: result})
}

// Update updates a schedule
func (h *ScheduleHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var s model.Schedule
	if err := c.ShouldBindJSON(&s); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.repo.Update(c.Request.Context(), id, &s)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Schedule]{Data: result})
}

// Delete deletes a schedule
func (h *ScheduleHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// Enable enables a schedule
func (h *ScheduleHandler) Enable(c *gin.Context) {
	id := c.Param("id")

	result, err := h.repo.SetEnabled(c.Request.Context(), id, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Schedule]{Data: result})
}

// Disable disables a schedule
func (h *ScheduleHandler) Disable(c *gin.Context) {
	id := c.Param("id")

	result, err := h.repo.SetEnabled(c.Request.Context(), id, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Schedule]{Data: result})
}
