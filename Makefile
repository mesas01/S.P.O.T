# ─── SPOT Contract Testing Makefile ───────────────────────────────────
#
# Runs inside the scaffold container:
#   docker compose -f docker-compose.dev.yml run --rm scaffold sh
#   make setup-account
#   make deploy
#   make test-flow
#
# State is persisted in the stellar_config Docker volume.
#
# ─── Configuration ────────────────────────────────────────────────────

NETWORK          ?= testnet
WASM_PATH        = target/wasm32v1-none/release/poap.wasm
STELLAR_DIR      = /root/.config/stellar
CONTRACT_ID_FILE = $(STELLAR_DIR)/contract-id
SOURCE_ACCOUNT   = spot-test-deployer

# Read contract ID from file (empty if not yet deployed)
CONTRACT_ID = $(shell cat $(CONTRACT_ID_FILE) 2>/dev/null)

# Default event parameters (override on command line)
EVENT_NAME   ?= Test Event
EVENT_DATE   ?= 1798761600
LOCATION     ?= Buenos Aires
DESCRIPTION  ?= A test event for SPOT
MAX_POAPS    ?= 100
CLAIM_START  ?= 1735689600
CLAIM_END    ?= 1830297600
METADATA_URI ?= https://example.com/metadata.json
IMAGE_URL    ?= https://example.com/image.png

# ─── Default ──────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

.PHONY: help build test-unit setup-account deploy \
        create-event approve-creator claim \
        event-count get-event minted-count has-claimed get-all-events admin \
        test-flow clean

# ─── Help ─────────────────────────────────────────────────────────────

help: ## Show available targets
	@echo ""
	@echo "  SPOT Contract Testing"
	@echo "  ====================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── Build & Test ─────────────────────────────────────────────────────

build: ## Compile WASM contracts
	cargo build --target wasm32v1-none --release

test-unit: ## Run Rust unit tests
	cargo test

# ─── Account Setup ────────────────────────────────────────────────────

setup-account: ## Generate and fund a testnet account
	stellar keys generate $(SOURCE_ACCOUNT) --network $(NETWORK) --fund
	@echo ""
	@echo "Account created. Address:"
	@stellar keys address $(SOURCE_ACCOUNT)

# ─── Deploy ───────────────────────────────────────────────────────────

deploy: build ## Build and deploy contract to testnet
	@echo "Deploying poap contract to $(NETWORK)..."
	@ADMIN=$$(stellar keys address $(SOURCE_ACCOUNT)) && \
		stellar contract deploy \
			--wasm $(WASM_PATH) \
			--source $(SOURCE_ACCOUNT) \
			--network $(NETWORK) \
			-- \
			--admin $$ADMIN | tr -d '[:space:]' > $(CONTRACT_ID_FILE)
	@echo "Contract deployed: $$(cat $(CONTRACT_ID_FILE))"

# ─── Guards ───────────────────────────────────────────────────────────

_require-contract:
	@if [ ! -f $(CONTRACT_ID_FILE) ]; then \
		echo "Error: $(CONTRACT_ID_FILE) not found. Run 'make deploy' first."; \
		exit 1; \
	fi

_require-event-id:
	@if [ -z "$(EVENT_ID)" ]; then \
		echo "Error: EVENT_ID required. Usage: make <target> EVENT_ID=1"; \
		exit 1; \
	fi

# ─── Queries ──────────────────────────────────────────────────────────

