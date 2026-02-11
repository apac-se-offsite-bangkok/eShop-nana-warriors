# CQRS Patterns (Ordering.API)

## Commands

### Simple Command (record)

Location: `Application/Commands/`

```csharp
namespace eShop.Ordering.API.Application.Commands;

public record CancelOrderCommand(int OrderNumber) : IRequest<bool>;
```

### Complex Command (class with DataContract)

```csharp
[DataContract]
public class CreateOrderCommand : IRequest<bool>
{
    [DataMember]
    public string City { get; private set; }

    [DataMember]
    public List<OrderItemDTO> OrderItems { get; private set; }

    public CreateOrderCommand(string city, List<OrderItemDTO> orderItems)
    {
        City = city;
        OrderItems = orderItems;
    }
}
```

## Command Handler

```csharp
public class CancelOrderCommandHandler(
    IOrderRepository orderRepository,
    ILogger<CancelOrderCommandHandler> logger) : IRequestHandler<CancelOrderCommand, bool>
{
    public async Task<bool> Handle(CancelOrderCommand command, CancellationToken cancellationToken)
    {
        var order = await orderRepository.GetAsync(command.OrderNumber);
        if (order is null) return false;

        order.SetCancelledStatus();
        return await orderRepository.UnitOfWork.SaveEntitiesAsync(cancellationToken);
    }
}
```

## Idempotent Command Wrapper

For commands from external clients, wrap with `IdentifiedCommand` using the `x-requestid` header:

```csharp
public class CancelOrderIdentifiedCommandHandler(
    IMediator mediator,
    IRequestManager requestManager,
    ILogger<IdentifiedCommandHandler<CancelOrderCommand, bool>> logger)
    : IdentifiedCommandHandler<CancelOrderCommand, bool>(mediator, requestManager, logger)
{
    protected override bool CreateResultForDuplicateRequest() => true;
}
```

The `RequestManager` deduplicates via the `ClientRequest` table.

## FluentValidation Validators

Location: `Application/Validations/`

```csharp
namespace eShop.Ordering.API.Application.Validations;

public class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator(ILogger<CancelOrderCommandValidator> logger)
    {
        RuleFor(command => command.OrderNumber)
            .NotEmpty()
            .WithMessage("Order number is required");

        logger.LogTrace("Validator {Validator} created", GetType().Name);
    }
}
```

Naming: `{Command}Validator : AbstractValidator<{Command}>`

## MediatR Pipeline Behaviors

Registered in `Extensions.cs`, they wrap every command:

| Behavior | Purpose |
|----------|---------|
| `LoggingBehavior<T,R>` | Logs command name and response |
| `ValidatorBehavior<T,R>` | Runs FluentValidation validators |
| `TransactionBehavior<T,R>` | Wraps in EF transaction, publishes outbox events |

## Queries (Read Side)

Uses Dapper for read-side queries:

```csharp
public class OrderQueries(string connectionString) : IOrderQueries
{
    public async Task<OrderViewModel> GetOrderAsync(int id)
    {
        using var connection = new NpgsqlConnection(connectionString);
        // Dapper query...
    }
}
```

Location: `Application/Queries/`
