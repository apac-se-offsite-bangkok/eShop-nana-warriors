---
name: cqrs-implementation
description: Implements CQRS, DDD, and event-driven patterns for the eShop microservices application. Use when creating commands, queries, domain events, integration events, aggregates, repositories, validators, API endpoints, or unit/functional tests following the Ordering service patterns with MediatR, FluentValidation, and EF Core.
---

# eShop CQRS Implementation Skill

## When to Use This Skill

Activate this skill when the task involves:
- Creating new MediatR commands or command handlers
- Creating query interfaces and implementations (read side)
- Adding domain events or domain event handlers
- Creating integration events or integration event handlers
- Building new DDD aggregates, entities, or value objects
- Adding FluentValidation validators for commands
- Creating Minimal API endpoints that dispatch commands
- Writing unit tests (MSTest + NSubstitute) or functional tests (xunit v3)
- Extending the MediatR pipeline (behaviors)
- Registering new services in the DI container

## Architecture Overview

```
HTTP Request → Minimal API (OrdersApi.cs)
  → Creates IdentifiedCommand<TCommand, bool>(command, requestId)
  → mediator.Send(identifiedCommand)
    → LoggingBehavior (logs before/after)
    → ValidatorBehavior (FluentValidation, throws on failure)
    → TransactionBehavior (wraps in DB transaction)
      → IdentifiedCommandHandler (idempotency check via IRequestManager)
        → mediator.Send(innerCommand)
          → CommandHandler (business logic)
            → Repository.Add(aggregate) / Repository.GetAsync(id)
            → Aggregate business methods → AddDomainEvent()
            → UnitOfWork.SaveEntitiesAsync()
              → DispatchDomainEventsAsync() [before SaveChanges]
                → DomainEventHandlers create IntegrationEvents
                → IOrderingIntegrationEventService.AddAndSaveEventAsync()
              → DbContext.SaveChangesAsync()
      → TransactionBehavior commits transaction
      → PublishEventsThroughEventBusAsync() → RabbitMQ
```

## Key Design Rules

1. **Commands use MediatR; Queries do NOT** — Queries use dedicated `I{Name}Queries` interface with EF Core directly
2. **Domain events dispatched BEFORE SaveChanges** — in same transaction
3. **Integration events saved to log table during transaction, published AFTER commit**
4. **Idempotency via `IdentifiedCommand<T, R>` wrapper** — tracks processed request GUIDs
5. **Rich domain model** — business rules in aggregate methods, NOT in handlers
6. **Private collections** — `private readonly List<T> _items;` with `IReadOnlyCollection<T> Items => _items.AsReadOnly();`

## Command Patterns

### Simple Command (record style)
Use for commands with few parameters:
```csharp
namespace eShop.Ordering.API.Application.Commands;
public record CancelOrderCommand(int OrderNumber) : IRequest<bool>;
```

### Complex Command ([DataContract] style)
Use for commands with many parameters that need serialization control:
```csharp
[DataContract]
public class CreateOrderCommand : IRequest<bool>
{
    [DataMember]
    private readonly List<OrderItemDTO> _orderItems;

    [DataMember]
    public string UserId { get; private set; }
    // ... more properties with private setters

    public CreateOrderCommand() { _orderItems = new List<OrderItemDTO>(); }
    public CreateOrderCommand(/* params */) { /* assign all */ }
}
```

### Command Handler
Reference: [command-template.md](./command-template.md)
```csharp
public class {Name}CommandHandler : IRequestHandler<{Name}Command, bool>
{
    // Constructor: inject repository, logger, other services
    // Use ?? throw new ArgumentNullException(nameof(param)) for guards
    public async Task<bool> Handle({Name}Command message, CancellationToken cancellationToken)
    {
        // 1. Get/create aggregate via repository
        // 2. Call aggregate business methods
        // 3. Save via repository.UnitOfWork.SaveEntitiesAsync()
    }
}
```

### Identified Command Handler (Idempotency)
Always create alongside the command handler:
```csharp
public class {Name}IdentifiedCommandHandler : IdentifiedCommandHandler<{Name}Command, bool>
{
    public {Name}IdentifiedCommandHandler(
        IMediator mediator,
        IRequestManager requestManager,
        ILogger<IdentifiedCommandHandler<{Name}Command, bool>> logger)
        : base(mediator, requestManager, logger) { }

    protected override bool CreateResultForDuplicateRequest() => true;
}
```

## Query Pattern (Read Side)

Queries bypass MediatR entirely. Reference: [query-template.md](./query-template.md)