event-count: _require-contract ## Get total event count
	@stellar contract invoke \
		--id $(CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- \
		event_count

get-event: _require-contract _require-event-id ## Get event details (EVENT_ID=n)
	@stellar contract invoke \
		--id $(CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- \
		get_event \
		--event_id $(EVENT_ID)

get-all-events: _require-contract ## List all event IDs
	@stellar contract invoke \
		--id $(CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- \
		get_all_events

minted-count: _require-contract _require-event-id ## Minted count for event (EVENT_ID=n)
	@stellar contract invoke \
		--id $(CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- \
		minted_count \
		--event_id $(EVENT_ID)

has-claimed: _require-contract _require-event-id ## Check if address claimed (EVENT_ID=n ADDRESS=G...)
	@if [ -z "$(ADDRESS)" ]; then \
		echo "Error: ADDRESS required. Usage: make has-claimed EVENT_ID=1 ADDRESS=G..."; \
		exit 1; \
	fi
	@stellar contract invoke \
		--id $(CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- \
		has_claimed \
		--event_id $(EVENT_ID) \
		--address $(ADDRESS)

admin: _require-contract ## Show contract admin address
	@stellar contract invoke \
		--id $(CONTRACT_ID) \
		--source $(SOURCE_ACCOUNT) \
		--network $(NETWORK) \
		-- \
		admin

# ─── Mutations ────────────────────────────────────────────────────────

approve-creator: _require-contract ## Approve a creator (CREATOR=G...)
	@if [ -z "$(CREATOR)" ]; then \
		echo "Error: CREATOR required. Usage: make approve-creator CREATOR=G..."; \
		exit 1; \
	fi
	@OPERATOR=$$(stellar keys address $(SOURCE_ACCOUNT)) && \
		stellar contract invoke \
			--id $(CONTRACT_ID) \
			--source $(SOURCE_ACCOUNT) \
			--network $(NETWORK) \
			-- \
			approve_creator \
			--operator $$OPERATOR \
			--creator $(CREATOR) \
			--payment_reference "manual-approval"

create-event: _require-contract ## Create event (EVENT_NAME, MAX_POAPS, etc.)
	@CREATOR=$$(stellar keys address $(SOURCE_ACCOUNT)) && \
		stellar contract invoke \
			--id $(CONTRACT_ID) \
			--source $(SOURCE_ACCOUNT) \
			--network $(NETWORK) \
			-- \
			create_event \
			--creator $$CREATOR \
			--event_name "$(EVENT_NAME)" \
			--event_date $(EVENT_DATE) \
			--location "$(LOCATION)" \
			--description "$(DESCRIPTION)" \
			--max_poaps $(MAX_POAPS) \
			--claim_start $(CLAIM_START) \
			--claim_end $(CLAIM_END) \
			--metadata_uri "$(METADATA_URI)" \
			--image_url "$(IMAGE_URL)"

claim: _require-contract _require-event-id ## Claim a POAP (EVENT_ID=n, CLAIMER=G... optional)
	@TO="$(CLAIMER)"; \
		if [ -z "$$TO" ]; then TO=$$(stellar keys address $(SOURCE_ACCOUNT)); fi; \
		stellar contract invoke \
			--id $(CONTRACT_ID) \
			--source $(SOURCE_ACCOUNT) \
			--network $(NETWORK) \
			-- \
			claim \
			--event_id $(EVENT_ID) \
			--to $$TO

# ─── Integration Test ────────────────────────────────────────────────

test-flow: ## Full test: deploy → approve → create → claim → verify
	@echo "═══════════════════════════════════════════"
	@echo "  SPOT Integration Test"
	@echo "═══════════════════════════════════════════"
	@echo ""
	@echo "[1/7] Building contracts..."
	@$(MAKE) build
	@echo ""
	@echo "[2/7] Deploying contract..."
	@$(MAKE) deploy
	@echo ""
	@echo "[3/7] Approving creator..."
	@CREATOR=$$(stellar keys address $(SOURCE_ACCOUNT)) && \
		$(MAKE) approve-creator CREATOR=$$CREATOR
	@echo ""
	@echo "[4/7] Creating test event..."
	@$(MAKE) create-event
	@echo ""
	@echo "[5/7] Claiming POAP (event 0)..."
	@$(MAKE) claim EVENT_ID=1
	@echo ""
	@echo "[6/7] Verifying event count..."
	@$(MAKE) event-count
	@echo ""
	@echo "[7/7] Verifying claim..."
	@ADDR=$$(stellar keys address $(SOURCE_ACCOUNT)) && \
		$(MAKE) has-claimed EVENT_ID=1 ADDRESS=$$ADDR
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "  Integration test complete!"
	@echo "═══════════════════════════════════════════"

# ─── Cleanup ──────────────────────────────────────────────────────────

clean: ## Remove .contract-id and build artifacts
	rm -f $(CONTRACT_ID_FILE)
	@echo "Cleaned."
