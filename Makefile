.PHONY: up down build logs shell-backend shell-db migrate migration test

# ── Docker ────────────────────────────────────────────────────────────────────

up:
	docker compose up -d

up-build:
	docker compose up --build -d

down:
	docker compose down

down-clean:
	docker compose down -v

build:
	docker compose build

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-worker:
	docker compose logs -f celery-worker

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	docker compose exec backend alembic upgrade head

migration:
	@read -p "Migration message: " msg; \
	docker compose exec backend alembic revision --autogenerate -m "$$msg"

db-history:
	docker compose exec backend alembic history

# ── Shells ────────────────────────────────────────────────────────────────────

shell-backend:
	docker compose exec backend sh

shell-db:
	docker compose exec db psql -U price_user -d price_monitor

# ── Status ────────────────────────────────────────────────────────────────────

ps:
	docker compose ps

health:
	curl -s http://localhost:8020/health | python3 -m json.tool

# ── Local dev (without Docker) ────────────────────────────────────────────────

dev-frontend:
	cd frontend && npm run dev

dev-install-frontend:
	cd frontend && npm install
