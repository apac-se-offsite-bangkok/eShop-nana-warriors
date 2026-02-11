# Integration Event + Handler Template

## File placement

- Event: `src/{Service}.API/Application/IntegrationEvents/Events/{Description}IntegrationEvent.cs`
- Handler: `src/{Service}.API/Application/IntegrationEvents/EventHandling/{Description}IntegrationEventHandler.cs`

Integration events are `record` types extending `IntegrationEvent` base. They cross service boundaries via RabbitMQ.

## Integration Event

```csharp
namespace eShop.{Service}.API.Application.IntegrationEvents.Events;

public record {Description}IntegrationEvent(
    int {Aggregate}Id
    // Add additional properties as needed
    ) : IntegrationEvent;

// Examples from the codebase:
// public record OrderStartedIntegrationEvent(string UserId) : IntegrationEvent;
// public record OrderStatusChangedToCancelledIntegrationEvent(
//     int OrderId, OrderStatus OrderStatus, string BuyerName, string BuyerIdentityGuid) : IntegrationEvent;
```

## Integration Event Handler

Uses primary constructor for DI injection.

```csharp
namespace eShop.{Service}.API.Application.IntegrationEvents.EventHandling;

public class {Description}IntegrationEventHandler(
    IMediator mediator,
    ILogger<{Description}IntegrationEventHandler> logger)
    : IIntegrationEventHandler<{Description}IntegrationEvent>
{
    public async Task Handle({Description}IntegrationEvent @event)
    {
        logger.LogInformation("Handling integration event: {IntegrationEventId} - ({@IntegrationEvent})",
            @event.Id, @event);

        var command = new {Verb}{Noun}Command(@event.{Aggregate}Id);

        logger.LogInformation("Sending command: {CommandName} - {IdProperty}: {CommandId} ({@Command})",
            command.GetGenericTypeName(),
            nameof(command.{IdentifierProperty}),
            command.{IdentifierProperty},
            command);

        await mediator.Send(command);
    }
}
```

## Subscription Registration

Add to `AddEventBusSubscriptions()` in `Extensions.cs`:

```csharp
eventBus.AddSubscription<{Description}IntegrationEvent, {Description}IntegrationEventHandler>();
```
