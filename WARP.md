# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository overview

This repo defines **SPOT (Stellar Proof of Togetherness)**, a POAP‑style attendance NFT system on Stellar.

There are two main layers:

- **Product & docs (repo root)**: Concept, architecture, pricing, and roadmap under `README.md` and `docs/`.
- **Implementation (blockotitos/)**: A Scaffold Stellar project containing
  - A **Rust Soroban contract workspace** for SPOT and example contracts.
  - A **React/Vite frontend** for interacting with contracts.
  - A small **Express backend** to administrate the legacy `poap` contract.

When doing code changes, you will usually work inside `blockotitos/`.

---

## Common commands

All commands assume the Git repo root as the starting directory unless otherwise noted.

### 1. Initial setup

- Install toolchains (see `README.md` and `blockotitos/README.md` for details):
  - Rust + Cargo with the Soroban WASM target.
  - Node.js (v22+ for the frontend, 18+ for the backend).
  - Stellar CLI and the Scaffold Stellar plugin.

- Frontend / contracts workspace setup:

  ```bash
  cd blockotitos
  cp .env.example .env       # then edit with your network and STELLAR_SCAFFOLD_ENV
  npm install                # installs frontend + workspace tooling
  ```

- Backend (POAP admin) setup:

  ```bash
  cd blockotitos/backend
  npm install
  cp env.example .env        # then fill RPC_URL, NETWORK_PASSPHRASE, ADMIN_SECRET, POAP_CONTRACT_ID
  ```

### 2. Frontend (React/Vite via Scaffold Stellar)

Run the local dev environment (Vite + `stellar scaffold watch`):

```bash
cd blockotitos
npm run dev
```

This runs the `start` script defined in `blockotitos/package.json`, which:

- Watches Soroban contracts and auto‑builds TypeScript clients.
- Starts the Vite dev server for the frontend.

Other useful frontend scripts from `blockotitos/package.json`:

- **Build production frontend bundle** (and TypeScript project):

  ```bash
  cd blockotitos
  npm run build
  ```

- **Lint the frontend / workspace TypeScript**:

  ```bash
  cd blockotitos
  npm run lint
  ```

- **Format code with Prettier** (respecting `lint-staged` rules when used in Git hooks):

  ```bash
  cd blockotitos
  npm run format
  ```

### 3. Soroban contracts (Rust workspace)

The Rust workspace is defined by `blockotitos/Cargo.toml` and includes these relevant packages:

- `spot-factory`: Factory contract that creates and tracks SPOT event contracts.
- `spot-event`: Event‑level SPOT NFT contract.
- `poap`: Global POAP contract used together with the Express backend.
- `fungible-allowlist-example`, `nft-enumerable-example`, `guess-the-number`: reference/example contracts from Scaffold Stellar.

#### Build contracts (all or specific)

- Build **all workspace contracts** for Soroban (WASM target) in release mode:

  ```bash
  cd blockotitos
  cargo build --target wasm32v1-none --release
  ```

- Build **only SPOT contracts** (recommended during active contract work):

  ```bash
  cd blockotitos
  cargo build --target wasm32v1-none --release --package spot-factory
  cargo build --target wasm32v1-none --release --package spot-event
  ```

These commands produce WASM artifacts under `blockotitos/target/` that the Stellar CLI and Scaffold use.

#### Run contract tests

- Run **all tests** in the workspace (contracts and examples):

  ```bash
  cd blockotitos
  cargo test
  ```

- Run tests for a **single contract package**, for example the `poap` contract (explicitly documented in `contracts/poap/README.md`):

  ```bash
  cd blockotitos
  cargo test -p poap
  ```

- Run tests for a **specific SPOT contract** by package name (inferred from each `Cargo.toml`):

  ```bash
  cd blockotitos
  cargo test -p spot-factory
  cargo test -p spot-event
  ```

- Run a **single Rust test** within a package (replace `test_name` with the actual function name):

  ```bash
  cd blockotitos
  cargo test -p spot-event test_name
  ```

### 4. Backend: POAP admin service (Express)

This backend is a reference/utility service for the global `poap` contract, not the main SPOT factory/event pair. It is intentionally small and focused on approve/revoke flows.

- **Run in dev mode** (with Node `--watch`):

  ```bash
  cd blockotitos/backend
  npm run dev
  ```

- **Run in production mode**:

  ```bash
  cd blockotitos/backend
  npm start
  ```

Key endpoints (from `backend/README.md`):

