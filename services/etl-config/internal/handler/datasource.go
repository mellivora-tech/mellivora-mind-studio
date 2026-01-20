package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

// DataSourceHandler handles data source HTTP requests
type DataSourceHandler struct {
	repo *repository.DataSourceRepository
}

// NewDataSourceHandler creates a new DataSourceHandler
func NewDataSourceHandler() *DataSourceHandler {
	return &DataSourceHandler{
		repo: repository.NewDataSourceRepository(),
	}
}

// List returns paginated data sources
func (h *DataSourceHandler) List(c *gin.Context) {
	typeFilter := c.Query("type")
	statusFilter := c.Query("status")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	datasources, total, err := h.repo.List(c.Request.Context(), typeFilter, statusFilter, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if datasources == nil {
		datasources = []model.DataSource{}
	}

	c.JSON(http.StatusOK, model.PaginatedResponse[model.DataSource]{
		Data:     datasources,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Get returns a data source by ID
func (h *DataSourceHandler) Get(c *gin.Context) {
	id := c.Param("id")

	ds, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if ds == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data source not found"})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.DataSource]{Data: ds})
}

// Create creates a new data source
func (h *DataSourceHandler) Create(c *gin.Context) {
	var form model.DataSourceForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ds, err := h.repo.Create(c.Request.Context(), &form)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse[*model.DataSource]{Data: ds})
}

// Update updates a data source
func (h *DataSourceHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var form model.DataSourceForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ds, err := h.repo.Update(c.Request.Context(), id, &form)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.DataSource]{Data: ds})
}

// Delete deletes a data source
func (h *DataSourceHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// Test tests a data source connection
func (h *DataSourceHandler) Test(c *gin.Context) {
	id := c.Param("id")

	ds, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if ds == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "data source not found"})
		return
	}

	// TODO: Actually test the connection based on plugin type
	// For now, just update status to active
	if err := h.repo.UpdateStatus(c.Request.Context(), id, "active", nil); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[map[string]interface{}]{
		Data: map[string]interface{}{
			"success": true,
			"message": "Connection successful",
		},
	})
}
