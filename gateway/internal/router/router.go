package router

import (
	"github.com/gin-gonic/gin"
	"github.com/mellivora-mind/mellivora-mind-studio/gateway/internal/handler"
	"github.com/mellivora-mind/mellivora-mind-studio/gateway/internal/middleware"
	"go.uber.org/zap"
)

// New creates and configures the Gin router
func New(h *handler.Handler, mw *middleware.Middleware, logger *zap.Logger) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()

	// Global middleware
	r.Use(mw.RequestID())
	r.Use(mw.Logger())
	r.Use(mw.Recovery())
	r.Use(mw.CORS())
	r.Use(mw.RateLimit())

	// Health endpoints (no auth required)
	r.GET("/health", h.HealthCheck)
	r.GET("/ready", h.ReadyCheck)

	// API v1
	v1 := r.Group("/api/v1")
	{
		// Public endpoints (no auth)
		public := v1.Group("")
		{
			// Data endpoints (some may be public)
			data := public.Group("/data")
			{
				data.GET("/quotes/:code", h.GetQuote)
				data.GET("/ohlcv/:code", h.GetOHLCV)
			}
		}

		// Protected endpoints (auth required)
		protected := v1.Group("")
		protected.Use(mw.Auth())
		{
			// Account endpoints
			accounts := protected.Group("/accounts")
			{
				accounts.GET("", h.ListAccounts)
				accounts.GET("/:id", h.GetAccount)
				accounts.POST("", h.CreateAccount)
			}

			// Position endpoints
			positions := protected.Group("/positions")
			{
				positions.GET("", h.ListPositions)
			}

			// Portfolio endpoints
			portfolios := protected.Group("/portfolios")
			{
				portfolios.GET("/:account_id/target", h.GetTargetPortfolio)
				portfolios.POST("/:account_id/target", h.SetTargetPortfolio)
				portfolios.GET("/:account_id/trades", h.GetTradeList)
			}

			// Order endpoints
			orders := protected.Group("/orders")
			{
				orders.GET("", h.ListOrders)
				orders.GET("/:id", h.GetOrder)
				orders.POST("", h.CreateOrder)
				orders.POST("/:id/submit", h.SubmitOrder)
				orders.POST("/:id/cancel", h.CancelOrder)
			}

			// Deal endpoints
			deals := protected.Group("/deals")
			{
				deals.GET("", h.ListDeals)
			}

			// Risk endpoints
			risk := protected.Group("/risk")
			{
				risk.GET("/portfolio/:account_id", h.GetPortfolioRisk)
				risk.GET("/decomposition/:account_id", h.GetRiskDecomposition)
			}

			// Signal endpoints
			signals := protected.Group("/signals")
			{
				signals.GET("/timing", h.GetTimingSignal)
				signals.GET("/alpha", h.GetAlphaSignal)
			}
		}
	}

	return r
}
