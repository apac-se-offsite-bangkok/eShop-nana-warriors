# Common Instructions — Shared Patterns & Infrastructure

## Architecture — Shared Libraries

The shared infrastructure layer provides cross-cutting concerns used by all services:

```
src/
  eShop.AppHost/         – Aspire orchestrator (wires all services + infra)
  eShop.ServiceDefaults/ – Health checks, OTEL, auth, service discovery, HTTP resilience
  EventBus/              – IEventBus, IntegrationEvent, IIntegrationEventHandler abstractions
  EventBusRabbitMQ/      – RabbitMQ implementation (exchange, routing, Polly retry, OTEL tracing)
  IntegrationEventLogEF/ – Transactional outbox pattern (EF-based event persistence)
  Shared/                – MigrateDbContextExtensions, ActivityExtensions (source-included, no .csproj)
```

**Dependency graph:**
```
All services → eShop.ServiceDefaults → OpenTelemetry, Health Checks, Service Discovery
Catalog/Ordering/Basket/Webhooks/Workers → EventBusRabbitMQ → EventBus (abstractions)
Catalog.API, Ordering.API → IntegrationEventLogEF (outbox)
All EF services → Shared/MigrateDbContextExtensions (auto-migration)
```

## .NET Aspire Orchestration

### AppHost ([src/eShop.AppHost/Program.cs](../../src/eShop.AppHost/Program.cs))

The AppHost wires all services, infrastructure, and dependencies:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

// Infrastructure
var redis = builder.AddRedis("redis");
var rabbitMq = builder.AddRabbitMQ("eventbus").WithLifetime(ContainerLifetime.Persistent);
var postgres = builder.AddPostgres("postgres")
    .WithImage("ankane/pgvector").WithLifetime(ContainerLifetime.Persistent);

// Databases (owned by respective services)
var catalogDb = postgres.AddDatabase("catalogdb");
var orderingDb = postgres.AddDatabase("orderingdb");

// Services reference their dependencies
var catalogApi = builder.AddProject<Projects.Catalog_API>("catalog-api")
    .WithReference(rabbitMq).WithReference(catalogDb);
```

- **Service names** → used for service discovery (e.g., `"catalog-api"`, `"basket-api"`)
- **`.WaitFor()`** → ensures dependency is healthy before starting (e.g., OrderProcessor waits for Ordering.API)
- **Container lifetime** → `Persistent` for infrastructure (survives restarts)

## Service Defaults ([src/eShop.ServiceDefaults/Extensions.cs](../../src/eShop.ServiceDefaults/Extensions.cs))

Two levels of service defaults:

| Method | Includes | Used By |
|--------|----------|---------|
| `AddServiceDefaults()` | Health checks, OTEL, service discovery, HTTP resilience (Polly) | Most services |
| `AddBasicServiceDefaults()` | Health checks, OTEL, service discovery only | Basket.API (no outgoing HTTP) |

### OpenTelemetry (configured for all services)

- **Logging**: Structured via OTLP exporter
- **Metrics**: ASP.NET, Kestrel, System.Net.Http, OpenAI
- **Tracing**: ASP.NET, gRPC, HTTP client, RabbitMQ (custom `ActivitySource`), OpenAI
- **Export**: OTLP to Aspire Dashboard

### Health Endpoints

```csharp
app.MapDefaultEndpoints();  // Maps /health (readiness) and /alive (liveness)
```

### Authentication Helper

```csharp
builder.AddDefaultAuthentication();  // JWT Bearer against Identity.API
```

## Event Bus

### Abstractions ([src/EventBus/](../../src/EventBus/))

```csharp
// Base event — all integration events inherit from this
public record IntegrationEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime CreationDate { get; } = DateTime.UtcNow;
}

// Handler contract
public interface IIntegrationEventHandler<in TEvent> where TEvent : IntegrationEvent
{
    Task Handle(TEvent @event);
}

