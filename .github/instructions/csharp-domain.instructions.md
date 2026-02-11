---
name: 'Domain Layer Standards'
description: 'DDD entity, aggregate, and value object conventions for the Ordering Domain'
applyTo: 'src/**/Domain/**/*.cs'
---

# Domain Layer Coding Standards

## Aggregate Roots
- Extend `Entity` base class AND implement `IAggregateRoot` marker interface
- Use private collection fields: `private readonly List<T> _items;`
- Expose collections as `IReadOnlyCollection<T>`: `public IReadOnlyCollection<T> Items => _items.AsReadOnly();`
- ALL properties must use `private set` — only modifiable through constructors and business methods
- Protected parameterless constructor required for EF Core materialization
- Public constructor validates inputs and raises creation domain event via `AddDomainEvent()`

## Business Methods
- ALL business logic lives in aggregate methods — NEVER in command handlers
- Each state transition validates the current state before proceeding
- Throw `OrderingDomainException` for invalid state transitions
- Raise domain events via `AddDomainEvent(new {Description}DomainEvent(...))` after state change

Example state transition:
```csharp
public void SetShippedStatus()
{
    if (OrderStatus != OrderStatus.Paid)
        StatusChangeException(OrderStatus.Shipped);
    OrderStatus = OrderStatus.Shipped;
    Description = "The order was shipped.";
    AddDomainEvent(new OrderShippedDomainEvent(this));
}
```

## Domain Events
- Use `record class` type implementing `INotification` (MediatR)
- Name: `{Description}DomainEvent`
- Place in `Events/` folder within the Domain project
- Include aggregate reference or ID plus relevant data as constructor parameters

## Value Objects
- Extend `ValueObject` base class
- Override `GetEqualityComponents()` for structural equality
- Immutable — all properties set only in constructor

## Repository Interfaces
- Define in Domain: `I{Name}Repository : IRepository<{Name}>`
- Expose: `Add()`, `GetAsync()`, `Update()` methods
- `IRepository<T>` constraint: `where T : IAggregateRoot`

## Dependencies
- The Domain project must have NO ASP.NET dependencies
- Only allowed references: MediatR (`INotification`), System.Reflection, base .NET libraries
- NEVER reference Infrastructure or API projects from Domain
