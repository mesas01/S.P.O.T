# SPOT — Technical Architecture

## System Overview

```mermaid
graph TB
    subgraph User["User"]
        Browser["Browser"]
        Freighter["Freighter Wallet"]
    end

    subgraph Frontend["Frontend — React 19 + TypeScript + Vite"]
        Pages["Pages"]
        WalletCtx["Wallet Provider"]
        TanStack["TanStack Query"]
        BackendAPI["Backend API Client"]
    end

    subgraph Backend["Backend — Node.js + Express"]
        Server["Express Server"]
        SorobanSvc["Soroban Service"]
        DBSvc["DB Service (Prisma)"]
        StorageSvc["Storage Service"]
        TierSvc["Tier Manager"]
    end

    subgraph Blockchain["Stellar / Soroban Testnet"]
        RPC["Soroban RPC"]
        Contract["POAP Contract"]
    end

    subgraph Storage["Storage Layer"]
        Postgres["PostgreSQL"]
        MinIO["MinIO (S3)"]
    end

    Browser --> Pages
    Browser <--> Freighter
    Pages --> WalletCtx
    Pages --> TanStack
    TanStack --> BackendAPI
    BackendAPI -->|REST API| Server

    WalletCtx <-->|Sign Transactions| Freighter

    Server --> SorobanSvc
    Server --> DBSvc
    Server --> StorageSvc
    Server --> TierSvc

    SorobanSvc -->|Invoke / Simulate| RPC
    RPC <--> Contract

    DBSvc -->|Read / Write| Postgres
    StorageSvc -->|Upload / Delete| MinIO
```

## Frontend Pages

```mermaid
graph LR
    subgraph Pages
        Home["Home"]
        Events["Events — Browse public events"]
        MyEvents["My Events — Creator dashboard"]
        CreateEvent["Create Event — Form + image upload"]
        Mint["Mint — Claim SPOT via QR/code/link"]
        Spots["My SPOTs — Claimed NFTs by month"]
        Communities["Communities — Browse/create/join"]
        Pricing["Pricing — Tier limits"]
        Profile["Profile"]
        Debugger["Debugger — Contract testing"]
    end
```

## Backend API Endpoints

```mermaid
graph TD
    subgraph Events
        E1["POST /events/create — Create event on-chain + cache"]
        E2["POST /events/claim — Claim SPOT NFT"]
        E3["GET /events/onchain — List events (DB first, RPC fallback)"]
        E4["GET /events/:eventId — Event details"]
        E5["GET /events/:eventId/minted-count — Cached mint count"]
    end

    subgraph Claimers
        C1["GET /claimers/:claimer/events — Events claimed by address"]
    end

    subgraph Creators
        CR1["GET /creators/:address — Creator profile + tier"]
        CR2["POST /creators/approve — Admin: approve creator"]
        CR3["POST /creators/revoke — Admin: revoke creator"]
    end

    subgraph CommunitiesAPI["Communities"]
        CO1["GET /communities — List all"]
        CO2["GET /communities/:id — Details"]
        CO3["GET /communities/:id/events — Community events"]
        CO4["POST /communities — Create"]
        CO5["POST /communities/:id/join — Join"]
        CO6["POST /communities/:id/leave — Leave"]
    end

    subgraph Contract
        CT1["GET /contract/admin — Admin address"]
        CT2["GET /contract/event-count — Total events"]
    end

    subgraph Other
        O1["GET /tier-limits — FREE/BASIC/PREMIUM limits"]
        O2["GET /health — Health check"]
    end
```

## Smart Contract — POAP (Active)

```mermaid
graph TD
    subgraph PoapContract["POAP Contract (Single Instance)"]
        subgraph Write["Write Operations"]
            W1["create_event(creator, ...) — Deploy event (requires approval)"]
            W2["claim(event_id, to) — Mint SPOT NFT"]
            W3["approve_creator(operator, creator, ref) — Admin only"]
            W4["revoke_creator_approval(operator, creator) — Admin only"]
            W5["update_event(operator, event_id, ...) — Creator/Admin"]
            W6["grant_admin_role(admin, operator) — Admin only"]
        end

        subgraph Read["Read Operations"]
            R1["admin() — Contract admin address"]
            R2["get_event(event_id) — Event details"]
            R3["minted_count(event_id) — SPOTs minted"]
            R4["has_claimed(event_id, address) — Check duplicate"]
            R5["get_all_events() — All event IDs"]
            R6["event_count() — Total events"]
            R7["get_event_poaps(event_id) — All token IDs"]
            R8["get_user_poap_for_event(event_id, addr) — User token ID"]
        end

        subgraph Storage["On-Chain Storage"]
            S1["EventCounter — u32"]
            S2["EventInfo(id) — EventData struct"]
            S3["EventMintedCount(id) — u32"]
            S4["HasClaimed(id, addr) — bool"]
            S5["CreatorApproval(addr) — CreatorApproval struct"]
        end
    end
```

