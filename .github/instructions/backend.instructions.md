# Backend Instructions — eShop Microservices

## Architecture — Backend Services

The backend consists of six services, two background workers, and shared infrastructure:

```
src/
  Catalog.API/          – Product catalog (REST, EF Core + pgvector, outbox)
  Basket.API/           – Shopping cart (gRPC, Redis)
  Ordering.API/         – Order lifecycle (REST, DDD/CQRS/MediatR, outbox)
  Ordering.Domain/      – Pure domain model (aggregates, value objects, domain events)
  Ordering.Infrastructure/ – EF Core DbContext, repositories, idempotency
  OrderProcessor/       – Grace period polling (BackgroundService, ADO.NET)
  PaymentProcessor/     – Payment simulation (BackgroundService, event-driven)
  Identity.API/         – OIDC provider (Duende IdentityServer, MVC + Razor)
  Webhooks.API/         – Webhook subscriptions & delivery (REST)
```

**Service communication patterns:**
- WebApp → Catalog.API: HTTP/REST (v2)
- WebApp → Basket.API: gRPC
- WebApp → Ordering.API: HTTP/REST (v1)
- Cross-service async: RabbitMQ integration events
- Mobile → mobile-bff (YARP) → APIs

**Database ownership (database-per-service):**
- `catalogdb` → Catalog.API (PostgreSQL + pgvector)
- `orderingdb` → Ordering.API + OrderProcessor (PostgreSQL, `ordering` schema)
- `identitydb` → Identity.API (PostgreSQL)
- `webhooksdb` → Webhooks.API (PostgreSQL)
- Redis → Basket.API (key-value, `/basket/{userId}`)

## Service Patterns

### Minimal API Services (Catalog, Ordering, Webhooks)

Each service follows this `Program.cs` structure:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();                    // Aspire defaults (OTEL, health, service discovery, HTTP resilience)
builder.AddApplicationServices();                // Service-specific DI — defined in Extensions/Extensions.cs
builder.Services.AddProblemDetails();
var withApiVersioning = builder.Services.AddApiVersioning();
builder.AddDefaultOpenApi(withApiVersioning);

