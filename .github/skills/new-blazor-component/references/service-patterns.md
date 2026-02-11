# Service Layer Patterns

## Service Interface

Location: `src/WebAppComponents/Services/`

```csharp
namespace eShop.WebAppComponents.Services;

public interface IMyService
{
    Task<MyItem?> GetItemAsync(int id);
    Task<MyResult> GetItemsAsync(int pageIndex, int pageSize);
}
```

## Service Implementation

Use primary constructors and `HttpClient` for API calls:

```csharp
namespace eShop.WebAppComponents.Services;

public class MyService(HttpClient httpClient) : IMyService
{
    private readonly string remoteServiceBaseUrl = "api/myservice/";

    public async Task<MyItem?> GetItemAsync(int id)
    {
        var uri = $"{remoteServiceBaseUrl}items/{id}";
        return await httpClient.GetFromJsonAsync<MyItem>(uri);
    }

    public async Task<MyResult> GetItemsAsync(int pageIndex, int pageSize)
    {
        var uri = $"{remoteServiceBaseUrl}items?pageIndex={pageIndex}&pageSize={pageSize}";
        return await httpClient.GetFromJsonAsync<MyResult>(uri) ?? new(0, 0, 0, []);
    }
}
```

## Data Model Records

Location: `src/WebAppComponents/{Feature}/`

```csharp
namespace eShop.WebAppComponents.MyFeature;

public record MyItem(int Id, string Name, string Description, decimal Price);
public record MyResult(int PageIndex, int PageSize, int Count, List<MyItem> Data);
```

## Stateful Service (per-circuit)

For services managing UI state across components (like `BasketState`):

```csharp
namespace eShop.WebApp.Services;

public class MyFeatureState(
    MyService myService,
    AuthenticationStateProvider authStateProvider) : IMyFeatureState
{
    private Task<IReadOnlyCollection<MyItem>>? _cachedItems;

    public Task<IReadOnlyCollection<MyItem>> GetItemsAsync()
    {
        return _cachedItems ??= FetchItemsAsync();
    }

    private async Task<IReadOnlyCollection<MyItem>> FetchItemsAsync()
    {
        // Fetch and return items
    }

    // Observer pattern for cross-component notification
    public IDisposable NotifyOnChange(EventCallback callback)
    {
        // Subscribe to state changes
    }
}
```

Register as `AddScoped<MyFeatureState>()` in DI.

## Existing Services Reference

| Service | Location | DI Lifetime | Protocol |
|---------|----------|-------------|----------|
| `CatalogService` | WebAppComponents | HttpClient (singleton) | HTTP → Catalog.API v2 |
| `BasketService` | WebApp | Singleton | gRPC → Basket.API |
| `BasketState` | WebApp | Scoped | In-memory + BasketService |
| `OrderingService` | WebApp | HttpClient (singleton) | HTTP → Ordering.API v1 |
| `OrderStatusNotificationService` | WebApp | Singleton | RabbitMQ events |
| `LogOutService` | WebApp | Scoped | OIDC sign-out |
| `ProductImageUrlProvider` | WebApp | Singleton | URL resolution |

## DI Registration Pattern

All service registration happens in `src/WebApp/Extensions/Extensions.cs`:

```csharp
public static void AddApplicationServices(this IHostApplicationBuilder builder)
{
    // HTTP clients use Aspire service discovery names
    builder.Services.AddHttpClient<CatalogService>(
        o => o.BaseAddress = new("https+http://catalog-api"))
        .AddApiVersion(2.0)
        .AddAuthToken();

    builder.Services.AddHttpClient<OrderingService>(
        o => o.BaseAddress = new("https+http://ordering-api"))
        .AddApiVersion(1.0)
        .AddAuthToken();

    // gRPC clients
    builder.Services.AddGrpcClient<Basket.BasketClient>(
        o => o.Address = new("http://basket-api"))
        .AddAuthToken();
}
```
