PKG_MGR ?= pnpm
API_DIR := apps/api
WEB_DIR := apps/web
INFRA_DIR := infra

.PHONY: install
install:
	$(PKG_MGR) install

.PHONY: build
build:
	$(PKG_MGR) -C $(API_DIR) build || true
	$(PKG_MGR) -C $(WEB_DIR) build || true

.PHONY: lint
lint:
	$(PKG_MGR) -C $(API_DIR) lint || true
	$(PKG_MGR) -C $(WEB_DIR) lint || true

.PHONY: typecheck
typecheck:
	$(PKG_MGR) -C $(API_DIR) tsc --noEmit || true
	$(PKG_MGR) -C $(WEB_DIR) tsc --noEmit || true

.PHONY: dev
dev:
	$(PKG_MGR) -C $(API_DIR) dev & \
	$(PKG_MGR) -C $(WEB_DIR) dev

.PHONY: test
test:
	$(PKG_MGR) -C $(API_DIR) test

.PHONY: migrate
migrate:
	cd $(API_DIR) && $(PKG_MGR) prisma migrate deploy

.PHONY: seed
seed:
	cd $(API_DIR) && $(PKG_MGR) tsx prisma/seed.ts

.PHONY: up
up:
	cd $(INFRA_DIR) && docker compose up -d

.PHONY: down
down:
	cd $(INFRA_DIR) && docker compose down

.PHONY: auth-smoke
auth-smoke:
	cd $(INFRA_DIR) && docker compose exec -T web node scripts/docker-auth-smoke.mjs

.PHONY: swagger
swagger:
	$(PKG_MGR) -C $(API_DIR) run gen:openapi

.PHONY: docs
docs: swagger

.PHONY: ci
ci: install lint typecheck test build
