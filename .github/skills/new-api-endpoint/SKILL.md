---
name: new-api-endpoint
description: Create new REST API endpoints for eShop microservices using ASP.NET Core Minimal APIs. Use when adding endpoints to Catalog.API, Ordering.API, or Webhooks.API. Covers API versioning, endpoint handlers with TypedResults, integration events with RabbitMQ, CQRS commands with MediatR, FluentValidation validators, idempotent command handling, and transactional outbox pattern.
---

# New API Endpoint

Create REST API endpoints following eShop Minimal API conventions.

## Service Selection

| Service | Route Prefix | Auth | Versioning | Pattern |
|---------|-------------|------|------------|---------|
| Catalog.API | `api/catalog` | None (public) | v1 + v2 | EF Core + outbox |
| Ordering.API | `api/orders` | JWT Bearer | v1 | DDD + CQRS + MediatR |
| Webhooks.API | `api/webhooks` | JWT Bearer | v1 | EF Core direct |

## Endpoint Definition

### Add to Existing API Group

In `Apis/{Service}Api.cs`, add to the `Map{Service}Api()` method:

```csharp
api.MapGet("/items/{id}", GetItemById)
    .WithName("GetItemById")
    .WithSummary("Get a catalog item by id")
    .WithDescription("Returns a single catalog item matching the specified id")
    .WithTags("Items");
```

### Create New API Group

Create `src/{Service}/Apis/{Feature}Api.cs`:

```csharp
namespace eShop.Catalog.API.Apis;

public static class ReviewsApi
{
    public static IEndpointRouteBuilder MapReviewsApi(this IEndpointRouteBuilder app)
    {
        var vApi = app.NewVersionedApi("Reviews");
        var api = vApi.MapGroup("api/catalog/reviews").HasApiVersion(1, 0);

        api.MapGet("/{itemId}", GetReviewsByItem)
            .WithName("GetReviewsByItem")
            .WithSummary("Get reviews for a catalog item")
            .WithTags("Reviews");

        return app;
    }

    // Handler methods...
}
```

Wire in `Program.cs`: `app.MapReviewsApi();`

## Handler Implementations

### Simple Handler (Catalog-style)

```csharp
public static async Task<Results<Ok<CatalogItem>, NotFound, BadRequest<ProblemDetails>>> GetItemById(
    HttpContext httpContext,
    [AsParameters] CatalogServices services,
    [Description("The catalog item id")] int id)
{
    if (id <= 0)
    {
        return TypedResults.BadRequest<ProblemDetails>(new() { Detail = "Id must be positive" });
    }

    var item = await services.Context.CatalogItems
        .Include(ci => ci.CatalogBrand)
        .SingleOrDefaultAsync(ci => ci.Id == id);

    if (item is null)
    {
        return TypedResults.NotFound();
    }

    return TypedResults.Ok(item);
}
```

### CQRS Handler (Ordering-style)

```csharp
public static async Task<Results<Ok, BadRequest<string>>> CancelOrderAsync(
    [Description("The order number")] int orderNumber,
    [FromHeader(Name = "x-requestid")] Guid requestId,
    [AsParameters] OrderServices services)
{
    if (requestId == Guid.Empty)
    {
        return TypedResults.BadRequest("RequestId is missing.");
    }

    var command = new IdentifiedCommand<CancelOrderCommand, bool>(
        new CancelOrderCommand(orderNumber), requestId);
    var result = await services.Mediator.Send(command);

    return result ? TypedResults.Ok() : TypedResults.BadRequest("Order cancellation failed.");
}
```

## Parameter Classes

Use `[AsParameters]` for aggregate DI:

```csharp
public record CatalogServices(
    CatalogContext Context,
    ICatalogAI CatalogAI,
    ICatalogIntegrationEventService EventService,
    IOptions<CatalogOptions> Options,
    ILogger<CatalogApi> Logger);
```

## Cross-Service Communication

For integration events, CQRS commands, and validators, see:
- [references/integration-events.md](references/integration-events.md)
- [references/cqrs-patterns.md](references/cqrs-patterns.md)

## Service Registration

In `Extensions/Extensions.cs` inside `AddApplicationServices()`:

```csharp
// EF Core context
builder.AddNpgsqlDbContext<CatalogContext>("catalogdb");

// Integration event subscriptions
builder.AddRabbitMqEventBus("eventbus")
    .AddSubscription<MyEvent, MyEventHandler>();

// MediatR (Ordering-style)
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblyContaining(typeof(CreateOrderCommand));
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(ValidatorBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});
```

## Conventions

- Static class `{Feature}Api` with `Map{Feature}Api()` extension method
- `NewVersionedApi()` → `MapGroup()` → `.HasApiVersion(1, 0)`
- `.WithName()`, `.WithSummary()`, `.WithDescription()`, `.WithTags()` metadata
- `TypedResults` for typed returns (not `Results`)
- `[AsParameters]` for aggregate service injection
- `[Description("...")]` on params for OpenAPI docs
- Primary constructors for handler DI
- File-scoped namespaces: `namespace eShop.{Project}.{Folder};`
- `var` for all locals, zero warnings