```csharp
// Interface in Application/Queries/
public interface I{Name}Queries
{
    Task<{ViewModel}> Get{Name}Async(int id);
    Task<IEnumerable<{SummaryVM}>> Get{Name}sFromUserAsync(string userId);
}

// Implementation uses DbContext directly via primary constructor
public class {Name}Queries({DbContext} context) : I{Name}Queries
{
    public async Task<{ViewModel}> Get{Name}Async(int id)
    {
        var entity = await context.{DbSet}.Include(...).FirstOrDefaultAsync(e => e.Id == id);
        if (entity is null) throw new KeyNotFoundException();
        return new {ViewModel} { /* map properties */ };
    }
}

// View models are record types — NOT domain entities
public record {ViewModel} { public int Id { get; init; } /* ... */ }
```

## Domain Event Pattern

Reference: [domain-event-template.md](./domain-event-template.md)

```csharp
// In Ordering.Domain/Events/
public record class {Description}DomainEvent(/* params */) : INotification;

// Handler in Ordering.API/Application/DomainEventHandlers/
public class {Description}DomainEventHandler : INotificationHandler<{Description}DomainEvent>
{
    // Inject repositories, IOrderingIntegrationEventService, ILogger
    public async Task Handle({Description}DomainEvent domainEvent, CancellationToken ct)
    {
        // 1. Fetch related aggregates if needed
        // 2. Create integration event
        // 3. await _orderingIntegrationEventService.AddAndSaveEventAsync(integrationEvent);
    }
}
```

## Integration Event Pattern

Reference: [integration-event-template.md](./integration-event-template.md)

```csharp
// Event record extending IntegrationEvent
public record {Description}IntegrationEvent(/* params */) : IntegrationEvent;

// Handler implementing IIntegrationEventHandler<T>
public class {Description}IntegrationEventHandler(
    IMediator mediator,
    ILogger<{Description}IntegrationEventHandler> logger)
    : IIntegrationEventHandler<{Description}IntegrationEvent>
{
    public async Task Handle({Description}IntegrationEvent @event)
    {
        // Create and send a command via mediator
        var command = new {Verb}{Noun}Command(@event.SomeProperty);
        await mediator.Send(command);
    }
}
```

Register in `Extensions.cs`:
```csharp
eventBus.AddSubscription<{Description}IntegrationEvent, {Description}IntegrationEventHandler>();
```

## Validator Pattern

Reference: [validator-template.md](./validator-template.md)

```csharp
public class {CommandName}Validator : AbstractValidator<{CommandName}>
{
    public {CommandName}Validator(ILogger<{CommandName}Validator> logger)
    {
        RuleFor(x => x.Property).NotEmpty().WithMessage("Message");
        // Add more rules

        if (logger.IsEnabled(LogLevel.Trace))
            logger.LogTrace("INSTANCE CREATED - {ClassName}", GetType().Name);
    }
}
```

## API Endpoint Pattern

Reference: [api-endpoint-template.md](./api-endpoint-template.md)

```csharp
public static class {Name}Api
{
    public static RouteGroupBuilder Map{Name}ApiV1(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("api/{name}").HasApiVersion(1.0);
        api.MapGet("{id:int}", GetAsync);
        api.MapPost("/", CreateAsync);
        return api;
    }

    public static async Task<Results<Ok, BadRequest<string>, ProblemHttpResult>> CreateAsync(
        [FromHeader(Name = "x-requestid")] Guid requestId,
        {Command} command,
        [AsParameters] {Name}Services services)
    {
        if (requestId == Guid.Empty)
            return TypedResults.BadRequest("Empty GUID is not valid for request ID");

        var identified = new IdentifiedCommand<{Command}, bool>(command, requestId);
        var result = await services.Mediator.Send(identified);

        if (!result)
            return TypedResults.Problem(detail: "Failed to process.", statusCode: 500);

        return TypedResults.Ok();
    }
}
```

## Aggregate Pattern

Reference: [aggregate-template.md](./aggregate-template.md)

```csharp
// In Ordering.Domain/AggregatesModel/{Name}Aggregate/
public class {Name} : Entity, IAggregateRoot
{
    // Private collection fields
    private readonly List<{Child}> _items;
    public IReadOnlyCollection<{Child}> Items => _items.AsReadOnly();

    // Properties with private setters
    public string SomeProperty { get; private set; }

    protected {Name}() { _items = new List<{Child}>(); }

    public {Name}(/* constructor params */) : this()
    {
        // Validate + assign
        // AddDomainEvent(new {Name}StartedDomainEvent(this, ...));
    }

    // Business methods that validate state and raise domain events
    public void DoSomething()
    {
        if (Status != ExpectedStatus) throw new OrderingDomainException("...");
        Status = NewStatus;
        AddDomainEvent(new {Name}StatusChangedDomainEvent(Id));
    }
}

// Repository interface in Domain
public interface I{Name}Repository : IRepository<{Name}>
{
    {Name} Add({Name} entity);
    Task<{Name}> GetAsync(int id);
    void Update({Name} entity);
}
```

