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

## Coding Standards (Enforced)

**All warnings are build errors.** `TreatWarningsAsErrors=true` is set globally in [Directory.Build.props](../Directory.Build.props). Any C# compiler or SDK analyzer warning will fail the build. This is the primary enforcement mechanism — treat it seriously.

### Must-follow rules

- **Zero warnings**: Fix all warnings before committing — they are errors in CI
- **No inline package versions**: Use `<PackageReference Include="..." />` without `Version=`. All versions live in [Directory.Packages.props](../Directory.Packages.props)
- **File-scoped namespaces**: Use `namespace Foo.Bar;` (not block-scoped `namespace Foo.Bar { }`)
- **`var` everywhere**: Prefer `var` for local variable declarations
- **No `this.` qualification**: Omit `this.` prefix on members
- **Language keywords over framework types**: Use `int`, `string`, `bool` — not `Int32`, `String`, `Boolean`
- **Sort usings**: `System.*` imports first (`dotnet_sort_system_directives_first = true`)
- **Global usings per project**: Each project has a `GlobalUsings.cs` with project-specific imports
- **Primary constructors**: Prefer for newer service classes (e.g., `public class MyService(HttpClient client)`)
- **Nullable reference types**: Enabled per-project (Catalog.API, WebApp, WebAppComponents, ServiceDefaults, AppHost) — respect the project's setting

### .editorconfig style (IDE guidance, `:silent`/`:suggestion` severity)

- **Indentation**: 4 spaces for C#, 2 spaces for XML/project files
- **Charset**: `utf-8-bom` for code files
- **Braces**: Allman style (`csharp_new_line_before_open_brace = all`)
- **Constants**: PascalCase naming
- **Modifier order**: `public, private, protected, internal, static, extern, new, virtual, abstract, sealed, override, readonly, unsafe, volatile, async`
- **Readonly fields**: Mark fields `readonly` when possible
- **Pattern matching**: Prefer `is`/`as` patterns over casts

### Allowed warning suppressions

- `NU1901-NU1904` — NuGet transitive security audit (globally suppressed)
- `RZ10021` — Razor component warning (WebApp only)
- `IL2026`, `IL3050` — AOT/trimming compatibility (EventBus only, via `#pragma`)
- EF migration files — `612, 618` (auto-generated, do not modify)

## Detailed Instructions

See topic-specific instructions in [.github/instructions/](.github/../instructions/):

- [common.instructions.md](instructions/common.instructions.md) — shared patterns, event bus, service defaults, testing
- [backend.instructions.md](instructions/backend.instructions.md) — API services, DDD, CQRS, integration events
- [frontend.instructions.md](instructions/frontend.instructions.md) — Blazor, WebAppComponents, MAUI apps
