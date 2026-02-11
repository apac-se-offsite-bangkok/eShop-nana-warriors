# Integration Events Patterns

## Define an Event

Location: `IntegrationEvents/Events/`

Events are records inheriting from `IntegrationEvent`:

```csharp
namespace eShop.Catalog.API.IntegrationEvents.Events;

public record ProductReviewAddedIntegrationEvent(
    int ProductId, int ReviewId, string ReviewerName, int Rating) : IntegrationEvent;
```

Naming: `{Description}IntegrationEvent`

## Define an Event Handler

Location: `IntegrationEvents/EventHandling/`

```csharp
namespace eShop.Catalog.API.IntegrationEvents.EventHandling;

public class ProductReviewAddedIntegrationEventHandler(
    CatalogContext context,
    ILogger<ProductReviewAddedIntegrationEventHandler> logger)
    : IIntegrationEventHandler<ProductReviewAddedIntegrationEvent>
{
    public async Task Handle(ProductReviewAddedIntegrationEvent @event)
    {
        logger.LogInformation("Handling event: {EventId}", @event.Id);
        // Process event...
    }
}
```

Naming: `{EventName}Handler`

## Register Subscription

In `Extensions/Extensions.cs`:

```csharp
builder.AddRabbitMqEventBus("eventbus")
    .AddSubscription<ProductReviewAddedIntegrationEvent, ProductReviewAddedIntegrationEventHandler>();
```

## Publish an Event (Transactional Outbox)

Used by Catalog.API and Ordering.API:

```csharp
var @event = new ProductReviewAddedIntegrationEvent(productId, reviewId, name, rating);
await services.EventService.AddAndSaveEventAsync(@event);
await services.EventService.PublishEventsThroughEventBusAsync(@event);
```

The outbox pattern ensures the event and domain change are saved in the same DB transaction before publishing to RabbitMQ.

## Existing Integration Event Map

### Ordering.API publishes:
- `OrderStartedIntegrationEvent`
- `OrderStatusChangedToAwaitingValidationIntegrationEvent`
- `OrderStatusChangedToStockConfirmedIntegrationEvent`
- `OrderStatusChangedToPaidIntegrationEvent`
- `OrderStatusChangedToShippedIntegrationEvent`
- `OrderStatusChangedToCancelledIntegrationEvent`

### Catalog.API publishes:
- `ProductPriceChangedIntegrationEvent`
- `OrderStockConfirmedIntegrationEvent`
- `OrderStockRejectedIntegrationEvent`

### PaymentProcessor publishes:
- `OrderPaymentSucceededIntegrationEvent`
- `OrderPaymentFailedIntegrationEvent`

### OrderProcessor publishes:
- `GracePeriodConfirmedIntegrationEvent`
