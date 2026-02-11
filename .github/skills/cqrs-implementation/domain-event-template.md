# Domain Event + Handler Template

## File placement

- Event: `src/{Service}.Domain/Events/{Description}DomainEvent.cs`
- Handler: `src/{Service}.API/Application/DomainEventHandlers/{Description}DomainEventHandler.cs`

## Domain Event

Use `record class` implementing `INotification` (MediatR). Raised in aggregate methods via `AddDomainEvent()`, dispatched in `SaveEntitiesAsync()` BEFORE `SaveChangesAsync()` — same transaction.

```csharp
namespace eShop.{Service}.Domain.Events;

/// <summary>
/// Event raised when {description of when this event occurs}
/// </summary>
public record class {Description}DomainEvent(
    {AggregateType} {Aggregate}
    ) : INotification;

// Alternative: event with just an identifier
// public record class {Description}DomainEvent(int {Aggregate}Id) : INotification;

// Alternative: event carrying child items
// public record class {Description}DomainEvent(
//     int {Aggregate}Id,
//     IEnumerable<{ChildType}> Items) : INotification;
```

## Domain Event Handler

```csharp
namespace eShop.{Service}.API.Application.DomainEventHandlers;

public partial class {Description}DomainEventHandler
    : INotificationHandler<{Description}DomainEvent>
{
    private readonly I{Aggregate}Repository _{aggregate}Repository;
    private readonly IBuyerRepository _buyerRepository;
    private readonly ILogger _logger;
    private readonly IOrderingIntegrationEventService _orderingIntegrationEventService;

    public {Description}DomainEventHandler(
        I{Aggregate}Repository {aggregate}Repository,
        ILogger<{Description}DomainEventHandler> logger,
        IBuyerRepository buyerRepository,
        IOrderingIntegrationEventService orderingIntegrationEventService)
    {
        _{aggregate}Repository = {aggregate}Repository ?? throw new ArgumentNullException(nameof({aggregate}Repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _buyerRepository = buyerRepository ?? throw new ArgumentNullException(nameof(buyerRepository));
        _orderingIntegrationEventService = orderingIntegrationEventService;
    }

    public async Task Handle({Description}DomainEvent domainEvent, CancellationToken cancellationToken)
    {
        // 1. Log the domain event
        OrderingApiTrace.LogOrderStatusUpdated(_logger, domainEvent.{Aggregate}.Id, OrderStatus.{NewStatus});

        // 2. Fetch related data if needed
        var entity = await _{aggregate}Repository.GetAsync(domainEvent.{Aggregate}.Id);
        var buyer = await _buyerRepository.FindByIdAsync(entity.BuyerId.Value);

        // 3. Create integration event
        var integrationEvent = new {Description}IntegrationEvent(
            entity.Id, entity.OrderStatus, buyer.Name, buyer.IdentityGuid);

        // 4. Save integration event to log table (published after transaction commit)
        await _orderingIntegrationEventService.AddAndSaveEventAsync(integrationEvent);
    }
}
```

## Raising the event in an aggregate

```csharp
public void DoSomething()
{
    if (Status != ExpectedStatus)
        StatusChangeException(OrderStatus.{NewStatus});

    Status = OrderStatus.{NewStatus};
    Description = "Status changed description";
    AddDomainEvent(new {Description}DomainEvent(this));
}
```
