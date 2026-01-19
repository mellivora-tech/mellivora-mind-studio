package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

const (
	serviceName = "account"
	defaultPort = 9001
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		fmt.Printf("failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Get port from environment
	port := defaultPort
	if p := os.Getenv("SERVICE_PORT"); p != "" {
		fmt.Sscanf(p, "%d", &port)
	}

	// Create listener
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", port))
	if err != nil {
		logger.Fatal("failed to listen", zap.Error(err))
	}

	// Create gRPC server
	server := grpc.NewServer()

	// TODO: Register AccountService
	// accountpb.RegisterAccountServiceServer(server, accountService)

	// Enable reflection for debugging
	reflection.Register(server)

	// Start server in goroutine
	go func() {
		logger.Info("starting gRPC server",
			zap.String("service", serviceName),
			zap.Int("port", port),
		)
		if err := server.Serve(lis); err != nil {
			logger.Fatal("failed to serve", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")
	server.GracefulStop()
	logger.Info("server stopped")
}
