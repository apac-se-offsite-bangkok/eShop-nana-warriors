---
name: 'Command Layer Standards'
description: 'MediatR command, handler, and pipeline conventions for the Ordering API'
applyTo: 'src/**/Application/Commands/**/*.cs'
---

# Command Layer Coding Standards

## Command Definition
- Name: `{Verb}{Noun}Command` (e.g., `CancelOrderCommand`, `CreateOrderCommand`)
- Implement `IRequest<bool>` (or `IRequest<TResult>` for data-returning commands)
- Commands are IMMUTABLE

### Simple commands (1-3 parameters)
Use C# `record` syntax:
```csharp
public record CancelOrderCommand(int OrderNumber) : IRequest<bool>;
```

### Complex commands (4+ parameters)
Use `[DataContract]` class with private setters:
```csharp
[DataContract]
public class CreateOrderCommand : IRequest<bool>
{
    [DataMember]
    public string UserId { get; private set; }
    // ...
}
```

## Command Handler
- Name: `{CommandName}Handler` (e.g., `CancelOrderCommandHandler`)
- Implement `IRequestHandler<TCommand, TResult>`
- Constructor: inject repository, logger, services using `?? throw new ArgumentNullException(nameof(param))`
- Handle method pattern:
  1. Fetch/create aggregate via repository
  2. Call business methods on the aggregate (rich domain model)
  3. Save via `repository.UnitOfWork.SaveEntitiesAsync(cancellationToken)`
- NEVER put business logic in handlers — delegate to aggregate methods

## Identified Command Handler (Idempotency)
- Name: `{CommandName}IdentifiedCommandHandler`
- Extend `IdentifiedCommandHandler<TCommand, bool>`
- Always create alongside the regular handler
- Override `CreateResultForDuplicateRequest()` — typically returns `true`
- Constructor: `(IMediator mediator, IRequestManager requestManager, ILogger<...> logger)`

## Namespace
`eShop.Ordering.API.Application.Commands`

## Co-location
The command handler and identified command handler can be in the same file as the command, or split into separate files: `{CommandName}.cs` and `{CommandName}Handler.cs`
