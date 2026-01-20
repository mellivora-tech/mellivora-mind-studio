package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

// PipelineHandler handles pipeline HTTP requests
type PipelineHandler struct {
	repo *repository.PipelineRepository
}

// NewPipelineHandler creates a new PipelineHandler
func NewPipelineHandler() *PipelineHandler {
	return &PipelineHandler{
		repo: repository.NewPipelineRepository(),
	}
}

// List returns paginated pipelines
func (h *PipelineHandler) List(c *gin.Context) {
	status := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	pipelines, total, err := h.repo.List(c.Request.Context(), status, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if pipelines == nil {
		pipelines = []model.Pipeline{}
	}

	c.JSON(http.StatusOK, model.PaginatedResponse[model.Pipeline]{
		Data:     pipelines,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Get returns a pipeline by ID
func (h *PipelineHandler) Get(c *gin.Context) {
	id := c.Param("id")

	p, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if p == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "pipeline not found"})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Pipeline]{Data: p})
}

// Create creates a new pipeline
func (h *PipelineHandler) Create(c *gin.Context) {
	var p model.Pipeline
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.repo.Create(c.Request.Context(), &p)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse[*model.Pipeline]{Data: result})
}

// Update updates a pipeline
func (h *PipelineHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var p model.Pipeline
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.repo.Update(c.Request.Context(), id, &p)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.Pipeline]{Data: result})
}

// Delete deletes a pipeline
func (h *PipelineHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
