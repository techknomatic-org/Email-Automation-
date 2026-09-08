.DEFAULT_GOAL := help
.PHONY: help logs test docker-test stop build up install setup run admin

help:
	@perl -nle'print $& if m{^[a-zA-Z_-]+:.*?## .*$$}' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

install: ## install all Python dependencies (local dev)
	pip install uv 2>/dev/null || true
	uv pip install -r requirements/local.txt

setup: install ## install deps + migrate + bootstrap CRM
	python manage.py migrate --no-input
	python manage.py setup_crm

run: ## run the daemon
	python manage.py rundaemon

test: ## run the test suite
	pytest tests/test_campaign_sequence_timer.py tests/test_sequence_api.py

admin: ## start the Django Admin web server
	@echo ""
	@echo "  FastAPI / OpenOutreach API: http://localhost:8000"
	@echo ""
	uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Docker targets
logs: ## follow the logs of the service
	docker compose -f docker-compose.yml logs -f

docker-test: ## run tests
	pytest tests/test_campaign_sequence_timer.py tests/test_sequence_api.py

stop: ## stop all services defined in Docker Compose
	docker compose -f docker-compose.yml stop

build: ## build all services defined in Docker Compose
	docker compose -f docker-compose.yml build

up: ## run the defined service in Docker Compose
	docker compose -f docker-compose.yml up --build -d
	docker compose -f docker-compose.yml logs -f
