# DDD Aggregate Root Template

## File placement

- Aggregate: `src/{Service}.Domain/AggregatesModel/{Name}Aggregate/{Name}.cs`
- Children: `src/{Service}.Domain/AggregatesModel/{Name}Aggregate/{Child}.cs`
- Value Obj: `src/{Service}.Domain/AggregatesModel/{Name}Aggregate/{ValueObject}.cs`
- Repo Interface: `src/{Service}.Domain/AggregatesModel/{Name}Aggregate/I{Name}Repository.cs`
- Repo Implementation: `src/{Service}.Infrastructure/Repositories/{Name}Repository.cs`

## Aggregate Root

```csharp
namespace eShop.{Service}.Domain.AggregatesModel.{Name}Aggregate;

public class {Name}
    : Entity, IAggregateRoot
{
    public DateTime CreatedDate { get; private set; }
    public {Status}Status Status { get; private set; }
    public string Description { get; private set; }

    // Private collection field — DDD encapsulation
    private readonly List<{Child}> _items;
    public IReadOnlyCollection<{Child}> Items => _items.AsReadOnly();

    // Protected parameterless constructor for EF Core
    protected {Name}()
    {
        _items = new List<{Child}>();
    }

    // Public constructor with business validation
    public {Name}(string requiredParam /* other params */) : this()
    {
        CreatedDate = DateTime.UtcNow;
        Status = {Status}Status.Created;
        AddDomainEvent(new {Name}CreatedDomainEvent(this, requiredParam));
    }

    // Business methods — validate state, transition, raise domain events
    public void AddItem(int itemId, string itemName, decimal unitPrice, int units = 1)
    {
        var existingItem = _items.SingleOrDefault(i => i.ItemId == itemId);
        if (existingItem != null)
        {
            existingItem.AddUnits(units);
        }
        else
        {
            _items.Add(new {Child}(itemId, itemName, unitPrice, units));
        }
    }

    public void Cancel()
    {
        if (Status == {Status}Status.Completed)
            throw new OrderingDomainException("Cannot cancel a completed entity.");

        Status = {Status}Status.Cancelled;
        Description = "The entity was cancelled.";
        AddDomainEvent(new {Name}CancelledDomainEvent(this));
    }

    public decimal GetTotal() => _items.Sum(i => i.Units * i.UnitPrice);
}
```

## Child Entity

```csharp
namespace eShop.{Service}.Domain.AggregatesModel.{Name}Aggregate;

public class {Child} : Entity
{
    public int ItemId { get; private set; }
    public string ItemName { get; private set; }
    public decimal UnitPrice { get; private set; }
    public int Units { get; private set; }

    protected {Child}() { }

    public {Child}(int itemId, string itemName, decimal unitPrice, int units)
    {
        if (units <= 0) throw new OrderingDomainException("Invalid number of units");
        ItemId = itemId;
        ItemName = itemName;
        UnitPrice = unitPrice;
        Units = units;
    }

    public void AddUnits(int units)
    {
        if (units < 0) throw new OrderingDomainException("Invalid units");
        Units += units;
    }
}
```

## Repository Interface (in Domain)

```csharp
namespace eShop.{Service}.Domain.AggregatesModel.{Name}Aggregate;

public interface I{Name}Repository : IRepository<{Name}>
{
    {Name} Add({Name} entity);
    Task<{Name}> GetAsync(int id);
    void Update({Name} entity);
}
```

## Repository Implementation (in Infrastructure)

```csharp
namespace eShop.{Service}.Infrastructure.Repositories;

public class {Name}Repository(OrderingContext context) : I{Name}Repository
{
    public IUnitOfWork UnitOfWork => context;

    public {Name} Add({Name} entity) => context.{DbSet}.Add(entity).Entity;

    public async Task<{Name}> GetAsync(int id)
    {
        var entity = await context.{DbSet}.FindAsync(id);
        if (entity != null)
            await context.Entry(entity).Collection(e => e.Items).LoadAsync();
        return entity;
    }

    public void Update({Name} entity) => context.Entry(entity).State = EntityState.Modified;
}
```
