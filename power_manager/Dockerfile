FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN rm -f go.sum && go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /grid-controller ./cmd/grid/main.go

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /grid-controller /grid-controller
EXPOSE 8080
CMD ["/grid-controller"]
