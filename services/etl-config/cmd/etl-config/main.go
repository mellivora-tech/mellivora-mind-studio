package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/handler"
	"github.com/mellivora-tech/mellivora-mind-studio/services/etl-config/internal/repository"
)

const (
	serviceName = "etl-config"
	defaultPort = "8080"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		fmt.Printf("failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Initialize database
	logger.Info("connecting to database...")
	if err := repository.InitDB(); err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}
	defer repository.CloseDB()
	logger.Info("database connected successfully")

	// Setup Gin router
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// Initialize handlers
	dsHandler := handler.NewDataSourceHandler()
	pluginHandler := handler.NewPluginHandler()
	datasetHandler := handler.NewDataSetHandler()
	pipelineHandler := handler.NewPipelineHandler()
	scheduleHandler := handler.NewScheduleHandler()
	executionHandler := handler.NewExecutionHandler()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": serviceName})
	})

	// API routes
	api := router.Group("/api")
	{
		// ETL routes
		etl := api.Group("/etl")
		{
			// Plugins
			etl.GET("/plugins", pluginHandler.List)

			// Data Sources
			etl.GET("/datasources", dsHandler.List)
			etl.GET("/datasources/:id", dsHandler.Get)
			etl.POST("/datasources", dsHandler.Create)
			etl.PUT("/datasources/:id", dsHandler.Update)
			etl.DELETE("/datasources/:id", dsHandler.Delete)
			etl.POST("/datasources/:id/test", dsHandler.Test)

			// Datasets
			etl.GET("/datasets", datasetHandler.List)
			etl.GET("/datasets/categories", datasetHandler.GetCategories)
			etl.GET("/datasets/:id", datasetHandler.Get)
			etl.POST("/datasets", datasetHandler.Create)
			etl.PUT("/datasets/:id", datasetHandler.Update)
			etl.DELETE("/datasets/:id", datasetHandler.Delete)

			// Pipelines
			etl.GET("/pipelines", pipelineHandler.List)
			etl.GET("/pipelines/:id", pipelineHandler.Get)
			etl.POST("/pipelines", pipelineHandler.Create)
			etl.PUT("/pipelines/:id", pipelineHandler.Update)
			etl.DELETE("/pipelines/:id", pipelineHandler.Delete)

			// Schedules
			etl.GET("/schedules", scheduleHandler.List)
			etl.GET("/schedules/:id", scheduleHandler.Get)
			etl.POST("/schedules", scheduleHandler.Create)
			etl.PUT("/schedules/:id", scheduleHandler.Update)
			etl.DELETE("/schedules/:id", scheduleHandler.Delete)
			etl.POST("/schedules/:id/enable", scheduleHandler.Enable)
			etl.POST("/schedules/:id/disable", scheduleHandler.Disable)

			// Executions
			etl.GET("/executions", executionHandler.List)
			etl.GET("/executions/:id", executionHandler.Get)
			etl.GET("/executions/:id/logs", executionHandler.GetLogs)
		}
	}

	// Get port
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// Start server in goroutine
	go func() {
		logger.Info("starting HTTP server",
			zap.String("service", serviceName),
			zap.String("port", port),
		)
		if err := router.Run(":" + port); err != nil {
			logger.Fatal("failed to start server", zap.Error(err))
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")
	logger.Info("server stopped")
}

// corsMiddleware adds CORS headers
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
