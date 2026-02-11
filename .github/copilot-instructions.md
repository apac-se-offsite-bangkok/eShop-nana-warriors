# eShop — Copilot Instructions

This is a cloud-native .NET 10 e-commerce reference application ("AdventureWorks") using microservices orchestrated by .NET Aspire 13.1. See [PRD.md](../PRD.md) for full product requirements.

## Architecture Overview

### Key Architectural Decisions

- **Orchestration**: .NET Aspire `DistributedApplication` manages service lifecycle, dependencies, and configuration
- **Communication**: REST (Minimal APIs) for external/web clients, gRPC for internal inter-service calls, RabbitMQ for async event-driven messaging
- **Data Isolation**: Each service owns its data store (database-per-service pattern)
- **API Gateway**: YARP reverse proxy provides a Backend-for-Frontend (BFF) for mobile clients
- **Event-Driven**: Integration events via RabbitMQ enable loose coupling between bounded contexts
- **Observability**: OpenTelemetry for distributed tracing, metrics, and structured logging across all services

### Service Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                     .NET Aspire AppHost                            │
│                 (Orchestration & Service Discovery)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────────┐   │
│  │ WebApp   │  │ Hybrid   │  │ ClientApp │  │ WebhookClient    │   │
│  │ (Blazor) │  │ (MAUI+B) │  │ (MAUI)    │  │ (Blazor Server)  │   │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────────┬──────────┘  │
│       │              │        ┌─────┴──────┐          │             │
│       │              └────────┤ mobile-bff  │          │             │
│       │                       │  (YARP)     │          │             │
│       │                       └─────┬──────┘          │             │
│  ┌────┴──────────────────────────────┴────────────────┴──────────┐  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │  │
│  │  │ Catalog    │ │ Basket     │ │ Ordering   │ │ Webhooks  │  │  │
│  │  │ API (REST) │ │ API (gRPC) │ │ API (REST) │ │ API (REST)│  │  │
│  │  └─────┬──────┘ └─────┬──────┘ └──────┬─────┘ └────┬──────┘  │  │
│  └────────┼──────────────┼───────────────┼────────────┼──────────┘  │
│  ┌────────┼──────────────┼───────────────┼────────────┼──────────┐  │
│  │  ┌─────┴──────┐ ┌────┴────┐ ┌────────┴─────┐ ┌───┴────────┐ │  │
│  │  │ PostgreSQL │ │  Redis  │ │  RabbitMQ    │ │ Identity   │ │  │
│  │  │ (pgvector) │ │         │ │  (EventBus)  │ │ API (OIDC) │ │  │
│  │  └────────────┘ └─────────┘ └──────────────┘ └────────────┘ │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Background: OrderProcessor │ PaymentProcessor               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Bounded Contexts & Services

| Service | Style | Storage | Pattern |
|---------|-------|---------|---------|
| **Catalog.API** | REST (Minimal APIs, v1/v2) | PostgreSQL + pgvector | EF Core, transactional outbox |
| **Basket.API** | gRPC only | Redis | Repository over JSON |
| **Ordering.API** | REST (Minimal APIs, v1) | PostgreSQL (`ordering` schema) | DDD, CQRS, MediatR, outbox |
| **Identity.API** | MVC + Razor | PostgreSQL | Duende IdentityServer |
| **Webhooks.API** | REST (Minimal APIs) | PostgreSQL | Subscription + delivery |
| **OrderProcessor / PaymentProcessor** | Background workers | N/A | Event-driven |

Frontend: Blazor Server (`WebApp`), shared Razor Class Library (`WebAppComponents`), MAUI Hybrid (`HybridApp`), MAUI native (`ClientApp`).

### Data Flow — Order Lifecycle

```
User → WebApp → Basket.API (gRPC/Redis) → Ordering.API (create order)
  → OrderProcessor (grace period poll) → Catalog.API (stock validation)
  → PaymentProcessor (payment sim) → Ordering.API (status updates)
  → Webhooks.API (subscriber notification)
```

Order states: `Submitted → AwaitingValidation → StockConfirmed → Paid → Shipped` (or `Cancelled` at validation/payment).

### Integration Event Flow

All async cross-service communication uses RabbitMQ (`eshop_event_bus` exchange, direct routing by event type name):

- **Ordering.API** publishes: `OrderStarted`, `OrderAwaitingValidation`, `OrderStockConfirmed`, `OrderPaid`, `OrderShipped`, `OrderCancelled`
- **Catalog.API** subscribes to validate stock, publishes `OrderStockConfirmed`/`OrderStockRejected`
- **PaymentProcessor** subscribes to `StockConfirmed`, publishes `PaymentSucceeded`/`PaymentFailed`
- **Basket.API** subscribes to `OrderStarted` to delete the user's basket
- **Webhooks.API** subscribes to `ProductPriceChanged`, `OrderShipped`, `OrderPaid` for subscriber notification

### Authentication Architecture

```
Clients (WebApp/MAUI) ──OIDC──► Identity.API (Duende IS) ──JWT──► APIs
```

- Catalog.API: public (no auth)
- Basket.API, Ordering.API, Webhooks.API: JWT Bearer required
- Scopes: `orders`, `basket`, `webhooks`

### AI Features (Optional)

- Semantic search via pgvector embeddings in Catalog.API
- Chat assistant in WebApp via OpenAI/Ollama
- Disabled by default — opt-in via AppHost configuration

## Build & Run

```bash
# Build all projects
dotnet build eShop.Web.slnf          # web subset (excludes MAUI)
dotnet build eShop.slnx              # full solution

# Run the application (requires Docker for PostgreSQL, Redis, RabbitMQ)
dotnet run --project src/eShop.AppHost/eShop.AppHost.csproj

# Run tests
dotnet test tests/Ordering.UnitTests/Ordering.UnitTests.csproj
dotnet test tests/Catalog.FunctionalTests/Catalog.FunctionalTests.csproj   # requires Docker

# E2E (Playwright)
npx playwright install && npx playwright test
```

## Key Conventions

- **Target**: `net10.0`, `TreatWarningsAsErrors: true`, `ImplicitUsings: enable`
- **Packages**: Central package management in [Directory.Packages.props](../Directory.Packages.props) — never add versions in `.csproj` files
- **Artifacts**: Output to `artifacts/` via `UseArtifactsOutput`
- **Namespaces**: `eShop.{Project}.{Folder}`, file-scoped
- **DI setup**: Each service registers its dependencies in `AddApplicationServices()` inside `Extensions/Extensions.cs`
- **Health checks**: All services expose `/health` (readiness) and `/alive` (liveness) via `MapDefaultEndpoints()`

## Detailed Instructions

See topic-specific instructions in [.github/instructions/](.github/../instructions/):

- [common.instructions.md](instructions/common.instructions.md) — shared patterns, event bus, service defaults, testing
- [backend.instructions.md](instructions/backend.instructions.md) — API services, DDD, CQRS, integration events
- [frontend.instructions.md](instructions/frontend.instructions.md) — Blazor, WebAppComponents, MAUI apps