// Publishing
public interface IEventBus
{
    Task PublishAsync(IntegrationEvent @event);
}
```

### RabbitMQ Implementation ([src/EventBusRabbitMQ/](../../src/EventBusRabbitMQ/))

- Exchange: `eshop_event_bus` (direct)
- Routing key: event type name (e.g., `OrderStartedIntegrationEvent`)
- One queue per consuming service (prefixed with assembly name)
- Polly resilience pipeline for retries
- Full OpenTelemetry `ActivitySource` with W3C trace context propagation
- Starts consuming as `IHostedService`

### Integration Event Log ([src/IntegrationEventLogEF/](../../src/IntegrationEventLogEF/))

Transactional outbox for Catalog.API and Ordering.API:

- `IntegrationEventLogEntry` — persisted event record with state tracking
- States: `NotPublished` → `InProgress` → `Published` / `PublishedFailed`
- Stored in the service's own database, same transaction as domain changes

## Shared Utilities ([src/Shared/](../../src/Shared/))

| Utility | Purpose |
|---------|---------|
| `ActivityExtensions.SetExceptionTags()` | Sets OTEL exception tags on `Activity` |
| `MigrateDbContextExtensions.AddMigration<TContext>()` | Auto-migration + seeding as `BackgroundService` |

Note: `Shared` is included as source files (no `.csproj`), referenced via `<Compile Include>`.

## Testing

### Unit Tests (MSTest + NSubstitute)

```csharp
[TestClass]
public class OrderAggregateTest
{
    [TestMethod]
    public void Create_order_item_success()
    {
        // Arrange
        var productId = 1;
        // Act
        var orderItem = new OrderItem(productId, "Product", 10.5m, 0, "pic.png", 5);
        // Assert
        Assert.IsNotNull(orderItem);
    }
}
```

- Framework: `MSTest.Sdk` project SDK
- Mocking: `NSubstitute` — `Substitute.For<T>()`, `.Returns()`, `Arg.Any<T>()`
- Assertions: `Assert.IsTrue()`, `Assert.ThrowsExactly<T>()`
- Parallelization: `[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]`

### Functional Tests (xUnit + Aspire TestHost)

```csharp
public class CatalogApiTests(CatalogApiFixture fixture) : IClassFixture<CatalogApiFixture>
{
    [Fact]
    public async Task GetCatalogItems_ReturnsOk()
    {
        var client = fixture.CreateClient();
        var response = await client.GetAsync("/api/catalog/items");
        response.EnsureSuccessStatusCode();
    }
}
```

- Framework: xUnit v3 with `Aspire.AppHost.Sdk`
- Spins up real PostgreSQL, Redis, RabbitMQ in Docker containers
- `WebApplicationFactory<Program>` for in-process HTTP testing
- **Requires Docker** to be running

### E2E Tests (Playwright)

```
e2e/
  BrowseItemTest.spec.ts   – Catalog browsing (no auth)
  AddItemTest.spec.ts      – Add to cart (auth required)
  RemoveItemTest.spec.ts   – Remove from cart (auth required)
  login.setup.ts           – Auth setup (stores session state)
```

- Base URL: `http://localhost:5045`
- Auth state persisted at `playwright/.auth/user.json`
- Credentials via env vars: `USERNAME1`, `PASSWORD`
- Config: [playwright.config.ts](../../playwright.config.ts)

## Coding Standards Enforcement

### Build-Time Enforcement ([Directory.Build.props](../../Directory.Build.props))

```xml
<TreatWarningsAsErrors>true</TreatWarningsAsErrors>   <!-- ALL warnings = errors -->
<ImplicitUsings>enable</ImplicitUsings>                <!-- SDK-provided global usings -->
<UseArtifactsOutput>true</UseArtifactsOutput>           <!-- Output to artifacts/ -->
<DebugType>embedded</DebugType>                         <!-- PDBs embedded in assemblies -->
<NoWarn>NU1901;NU1902;NU1903;NU1904</NoWarn>            <!-- Suppress NuGet transitive audit -->
```

**Impact**: Every compiler warning, SDK analyzer rule, and Roslyn diagnostic is a build error. New code must produce zero warnings.

### Analyzers

| Analyzer | Scope | Purpose |
|----------|-------|---------|
| .NET 10 SDK built-in analyzers | All projects | CA*/IDE* rules at default severity |
| `NSubstitute.Analyzers.CSharp` | Test projects only | Catches NSubstitute API misuse |
| `MSTestAnalysisMode=Recommended` | MSTest projects | MSTest best-practice rules |

