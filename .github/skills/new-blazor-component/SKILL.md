---
name: new-blazor-component
description: Create new Blazor components, pages, and services for the eShop application. Use when adding UI features to WebApp (Blazor Server), WebAppComponents (shared Razor Class Library), or creating new pages with routing, forms, authentication, and CSS isolation. Covers shared vs app-specific component placement, service layer with HttpClient/gRPC, DI registration, and data model records.
---

# New Blazor Component

Create Blazor components and pages following eShop conventions.

## Placement Decision

- **Shared component** (WebApp + HybridApp) → `src/WebAppComponents/{Feature}/`
- **App-specific component** (WebApp only) → `src/WebApp/Components/`
- **New page** → `src/WebApp/Components/Pages/{Feature}/`

## Component Creation

### Shared Component

```razor
@using eShop.WebAppComponents.Catalog
@inject ICatalogService CatalogService

<div class="my-component">
    @* Component markup *@
</div>

@code {
    [Parameter, EditorRequired]
    public required CatalogItem Item { get; set; }

    [Parameter]
    public bool OptionalParam { get; set; }

    [Parameter]
    public EventCallback<CatalogItem> OnItemSelected { get; set; }
}
```

### New Page

```razor
@page "/my-route"
@page "/my-route/{id:int}"
@using eShop.WebAppComponents.Catalog
@inject CatalogService CatalogService
@inject NavigationManager Nav
@attribute [StreamRendering]
@* @attribute [Authorize]  — add if auth required *@

<PageTitle>Page Title</PageTitle>

@if (data is null)
{
    <p>Loading...</p>
}
else
{
    @* Page content *@
}

@code {
    [Parameter]
    public int Id { get; set; }

    [SupplyParameterFromQuery]
    public int? Page { get; set; }

    [SupplyParameterFromForm]
    public string? FormField { get; set; }

    [CascadingParameter]
    public HttpContext? HttpContext { get; set; }

    private CatalogResult? data;

    protected override async Task OnInitializedAsync()
    {
        data = await CatalogService.GetCatalogItems(Page.GetValueOrDefault(0), 9, null, null);
    }
}
```

## CSS Isolation

Co-locate `.razor.css` alongside the component:

```css
.my-component {
    display: flex;
    gap: 1rem;
}

::deep .child-element {
    color: var(--neutral-foreground-rest);
}
```

## Service Layer

For detailed service patterns, see [references/service-patterns.md](references/service-patterns.md).

### Quick Reference

- Interface in `src/WebAppComponents/Services/`
- Implementation uses primary constructor: `public class MyService(HttpClient httpClient)`
- Data models as records: `public record MyItem(int Id, string Name, decimal Price);`
- Register in `src/WebApp/Extensions/Extensions.cs` inside `AddApplicationServices()`

### DI Registration

```csharp
// HTTP client with service discovery + versioning + auth
builder.Services.AddHttpClient<MyService>(o => o.BaseAddress = new("https+http://my-api"))
    .AddApiVersion(1.0)
    .AddAuthToken();

// gRPC client
builder.Services.AddGrpcClient<MyGrpc.MyGrpcClient>(o => o.Address = new("http://my-api"))
    .AddAuthToken();

// Scoped (per-circuit): builder.Services.AddScoped<MyStateService>();
// Singleton: builder.Services.AddSingleton<IMyService, MyService>();
```

## Conventions

- `[Parameter, EditorRequired]` + `required` for mandatory params
- `[Parameter]` only for optional params
- `@attribute [StreamRendering]` on data-loading pages
- `@attribute [Authorize]` on auth-required pages
- `@inject` for service injection in components
- Image URLs via `IProductImageUrlProvider`
- Forms use `<AntiforgeryToken />` and `@formname`
- `var` for all local variables
- File-scoped namespace: `namespace eShop.{Project}.{Folder};`
- Zero warnings (`TreatWarningsAsErrors=true`)