- `GET /health`
- `POST /creators/approve`
- `POST /creators/revoke`

These endpoints call the `poap` contract functions such as `approve_creator` and `revoke_creator_approval` using the admin key configured in `.env`.

---

## High‑level architecture & code structure

This section summarizes the architecture and where to look in the codebase. For detailed diagrams and data models, see `docs/ARCHITECTURE.md`, `docs/PROJECT_STRUCTURE.md`, `docs/TECH_STACK.md`, and `README.md`.

### 1. System layers

The SPOT system is intentionally split into three conceptual layers:

1. **Frontend layer (`blockotitos/src/`)**
   - React/Vite app generated from **Scaffold Stellar**.
   - Talks directly to Soroban contracts via auto‑generated TypeScript clients.
   - Integrates with Freighter or compatible wallets for transaction signing.

2. **Backend layer (future: Firebase Functions; current: `blockotitos/backend/` for POAP)**
   - Long‑term design (in `docs/TECH_STACK.md` and `docs/ARCHITECTURE.md`): Firebase Functions will
     - Manage user plans and SPOT credits.
     - Validate off‑chain concerns (plans, geolocation, QR/link usage, rate limits).
     - Orchestrate asset uploads to Firebase Storage and metadata to Firestore.
   - Present code:
     - `blockotitos/backend/` is a **minimal Express service** that acts as an admin/operator for the legacy `poap` contract, exposing only approval‑related endpoints.

3. **Blockchain layer (`blockotitos/contracts/`)**
   - Soroban smart contracts in Rust.
   - Core SPOT contracts:
     - `spot-factory/`: owns the list of events, deploys and references `spot-event` instances.
     - `spot-event/`: per‑event NFT logic using `stellar-tokens` and `stellar-access`.
   - POAP contract:
     - `poap/`: a global POAP‑style contract that manages multiple events inside one deployment, optimized around a backend that tracks off‑chain payments and writes on‑chain approvals.
   - Example/reference contracts from Scaffold Stellar (`guess-the-number`, `nft-enumerable-example`, `fungible-allowlist-example`) used as implementation and testing references.

The **product README and docs** describe an additional payment/credit system and Firebase backend that are not yet fully reflected in code; they are the target architecture.

### 2. Contracts: responsibilities and relationships

The contracts are organized as a single Rust workspace (`blockotitos/Cargo.toml`) with shared dependency versions and profiles.

#### `spot-factory` (SPOT event factory)

- Location: `blockotitos/contracts/spot-factory/`.
- Role:
  - Maintains global state of all SPOT events.
  - Exposes functions like `__constructor`, `admin`, `set_admin`, `create_event`, `get_event_info`, `get_events`, and `get_event_count` (see `docs/PROJECT_STRUCTURE.md`).
  - Intended to integrate plan/credit validation before deploying events.
- Relationships:
  - Uses Soroban’s deployer API (`deployer().deploy_contract()`) to instantiate `spot-event` contracts.
  - Holds references (IDs/addresses) for all deployed events.
- Implementation notes:
  - Uses `stellar-access` for access control (admin operations).
  - Build/profile configuration is shared through workspace settings.

When modifying `spot-factory`, coordinate behavior with `spot-event` and the future backend logic defined in the docs (plans, credits, and payment flows).

#### `spot-event` (per‑event SPOT NFT contract)

- Location: `blockotitos/contracts/spot-event/`.
- Role:
  - Manages all SPOTs for a **single event**.
  - Exposes functions such as `__constructor`, `mint`, `mint_authorized`, `has_minted`, `get_event_info`, `burn_unclaimed`, and role‑management functions (see `docs/PROJECT_STRUCTURE.md`).
- Core behavior:
  - Enforces **one SPOT per wallet per event**.
  - Checks claim window (`claim_start`, `claim_end`).
  - Enforces max NFTs per event.
  - Uses `stellar-tokens` extensions for enumerability and burning.
  - Uses `stellar-access` for roles (Owner, Admin, Minter; Viewer is implied by the NFT standard).
- Metadata model:
  - Stores **essential** event metadata on‑chain (name, date, location, etc.).
  - Exposes a `token_uri` that points to richer off‑chain metadata (JSON + image), typically stored in Firebase Storage or IPFS, matching the hybrid storage design in `docs/ARCHITECTURE.md` and `docs/TECH_STACK.md`.

When adding new event features (e.g., more metadata fields, multiple collections per event), ensure they line up with the data shapes documented under `docs/ARCHITECTURE.md` and `docs/PROJECT_STRUCTURE.md`.

