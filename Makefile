.PHONY: build up down logs test clean

# Boot the entire simulated base
up:
	docker-compose up --build -d

# Shut down all services
down:
	docker-compose down

# Rebuild all images
build:
	docker-compose build

# View logs
logs:
	docker-compose logs -f

# Run Go unit tests (load shedding logic)
test:
	cd power_manager && go test ./internal/load_shedding/ -v

# Run all tests
test-all: test

# Clean up Docker resources
clean:
	docker-compose down -v --rmi local
	docker system prune -f
