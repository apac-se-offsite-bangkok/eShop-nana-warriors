# Query Interface + Implementation + View Model Template

## File placement

- Interface: `src/{Service}.API/Application/Queries/I{Name}Queries.cs`
- Implementation: `src/{Service}.API/Application/Queries/{Name}Queries.cs`
- View Models: `src/{Service}.API/Application/Queries/{Name}ViewModel.cs`

**IMPORTANT: Queries do NOT use MediatR.** Use EF Core DbContext directly via primary constructor.

## Query Interface

```csharp
namespace eShop.{Service}.API.Application.Queries;

public interface I{Name}Queries
{
    Task<{Name}Detail> Get{Name}Async(int id);
    Task<IEnumerable<{Name}Summary>> Get{Name}sFromUserAsync(string userId);
}
```

## Query Implementation

```csharp
namespace eShop.{Service}.API.Application.Queries;

public class {Name}Queries({DbContext} context)
    : I{Name}Queries
{
    public async Task<{Name}Detail> Get{Name}Async(int id)
    {
        var entity = await context.{DbSet}
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (entity is null)
            throw new KeyNotFoundException();

        return new {Name}Detail
        {
            Id = entity.Id,
            // Map other properties from domain entity to view model
        };
    }

    public async Task<IEnumerable<{Name}Summary>> Get{Name}sFromUserAsync(string userId)
    {
        return await context.{DbSet}
            .Where(e => e.Buyer.IdentityGuid == userId)
            .Select(e => new {Name}Summary
            {
                Id = e.Id,
                // Map summary properties
            })
            .ToListAsync();
    }
}
```

## View Models (record types)

```csharp
namespace eShop.{Service}.API.Application.Queries;

public record {Name}Detail
{
    public int Id { get; init; }
    public DateTime Date { get; init; }
    public string Status { get; init; }
    public string Description { get; init; }
    public List<{Name}ItemViewModel> Items { get; set; }
    public decimal Total { get; set; }
}

public record {Name}Summary
{
    public int Id { get; init; }
    public DateTime Date { get; init; }
    public string Status { get; init; }
    public double Total { get; init; }
}

public record {Name}ItemViewModel
{
    public string ProductName { get; init; }
    public int Units { get; init; }
    public double UnitPrice { get; init; }
    public string PictureUrl { get; init; }
}
```

## DI Registration

Add to `Extensions.cs`:

```csharp
services.AddScoped<I{Name}Queries, {Name}Queries>();
```
