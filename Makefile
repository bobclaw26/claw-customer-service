.PHONY: help install dev start stop logs clean setup build deploy docker-build docker-push test

help:
	@echo "🦁 Claw Customer Service - Make Commands"
	@echo "========================================"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup           - Run interactive setup wizard"
	@echo "  make install         - Install dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev             - Start development servers"
	@echo "  make start           - Start Docker containers"
	@echo "  make stop            - Stop Docker containers"
	@echo "  make logs            - View container logs"
	@echo "  make restart         - Restart containers"
	@echo ""
	@echo "Deployment:"
	@echo "  make build           - Build React frontend"
	@echo "  make docker-build    - Build Docker image"
	@echo "  make docker-push     - Push to Docker Hub"
	@echo "  make deploy          - Deploy to production"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean           - Clean up temp files"
	@echo "  make reset-db        - Reset database"
	@echo "  make backup          - Backup database"
	@echo ""

setup:
	@bash setup.sh

install:
	npm install
	cd client && npm install

dev:
	@echo "Starting development servers..."
	@echo "Backend: npm start"
	@echo "Frontend: cd client && npm start"
	@npm start &
	@cd client && npm start

start:
	docker-compose up -d
	@echo "✅ Containers started"
	@echo "Frontend: http://localhost:3000"
	@echo "API: http://localhost:5000"

stop:
	docker-compose down
	@echo "✅ Containers stopped"

restart:
	docker-compose restart
	@echo "✅ Containers restarted"

logs:
	docker-compose logs -f

logs-app:
	docker-compose logs -f app

logs-ollama:
	docker-compose logs -f ollama

build:
	cd client && npm run build
	@echo "✅ Frontend built"

docker-build:
	docker build -t claw-customer-service:latest .
	@echo "✅ Docker image built"

docker-push:
	docker tag claw-customer-service:latest yourrepo/claw-customer-service:latest
	docker push yourrepo/claw-customer-service:latest
	@echo "✅ Pushed to Docker Hub"

deploy:
	@echo "🚀 Deploying to production..."
	@echo "Make sure to:"
	@echo "  1. Update .env with production values"
	@echo "  2. Set up SSL/TLS certificate"
	@echo "  3. Configure domain DNS"
	@echo "  4. Run docker-compose up -d"
	@echo ""
	docker-compose up -d
	@echo "✅ Deployment complete"

clean:
	rm -rf node_modules
	rm -rf client/node_modules
	rm -rf client/build
	rm -rf .env.local
	@echo "✅ Cleaned up"

reset-db:
	@read -p "⚠️  This will delete all data! Continue? (y/n) " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -f data/claw.db; \
		echo "✅ Database reset"; \
	else \
		echo "Cancelled"; \
	fi

backup:
	@mkdir -p backups
	@cp data/claw.db backups/claw-`date +%Y%m%d-%H%M%S`.db
	@echo "✅ Database backed up"

test:
	npm test

lint:
	npx eslint server/ client/src/

format:
	npx prettier --write "server/**/*.js" "client/src/**/*.js"

.DEFAULT_GOAL := help
