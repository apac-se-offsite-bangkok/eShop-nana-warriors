# Command + Handler + Identified Handler Template

## File placement

- Command: `src/{Service}.API/Application/Commands/{Verb}{Noun}Command.cs`
- Handler: `src/{Service}.API/Application/Commands/{Verb}{Noun}CommandHandler.cs`
- Or co-located in same file for small commands

## Naming

- Command: `{Verb}{Noun}Command` (e.g., `CancelOrderCommand`)
- Handler: `{Verb}{Noun}CommandHandler` (e.g., `CancelOrderCommandHandler`)
- Identified Handler: `{Verb}{Noun}IdentifiedCommandHandler`

## Option A: Simple command (record style, 1-3 params)

```csharp
namespace eShop.{Service}.API.Application.Commands;

public record {Verb}{Noun}Command(int {IdentifierProperty}) : IRequest<bool>;
```

## Option B: Complex command (DataContract style, 4+ params)

```csharp
namespace eShop.{Service}.API.Application.Commands;

using System.Runtime.Serialization;

[DataContract]
public class {Verb}{Noun}Command : IRequest<bool>
{
    [DataMember]
    private readonly List<{ItemDTO}> _items;

    [DataMember]
    public string SomeProperty { get; private set; }

    [DataMember]
    public IEnumerable<{ItemDTO}> Items => _items;

    public {Verb}{Noun}Command()
    {
        _items = new List<{ItemDTO}>();
    }

    public {Verb}{Noun}Command(/* all params */)
    {
        // Assign all properties
    }
}
```

## Command Handler

```csharp
namespace eShop.{Service}.API.Application.Commands;

using eShop.{Service}.Domain.AggregatesModel.{Aggregate}Aggregate;

public class {Verb}{Noun}CommandHandler
    : IRequestHandler<{Verb}{Noun}Command, bool>
{
    private readonly I{Aggregate}Repository _{aggregate}Repository;
    private readonly ILogger<{Verb}{Noun}CommandHandler> _logger;

    public {Verb}{Noun}CommandHandler(
        I{Aggregate}Repository {aggregate}Repository,
        ILogger<{Verb}{Noun}CommandHandler> logger)
    {
        _{aggregate}Repository = {aggregate}Repository ?? throw new ArgumentNullException(nameof({aggregate}Repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<bool> Handle({Verb}{Noun}Command message, CancellationToken cancellationToken)
    {
        // 1. Fetch the aggregate from repository
        var aggregate = await _{aggregate}Repository.GetAsync(message.{IdentifierProperty});

        if (aggregate is null)
        {
            return false;
        }

        // 2. Call business method on the aggregate (rich domain model)
        // aggregate.DoSomething();

        _logger.LogInformation("{CommandName} - {AggregateType}: {@Aggregate}",
            nameof({Verb}{Noun}Command), nameof({Aggregate}), aggregate);

        // 3. Save via UnitOfWork (dispatches domain events before SaveChanges)
        return await _{aggregate}Repository.UnitOfWork.SaveEntitiesAsync(cancellationToken);
    }
}
```

## Identified Command Handler (Idempotency)

Always create alongside the command handler.

```csharp
public class {Verb}{Noun}IdentifiedCommandHandler : IdentifiedCommandHandler<{Verb}{Noun}Command, bool>
{
    public {Verb}{Noun}IdentifiedCommandHandler(
        IMediator mediator,
        IRequestManager requestManager,
        ILogger<IdentifiedCommandHandler<{Verb}{Noun}Command, bool>> logger)
        : base(mediator, requestManager, logger)
    {
    }

    protected override bool CreateResultForDuplicateRequest()
    {
        return true; // Ignore duplicate requests for this command.
    }
}
```
