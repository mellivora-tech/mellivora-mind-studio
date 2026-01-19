package config

import (
	"os"
	"strconv"
)

// Config holds gateway configuration
type Config struct {
	// Server settings
	Port int    `json:"port"`
	Env  string `json:"env"` // dev, test, prod

	// Service endpoints (gRPC)
	Services ServiceEndpoints `json:"services"`

	// Redis settings
	Redis RedisConfig `json:"redis"`

	// NATS settings
	NATS NATSConfig `json:"nats"`

	// Auth settings
	Auth AuthConfig `json:"auth"`

	// Rate limiting
	RateLimit RateLimitConfig `json:"rate_limit"`
}

// ServiceEndpoints holds gRPC service addresses
type ServiceEndpoints struct {
	Account  string `json:"account"`
	Order    string `json:"order"`
	Position string `json:"position"`
	Trade    string `json:"trade"`
	Data     string `json:"data"`
	Schedule string `json:"schedule"`
	Config   string `json:"config"`
	Alert    string `json:"alert"`
	Risk     string `json:"risk"`
	Signal   string `json:"signal"`
	Optimize string `json:"optimize"`
}

// RedisConfig holds Redis connection settings
type RedisConfig struct {
	Addr     string `json:"addr"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

// NATSConfig holds NATS connection settings
type NATSConfig struct {
	URL string `json:"url"`
}

// AuthConfig holds authentication settings
type AuthConfig struct {
	JWTSecret     string `json:"jwt_secret"`
	TokenExpiry   int    `json:"token_expiry"` // seconds
	RefreshExpiry int    `json:"refresh_expiry"`
}

// RateLimitConfig holds rate limiting settings
type RateLimitConfig struct {
	Enabled         bool `json:"enabled"`
	RequestsPerSec  int  `json:"requests_per_sec"`
	BurstSize       int  `json:"burst_size"`
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Port: getEnvInt("GATEWAY_PORT", 8080),
		Env:  getEnv("GATEWAY_ENV", "dev"),

		Services: ServiceEndpoints{
			Account:  getEnv("SERVICE_ACCOUNT", "localhost:9001"),
			Order:    getEnv("SERVICE_ORDER", "localhost:9002"),
			Position: getEnv("SERVICE_POSITION", "localhost:9003"),
			Trade:    getEnv("SERVICE_TRADE", "localhost:9004"),
			Data:     getEnv("SERVICE_DATA", "localhost:9005"),
			Schedule: getEnv("SERVICE_SCHEDULE", "localhost:9006"),
			Config:   getEnv("SERVICE_CONFIG", "localhost:9007"),
			Alert:    getEnv("SERVICE_ALERT", "localhost:9008"),
			Risk:     getEnv("SERVICE_RISK", "localhost:9101"),
			Signal:   getEnv("SERVICE_SIGNAL", "localhost:9102"),
			Optimize: getEnv("SERVICE_OPTIMIZE", "localhost:9103"),
		},

		Redis: RedisConfig{
			Addr:     getEnv("REDIS_ADDR", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvInt("REDIS_DB", 0),
		},

		NATS: NATSConfig{
			URL: getEnv("NATS_URL", "nats://localhost:4222"),
		},

		Auth: AuthConfig{
			JWTSecret:     getEnv("JWT_SECRET", "dev-secret-change-in-production"),
			TokenExpiry:   getEnvInt("JWT_TOKEN_EXPIRY", 3600),
			RefreshExpiry: getEnvInt("JWT_REFRESH_EXPIRY", 86400),
		},

		RateLimit: RateLimitConfig{
			Enabled:        getEnvBool("RATE_LIMIT_ENABLED", true),
			RequestsPerSec: getEnvInt("RATE_LIMIT_RPS", 100),
			BurstSize:      getEnvInt("RATE_LIMIT_BURST", 200),
		},
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return defaultValue
}
