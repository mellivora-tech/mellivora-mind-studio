package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

// DataSetHandler handles dataset HTTP requests
type DataSetHandler struct {
	repo *repository.DataSetRepository
}

// NewDataSetHandler creates a new DataSetHandler
func NewDataSetHandler() *DataSetHandler {
	return &DataSetHandler{
		repo: repository.NewDataSetRepository(),
	}
}

// List returns paginated datasets
func (h *DataSetHandler) List(c *gin.Context) {
	category := c.Query("category")
	storage := c.Query("storage")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	datasets, total, err := h.repo.List(c.Request.Context(), category, storage, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if datasets == nil {
		datasets = []model.DataSet{}
	}

	c.JSON(http.StatusOK, model.PaginatedResponse[model.DataSet]{
		Data:     datasets,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// Get returns a dataset by ID
func (h *DataSetHandler) Get(c *gin.Context) {
	id := c.Param("id")

	ds, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if ds == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "dataset not found"})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.DataSet]{Data: ds})
}

// Create creates a new dataset
func (h *DataSetHandler) Create(c *gin.Context) {
	var ds model.DataSet
	if err := c.ShouldBindJSON(&ds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.repo.Create(c.Request.Context(), &ds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, model.APIResponse[*model.DataSet]{Data: result})
}

// Update updates a dataset
func (h *DataSetHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var ds model.DataSet
	if err := c.ShouldBindJSON(&ds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.repo.Update(c.Request.Context(), id, &ds)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, model.APIResponse[*model.DataSet]{Data: result})
}

// Delete deletes a dataset
func (h *DataSetHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.repo.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetCategories returns all unique dataset categories
func (h *DataSetHandler) GetCategories(c *gin.Context) {
	categories, err := h.repo.GetCategories(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if categories == nil {
		categories = []string{}
	}

	c.JSON(http.StatusOK, model.APIResponse[[]string]{Data: categories})
}