No third-party style analyzers (no StyleCop, Roslynator, etc.). The SDK built-in analyzers + `TreatWarningsAsErrors` are the enforcement mechanism.

### Code Style ([.editorconfig](../../.editorconfig))

All style rules are `:silent` or `:suggestion` — they guide IDE behavior but don't break builds:

| Rule | Setting |
|------|---------|
| Indentation | 4 spaces (C#), 2 spaces (XML/csproj) |
| Charset | `utf-8-bom` |
| `var` usage | Prefer `var` everywhere |
| `this.` qualification | Never |
| Language keywords | Prefer `int` over `Int32` |
| Braces | Allman style (newline before `{`) |
| Braces presence | Always use braces |
| Modifier order | `public, private, protected, internal, static, ...` |
| Usings | Sort `System.*` first |
| Constants | PascalCase |
| Readonly fields | Mark `readonly` when possible |
| Pattern matching | Prefer `is`/`as` patterns |

### Nullable Reference Types

Enabled **per-project** (not globally):

| `<Nullable>enable</Nullable>` | No explicit `<Nullable>` (disabled) |
|-------------------------------|--------------------------------------|
| Catalog.API, WebApp, WebAppComponents, eShop.AppHost, eShop.ServiceDefaults, WebhookClient, HybridApp, ClientApp.UnitTests | Ordering.API, Ordering.Domain, Basket.API, Identity.API, Webhooks.API, EventBus, EventBusRabbitMQ, OrderProcessor, PaymentProcessor |

**When creating new projects**: Enable nullable (`<Nullable>enable</Nullable>`) for new code. When modifying existing projects, respect their current setting.

### Project-Level Warning Suppressions

Only these suppressions are acceptable:

| Project | `NoWarn` | Reason |
|---------|----------|--------|
| WebApp | `RZ10021` | Razor component attribute |
| ClientApp | `XC0103` | MAUI Xamarin compatibility |
| EventBus (code) | `IL2026`, `IL3050` | AOT/trimming via `#pragma` |
| EF Migrations | `612`, `618` | Auto-generated obsolete APIs |

Do **not** add new `<NoWarn>` entries or `#pragma warning disable` without justification.

### Test Project Standards ([tests/Directory.Build.props](../../tests/Directory.Build.props))

- Test SDK: `<Project Sdk="MSTest.Sdk">` for unit tests
- `MSTestAnalysisMode=Recommended` — enables recommended MSTest analyzer rules
- `UseMicrosoftTestingPlatformRunner=true` for xUnit projects
- `NSubstitute.Analyzers.CSharp` added to unit test projects
- Test runner: `Microsoft.Testing.Platform` (configured in [global.json](../../global.json))

## Package Management

- **Central Package Management**: All versions in [Directory.Packages.props](../../Directory.Packages.props)
- Project files use `<PackageReference Include="..." />` without `Version=`
- To add a package: add version to `Directory.Packages.props`, then reference in project `.csproj`
- Test packages (MSTest, xUnit, NSubstitute) have separate `tests/Directory.Build.props`

## Naming Conventions Summary

| Artifact | Pattern | Example |
|----------|---------|---------|
| Namespace | `eShop.{Project}.{Folder}` | `eShop.Ordering.API.Application.Commands` |
| API endpoints file | `{Service}Api.cs` | `CatalogApi.cs` |
| DI extensions | `Extensions.cs` in `Extensions/` | `builder.AddApplicationServices()` |
| Integration event | `{Description}IntegrationEvent` | `OrderStartedIntegrationEvent` |
| Event handler | `{EventName}Handler` | `OrderStartedIntegrationEventHandler` |
| Domain event | `{Description}DomainEvent` | `OrderStartedDomainEvent` |
| Command | `{Action}Command` | `CreateOrderCommand` |
| Command handler | `{Action}CommandHandler` | `CreateOrderCommandHandler` |
| Validator | `{Command}Validator` | `CreateOrderCommandValidator` |
| Query | `I{Entity}Queries` | `IOrderQueries` |
