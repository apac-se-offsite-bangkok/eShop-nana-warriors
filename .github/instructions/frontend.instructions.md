# Frontend Instructions — eShop Web & Mobile Apps

## WebApp (Blazor Server)

### Structure

```
src/WebApp/
  Components/
    Layout/           – MainLayout, NavMenu, etc.
    Pages/
      Cart/           – Shopping cart page
      Catalog/        – Product listing page
      Checkout/       – Checkout flow
      Item/           – Product detail page
      User/           – User profile / order history
  Extensions/         – DI registration (AddApplicationServices)
  Services/           – Backend service clients
```

### Key Patterns

- **Interactive SSR**: `AddRazorComponents().AddInteractiveServerComponents()`
- **Stream rendering**: `@attribute [StreamRendering]` on pages for progressive loading
- **Route parameters**: `[SupplyParameterFromQuery]` for query string binding
- **Auth**: OpenID Connect (client: `webapp`), scopes: `openid`, `profile`, `orders`, `basket`

### Service Layer ([src/WebApp/Services/](../../src/WebApp/Services/))

| Service | Backend | Protocol |
|---------|---------|----------|
| `BasketService` | Basket.API | gRPC (wraps generated client) |
| `BasketState` / `IBasketState` | local + Basket.API | Stateful basket management |
| `OrderingService` | Ordering.API | HTTP/JSON |
| `OrderStatusNotificationService` | RabbitMQ events | Integration event subscriber |
| `LogOutService` | Identity.API | OIDC sign-out |

- Services use **primary constructors**: `public class OrderingService(HttpClient httpClient)`
- HTTP clients configured in `AddApplicationServices()` with service discovery names (e.g., `"https+http://catalog-api"`)
- Auth token propagation via `AddAuthToken()` from ServiceDefaults

### Image Handling

- Product images proxied via YARP: `MapForwarder("/product-images/{id}", "https+http://catalog-api", ...)`
- `IProductImageUrlProvider` abstraction for platform-specific URL resolution (web vs mobile)

## WebAppComponents (Shared Razor Class Library)

### Purpose

Reusable Blazor components and services shared between WebApp and HybridApp.

### Structure

```
src/WebAppComponents/
  Catalog/
    CatalogListItem.razor     – Product card component
    CatalogSearch.razor        – Search/filter UI
  Services/
    ICatalogService.cs         – Catalog API client interface
    CatalogService.cs          – HTTP implementation
    IProductImageUrlProvider.cs– Image URL abstraction
```

### Component Patterns

- Use `[Parameter, EditorRequired]` for required component parameters
- CSS isolation via `.razor.css` files co-located with components
- Components compose via `@inject` for services
- `CatalogService(HttpClient)` calls Catalog API v2 endpoints

### Adding New Shared Components

1. Create `.razor` file in appropriate subfolder of `src/WebAppComponents/`
2. Add CSS isolation file `.razor.css` if styling needed
3. Register any new services in the consuming app's DI setup
4. Both `WebApp` and `HybridApp` reference `WebAppComponents` as a project dependency

## HybridApp (.NET MAUI Blazor Hybrid)

- Shares components from `WebAppComponents`
- Connects via `mobile-bff` YARP proxy (not directly to APIs)
- Custom `ProductImageUrlProvider` resolves images through the BFF
- Catalog browsing only — no auth/basket/ordering
- Platform targets: iOS, Android, Windows, macOS

## ClientApp (.NET MAUI Native)

### Architecture: MVVM

```
src/ClientApp/
  Views/              – XAML pages
  ViewModels/         – 13 view models (CatalogViewModel, BasketViewModel, etc.)
  Services/           – Basket, Catalog, Order, Identity, Navigation, Settings, Theme
  Controls/           – Custom UI controls
  Converters/         – XAML value converters
  Animations/         – Custom animations
  Validations/        – Form input validation
```

- Auth: OIDC via `IdentityModel.OidcClient` with PKCE (client: `maui`)
- Full e-commerce flow: catalog, basket, checkout, order history, profile
- Services connect to APIs through service discovery / settings-configured endpoints

## WebhookClient (Blazor Server)

- Auth: OpenID Connect (client: `webhooksclient`, scope: `webhooks`)
- Registers webhook subscriptions with Webhooks.API
- Receives webhook callbacks at its own endpoint
- Stores received hooks in-memory (`HooksRepository`)
- Displays received hooks in Blazor UI

## Frontend Development Checklist

When adding a new frontend feature:

1. **Shared component?** → Add to `WebAppComponents` so both WebApp and HybridApp benefit
2. **API call?** → Create/extend a service in `Services/` with `HttpClient` or gRPC client
3. **Auth required?** → Use `[Authorize]` on page, ensure scope is registered in Identity.API
4. **New page?** → Place in `Components/Pages/{Feature}/` with `@page` directive
5. **Image URLs?** → Use `IProductImageUrlProvider` abstraction, not direct URLs
6. **Real-time updates?** → Follow `OrderStatusNotificationService` pattern (integration event subscriber)
