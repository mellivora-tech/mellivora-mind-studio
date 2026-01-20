package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/model"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

// PluginHandler handles plugin HTTP requests
type PluginHandler struct {
	repo *repository.PluginRepository
}

// NewPluginHandler creates a new PluginHandler
func NewPluginHandler() *PluginHandler {
	return &PluginHandler{
		repo: repository.NewPluginRepository(),
	}
}

// List returns plugins filtered by type
func (h *PluginHandler) List(c *gin.Context) {
	pluginType := c.Query("type")

	plugins, err := h.repo.List(c.Request.Context(), pluginType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if plugins == nil {
		plugins = []model.Plugin{}
	}

	c.JSON(http.StatusOK, model.APIResponse[[]model.Plugin]{Data: plugins})
}