## Data Flow — Claim SPOT

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Freighter
    participant FE as Frontend
    participant BE as Backend
    participant RPC as Soroban RPC
    participant SC as POAP Contract
    participant DB as PostgreSQL

    U->>FE: Click "Claim SPOT"
    FE->>BE: POST /events/claim {eventId, claimer}
    BE->>RPC: Invoke claim(event_id, to)
    RPC->>SC: Execute claim()
    SC->>SC: Check: claim period, not claimed, limit not exceeded
    SC-->>RPC: Mint NFT + return token_id
    RPC-->>BE: Transaction result
    BE->>DB: createClaimRecord() + incrementMintedCount()
    BE-->>FE: {success, tokenId, txHash}
    FE-->>U: "SPOT claimed!"
```

## Data Flow — Create Event

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend
    participant BE as Backend
    participant S3 as MinIO
    participant RPC as Soroban RPC
    participant SC as POAP Contract
    participant DB as PostgreSQL

    U->>FE: Fill form + upload image
    FE->>BE: POST /events/create (FormData)
    BE->>S3: uploadImage(file)
    S3-->>BE: publicUrl
    BE->>RPC: Invoke create_event(creator, name, ...)
    RPC->>SC: Execute create_event()
    SC->>SC: Check: creator approved, valid params
    SC-->>RPC: Event created (event_id)
    RPC-->>BE: Transaction result
    BE->>DB: createEventRecord() + createTransaction()
    BE-->>FE: {eventId, txHash}
    FE-->>U: "Event created!"
```

## Database Schema

```mermaid
erDiagram
    Event ||--o{ Claim : has
    Community ||--o{ CommunityMember : has
    Community ||--o{ Event : has

    Event {
        int id PK
        int eventId UK
        string creator
        string eventName
        datetime eventDate
        string location
        string description
        int maxPoaps
        datetime claimStart
        datetime claimEnd
        string metadataUri
        string imageUrl
        int mintedCount
        string txHash
        string tier
        string visibility
        int communityId FK
    }

    Claim {
        int id PK
        int eventId FK
        string claimer
        int tokenId
        string txHash
    }

    Creator {
        int id PK
        string address UK
        string status
        string tier
        string paymentReference
        string txHash
    }

    Community {
        int id PK
        string name
        string country
        string description
        string imageUrl
        string creatorAddress
    }

    CommunityMember {
        int id PK
        int communityId FK
        string address
    }

    Transaction {
        int id PK
        string action
        string status
        string txHash
        string payload
        string error
    }

    Image {
        int id PK
        string bucket
        string key
        string originalName
        string mimeType
        int size
        string publicUrl
    }
```

## Infrastructure — Production

```mermaid
graph LR
    subgraph Railway
        FE["Frontend<br/>Vite SPA + serve<br/>:3000"]
        BE["Backend<br/>Express API<br/>:8080"]
        PG["PostgreSQL<br/>Railway Plugin"]
        MIO["MinIO<br/>Object Storage<br/>:9000"]
    end

    subgraph Stellar
        RPC["Soroban Testnet RPC"]
        Contract["POAP Contract<br/>CBE3QGP...MQPDF"]
    end

    FE -->|REST API| BE
    BE -->|Prisma| PG
    BE -->|S3 API| MIO
    BE -->|RPC calls| RPC
    RPC --- Contract
```

## Key Architectural Patterns

| Pattern | Description |
|---------|-------------|
| Single Contract | All events managed in one `poap` contract instance with event IDs |
| Hybrid Storage | Essential data on-chain, images in MinIO, cache in PostgreSQL |
| DB-First Caching | Backend tries PostgreSQL first, falls back to Soroban RPC if empty |
| Role-Based Access | On-chain admin/creator roles + off-chain tier-based limits |
| Approval Workflow | Creators approved by admin (payment), stored on-chain |
| Dual Validation | On-chain (limits, duplicates, permissions) + off-chain (tiers, rate limiting) |
| Tier Limits | FREE: 5 SPOTs/event, 3 active — BASIC: 100/10 — PREMIUM: unlimited |
