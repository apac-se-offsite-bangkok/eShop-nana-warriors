---
name: 'Infrastructure Layer Standards'
description: 'EF Core, repository implementation, and database conventions for Ordering Infrastructure'
applyTo: 'src/**/Infrastructure/**/*.cs'
---

# Infrastructure Layer Coding Standards

## Repository Implementation
- Inject `DbContext` (e.g., `OrderingContext`) via constructor or primary constructor
- Expose `IUnitOfWork UnitOfWork => context`
- `Add()` returns entity: `context.{DbSet}.Add(entity).Entity`
- `GetAsync()` uses `FindAsync` + explicit `LoadAsync` for navigation properties
- `Update()` sets state: `context.Entry(entity).State = EntityState.Modified`

Example:
```csharp
public class OrderRepository(OrderingContext context) : IOrderRepository
{
    public IUnitOfWork UnitOfWork => context;
    public Order Add(Order order) => context.Orders.Add(order).Entity;
    public async Task<Order> GetAsync(int orderId)
    {
        var order = await context.Orders.FindAsync(orderId);
        if (order != null)
            await context.Entry(order).Collection(o => o.OrderItems).LoadAsync();
        return order;
    }
    public void Update(Order order) => context.Entry(order).State = EntityState.Modified;
}
```

## DbContext (OrderingContext)
- Implements `IUnitOfWork` (domain layer interface)
- `SaveEntitiesAsync()` dispatches domain events BEFORE `SaveChangesAsync()` (same transaction)
- Transaction management: `BeginTransactionAsync()`, `CommitTransactionAsync()`, `RollbackTransaction()`, `HasActiveTransaction` guard
- Uses `modelBuilder.UseIntegrationEventLogs()` for integration event log table
- Schema: `"ordering"` — use `DEFAULT_SCHEMA` constant
- Uses HiLo sequences: `UseHiLo("{name}seq", DEFAULT_SCHEMA)`

## Entity Type Configuration
- Implement `IEntityTypeConfiguration<T>` in `EntityConfigurations/` folder
- Set table name with schema: `builder.ToTable("orders", OrderingContext.DEFAULT_SCHEMA)`
- Configure HiLo for IDs: `builder.Property(e => e.Id).UseHiLo("orderseq", ...)`
- Ignore domain events: `builder.Ignore(e => e.DomainEvents)`
- Value Objects as owned entities: `builder.OwnsOne(o => o.Address, a => { a.WithOwner(); })`
- Navigation access mode: `navigation.SetPropertyAccessMode(PropertyAccessMode.Field)` for private collections

## Idempotency (RequestManager)
- `ClientRequest` entity: `Guid Id`, `string Name`, `DateTime Time`
- `IRequestManager.ExistAsync(Guid)` checks for duplicate
- `IRequestManager.CreateRequestForCommandAsync<T>(Guid)` records processed request
- Throws `OrderingDomainException` on duplicate attempt

## Integration Event Log
- Uses `IntegrationEventLogEF` shared library
- Call `modelBuilder.UseIntegrationEventLogs()` in `OnModelCreating`
- `IntegrationEventLogService<TContext>` manages event persistence