#### `poap` (global POAP contract)

- Location: `blockotitos/contracts/poap/`.
- Role:
  - Manages multiple POAP events within a **single contract instance**.
  - Designed to work together with an off‑chain backend that tracks payments and approvals.
- Key flows (see `contracts/poap/README.md`):
  - Backend receives a payment off‑chain and generates a `payment_reference`.
  - Backend calls `approve_creator(operator, creator, payment_reference)` on‑chain.
  - Approved creators can call `create_event` directly, paying their own contract fees.
  - Backend can later call `revoke_creator_approval` to remove the role and approval metadata.
  - Attendees claim via `claim(event_id, to)` under event rules (`max_poaps`, claim window, etc.).
- Important invariants:
  - Contract **does not hold funds**; payment is tracked via `payment_reference` in on‑chain metadata.
  - Organizers pay for their own `create_event` transactions.

This contract and the backend under `blockotitos/backend/` form a coherent unit; modify them in tandem.

### 3. Frontend architecture (`blockotitos/src/`)

The frontend is built from Scaffold Stellar’s standard structure (see `blockotitos/README.md`), adapted for SPOT.

Key pieces:

- `src/App.tsx` and `src/main.tsx`:
  - Entrypoint and high‑level app shell.
  - Wire routing, layout, and provider configuration.

- `src/components/` and `src/layout/`:
  - Presentational and container components.
  - Currently include example components such as `GuessTheNumber` and wallet/network widgets.
  - Future SPOT‑specific UI (event creation, claim pages, dashboards) should live here or in feature‑oriented subfolders.

- `src/contracts/` and `packages/` workspace:
  - `packages/` (referenced via `workspaces` in `blockotitos/package.json`) contains **auto‑generated TypeScript clients** for Soroban contracts, generated by `stellar scaffold watch --build-clients`.
  - `src/contracts/util.ts` and related helpers provide contract invocation utilities, serialization helpers, and network configuration glue.
  - When adding or modifying contracts, ensure client generation stays in sync (rebuild or rerun `npm run dev`).

- `src/debug/`:
  - A contract explorer/debugger UI scaffolded by Scaffold Stellar.
  - Components and hooks here (`debug/components`, `debug/hooks`, `debug/util`, etc.) let you introspect contracts, simulate transactions, view XDR and responses, etc.
  - Useful for manual testing of SPOT contracts before integrating flows into production UI.

When implementing SPOT flows in the frontend, follow the pattern:

1. Contract schema → generated client under `packages/`.
2. Thin wrappers in `src/contracts/` for per‑contract operations.
3. React hooks and components that bind contract operations to wallet state and UI.

### 4. Data and business model

The conceptual data model and business logic are defined primarily in the docs and the root `README.md`:

- Entities: `USER`, `CREDIT`, `EVENT`, `COLLECTION`, `SPOT`, `DELEGATE`, `QR_CODE`, `CLAIM_CODE` (see the ER diagram in `docs/ARCHITECTURE.md` and the root `README.md`).
- Plans: FREE, STARTER, PRO, ENTERPRISE with associated limits and pricing (`README.md` and `docs/ROADMAP.md`).
- Credits: NFTs purchased per plan become monthly credits that can be spent across multiple events.

The **current code only implements part of this**:

- On‑chain contracts already enforce many *technical* constraints (limits, one NFT per wallet, roles, claim windows).
- Off‑chain concerns (plans, credits, geolocation, link/QR tracking) are mostly **planned** for Firebase Functions and Firestore, and are described but not fully coded yet.

When extending the system, align any new data shapes, validations, or flows with the existing diagrams and tables in the documentation rather than inventing new models ad‑hoc.

### 5. How to approach changes

When making non‑trivial changes, it is useful to work from the docs downward:

1. **Clarify behavior** in `docs/ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/ROADMAP.md`, and the root `README.md`.
2. **Update or extend on‑chain contracts** (`spot-factory`, `spot-event`, or `poap`) to reflect any new invariants that must be enforced at the blockchain level.
3. **Add/adjust backend endpoints** (currently the Express POAP admin, later Firebase Functions) to handle off‑chain validation and persistence consistent with the docs.
4. **Wire new flows into the frontend**, using generated contract clients and the debug tooling to verify transactions.

Whenever there is a mismatch between the docs and the code, treat the docs as the intended target architecture and document any deliberate deviations in comments or additional markdown under `docs/`.
