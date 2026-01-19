FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o service ./cmd/order

FROM alpine:3.19
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai
COPY --from=builder /app/service .
EXPOSE 9002
CMD ["./service"]