var app = builder.Build();
app.MapDefaultEndpoints();
app.Map{Service}Api();                           // Static method in Apis/{Service}Api.cs
app.UseDefaultOpenApi();
app.Run();
```

- **Endpoints** are static extension methods on `IEndpointRouteBuilder` in `Apis/{Service}Api.cs`
- Use `NewVersionedApi()`, `MapGroup()`, `.HasApiVersion(1, 0)` for versioning
- Apply fluent metadata: `.WithName()`, `.WithSummary()`, `.WithDescription()`, `.WithTags()`
- Reference: [src/Catalog.API/Apis/CatalogApi.cs](../../src/Catalog.API/Apis/CatalogApi.cs)

### gRPC Service (Basket.API)

- Uses `AddBasicServiceDefaults()` (no HTTP resilience — no outgoing HTTP calls)
- gRPC service defined in [src/Basket.API/Proto/basket.proto](../../src/Basket.API/Proto/basket.proto)
- JWT Bearer auth extracted from `ServerCallContext`
- Storage: Redis via `IBasketRepository` → `RedisBasketRepository`
- Source-generated `System.Text.Json` for serialization

### Background Workers (OrderProcessor, PaymentProcessor)

- Implement `BackgroundService`
- OrderProcessor: polls `ordering.orders` table via ADO.NET (`NpgsqlDataSource`)
- PaymentProcessor: subscribes to integration events, publishes payment result
- Use `AddBasicServiceDefaults()` or `AddServiceDefaults()` as appropriate

## DDD Pattern (Ordering Domain)

Ordering is the canonical DDD implementation. Follow these patterns:

### Aggregate Roots

- Inherit from `Entity, IAggregateRoot` (see [src/Ordering.Domain/SeedWork/](../../src/Ordering.Domain/SeedWork/))
- Private collections with `IReadOnlyCollection` public accessors
- State changes ONLY through methods that enforce invariants and raise domain events
- Domain events are `INotification` records/classes added via `AddDomainEvent()`

```csharp
// Example: Order aggregate enforces status transitions
public void SetAwaitingValidationStatus()
{
    if (_orderStatusId != OrderStatus.Submitted.Id)
        StatusChangeException(OrderStatus.AwaitingValidation);
    AddDomainEvent(new OrderStatusChangedToAwaitingValidationDomainEvent(Id, _orderItems));
    _orderStatusId = OrderStatus.AwaitingValidation.Id;
}
```

### SeedWork Types

| Type | Purpose |
|------|---------|
| `Entity` | Base with `int Id`, domain events collection |
| `IAggregateRoot` | Marker interface for aggregate roots |
| `IRepository<T>` | Repository contract with `IUnitOfWork` |
| `ValueObject` | Value equality (e.g., `Address`) |
| `IUnitOfWork` | `SaveEntitiesAsync()` — dispatches domain events before saving |

### Repository Pattern

- One repository per aggregate root: `OrderRepository`, `BuyerRepository`
- Repositories live in [src/Ordering.Infrastructure/Repositories/](../../src/Ordering.Infrastructure/Repositories/)
- `OrderingContext` implements `IUnitOfWork`, dispatches domain events in `SaveEntitiesAsync()`

## CQRS with MediatR

### Commands

- Naming: `{Action}Command` implementing `IRequest<bool>` (or `IRequest<TResult>`)
- Simple commands use **records**: `public record CancelOrderCommand(int OrderNumber) : IRequest<bool>;`
- Complex commands use classes with `[DataContract]`/`[DataMember]` attributes and private setters
- Each command has a paired `{Action}CommandHandler` and `Identified{Action}CommandHandler` for idempotency
- Location: [src/Ordering.API/Application/Commands/](../../src/Ordering.API/Application/Commands/)

### Queries (Read side)

- Uses **Dapper** for read-side queries (`IOrderQueries`)
- Location: [src/Ordering.API/Application/Queries/](../../src/Ordering.API/Application/Queries/)

### Pipeline Behaviors

| Behavior | Purpose |
|----------|---------|
| `LoggingBehavior<T,R>` | Logs command name and response |
| `ValidatorBehavior<T,R>` | Runs FluentValidation `AbstractValidator<T>` |
| `TransactionBehavior<T,R>` | Wraps in EF transaction, publishes outbox events after commit |

### Validators

- Naming: `{Command}Validator : AbstractValidator<{Command}>` (FluentValidation)
- Location: [src/Ordering.API/Application/Validations/](../../src/Ordering.API/Application/Validations/)

## Integration Events

### Naming Convention

- Events: `{Description}IntegrationEvent` (record inheriting `IntegrationEvent`)
- Handlers: `{EventName}Handler` implementing `IIntegrationEventHandler<TEvent>`
- Location per service: `IntegrationEvents/Events/` and `IntegrationEvents/EventHandling/`

### Registration

```csharp
builder.AddRabbitMqEventBus("eventbus")
    .AddSubscription<OrderStockConfirmedIntegrationEvent, OrderStockConfirmedIntegrationEventHandler>()
    .AddSubscription<OrderStockRejectedIntegrationEvent, OrderStockRejectedIntegrationEventHandler>();
```

### Transactional Outbox (Catalog.API, Ordering.API)

1. Save integration event alongside domain change in the same DB transaction
2. `IntegrationEventLogService<TContext>` persists `IntegrationEventLogEntry`
3. After commit, `TransactionBehavior` publishes pending events via `IEventBus`
4. Events marked `Published` or `PublishedFailed`

### Idempotent Commands

- `IdentifiedCommand<T, R>` wraps commands with a `RequestId` (GUID from `x-requestid` header)
- `RequestManager` deduplicates via `ClientRequest` table in `orderingdb`

## Database & Migrations

- **Database-per-service**: `catalogdb`, `identitydb`, `orderingdb`, `webhooksdb` (all PostgreSQL)
- Auto-migration on startup via `AddMigration<TContext>()` from `Shared/MigrateDbContextExtensions.cs`
- Seeding: `IDbSeeder<TContext>` interface (used by Catalog.API and Identity.API)
- Ordering uses schema `ordering`; others use `public`
- EF Core + Npgsql provider; OrderProcessor uses raw Npgsql ADO.NET

## Authentication

- Identity.API is the OIDC provider (Duende IdentityServer)
- Services call `AddDefaultAuthentication()` from ServiceDefaults — validates JWT Bearer tokens
- Catalog.API has **no auth** (public access)
- Basket.API, Ordering.API, Webhooks.API require JWT Bearer for mutating operations