## DI Registration Pattern

In `Extensions.cs`:
```csharp
// MediatR with pipeline behaviors
services.AddMediatR(cfg => {
    cfg.RegisterServicesFromAssemblyContaining(typeof(Program));
    cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
    cfg.AddOpenBehavior(typeof(ValidatorBehavior<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehavior<,>));
});

// FluentValidation
services.AddValidatorsFromAssemblyContaining<{FirstValidator}>();

// Queries, repositories, services
services.AddScoped<I{Name}Queries, {Name}Queries>();
services.AddScoped<I{Name}Repository, {Name}Repository>();
```

## Test Patterns

### Unit Test (MSTest + NSubstitute)
Reference: [unit-test-template.md](./unit-test-template.md)

```csharp
[TestClass]
public class {Subject}Test
{
    private readonly I{Repository} _repositoryMock;
    private readonly IMediator _mediatorMock;

    public {Subject}Test()
    {
        _repositoryMock = Substitute.For<I{Repository}>();
        _mediatorMock = Substitute.For<IMediator>();
    }

    [TestMethod]
    public async Task Handle_returns_true_when_order_saved()
    {
        //Arrange
        _repositoryMock.UnitOfWork.SaveChangesAsync(default).Returns(Task.FromResult(1));

        //Act
        var handler = new {Command}Handler(/* inject mocks */);
        var result = await handler.Handle(new {Command}(/* params */), CancellationToken.None);

        //Assert
        Assert.IsTrue(result);
    }
}
```

### Domain Test
```csharp
[TestMethod]
public void Create_entity_success()
{
    //Arrange
    var param = "value";

    //Act
    var entity = new {Entity}(param);

    //Assert
    Assert.IsNotNull(entity);
}

[TestMethod]
public void Invalid_param_throws()
{
    //Act - Assert
    Assert.ThrowsExactly<OrderingDomainException>(() => new {Entity}(invalidParam));
}
```

### Builder Pattern for Test Data
```csharp
public class {Entity}Builder
{
    private readonly {Entity} entity;
    public {Entity}Builder() { entity = new {Entity}(/* defaults */); }
    public {Entity}Builder WithProperty(type value) { /* modify */ return this; }
    public {Entity} Build() => entity;
}
```

## File Placement Rules

| Artifact | Location |
|---|---|
| Command + Handler | `src/{Service}.API/Application/Commands/{CommandName}.cs` + `{CommandName}Handler.cs` |
| Validator | `src/{Service}.API/Application/Validations/{CommandName}Validator.cs` |
| Query interface | `src/{Service}.API/Application/Queries/I{Name}Queries.cs` |
| Query impl | `src/{Service}.API/Application/Queries/{Name}Queries.cs` |
| View models | `src/{Service}.API/Application/Queries/{Name}ViewModel.cs` |
| Domain event | `src/{Service}.Domain/Events/{Name}DomainEvent.cs` |
| Domain event handler | `src/{Service}.API/Application/DomainEventHandlers/{Name}DomainEventHandler.cs` |
| Integration event | `src/{Service}.API/Application/IntegrationEvents/Events/{Name}IntegrationEvent.cs` |
| Integration event handler | `src/{Service}.API/Application/IntegrationEvents/EventHandling/{Name}IntegrationEventHandler.cs` |
| Aggregate + entities | `src/{Service}.Domain/AggregatesModel/{Name}Aggregate/` |
| Repository interface | `src/{Service}.Domain/AggregatesModel/{Name}Aggregate/I{Name}Repository.cs` |
| Repository impl | `src/{Service}.Infrastructure/Repositories/{Name}Repository.cs` |
| API endpoints | `src/{Service}.API/Apis/{Name}Api.cs` |
| API services | `src/{Service}.API/Apis/{Name}Services.cs` |
| Unit tests | `tests/{Service}.UnitTests/Application/` or `tests/{Service}.UnitTests/Domain/` |
| Functional tests | `tests/{Service}.FunctionalTests/` |
| Test builders | `tests/{Service}.UnitTests/Builders.cs` |
