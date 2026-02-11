# eShop Project — Copilot Instructions

## Project Overview

This is the **dotnet/eShop** reference application — a cloud-native microservices app built with .NET Aspire. It demonstrates CQRS, DDD, and event-driven architecture patterns.

## Technology Stack

- **.NET 10** (`net10.0`), C# with `ImplicitUsings` enabled
- **Aspire 13.1.0** for orchestration and service defaults
- **MediatR 13.0.0** for CQRS command dispatching and pipeline behaviors
- **FluentValidation 12.0.0** for command validation
- **EF Core (Npgsql) 10.0.0** for data persistence with PostgreSQL
- **RabbitMQ** for integration event messaging
- **gRPC** for inter-service communication (Basket)
- **MSTest 4.0.2** + **NSubstitute 5.3.0** for unit tests
- **xunit v3 3.2.1** for functional/integration tests

## Architecture Patterns

### CQRS (Ordering Service)
- **Commands** use MediatR (`IRequest<T>` → `IRequestHandler<T, R>`)
- **Queries** use dedicated interfaces (`IOrderQueries`) with EF Core directly — NOT MediatR
- Pipeline: `LoggingBehavior` → `ValidatorBehavior` → `TransactionBehavior` → Handler

### Simple Minimal API (Catalog, Basket)
- **Catalog.API**: Minimal API endpoints with `[AsParameters]` service class, direct `DbContext` access
- **Basket.API**: gRPC service with Redis-backed repository

### DDD (Ordering Domain)
- Aggregates extend `Entity` + implement `IAggregateRoot` marker
- Private collection fields with `IReadOnlyCollection<T>` properties
- Business logic in aggregate methods, not handlers (rich domain model)
- Domain events via `AddDomainEvent()` dispatched in `SaveEntitiesAsync()`

## Naming Conventions

| Element | Pattern | Example |
|---|---|---|
| Command | `{Verb}{Noun}Command` | `CreateOrderCommand`, `CancelOrderCommand` |
| Command Handler | `{CommandName}Handler` | `CreateOrderCommandHandler` |
| Identified Handler | `{CommandName}IdentifiedCommandHandler` | `CreateOrderIdentifiedCommandHandler` |
| Validator | `{CommandName}Validator` | `CancelOrderCommandValidator` |
| Domain Event | `{Description}DomainEvent` | `OrderStartedDomainEvent` |
| Domain Event Handler | `{DomainEventName}Handler` | `OrderCancelledDomainEventHandler` |
| Integration Event | `{Description}IntegrationEvent` | `OrderStartedIntegrationEvent` |
| Integration Event Handler | `{IntegrationEventName}Handler` | `GracePeriodConfirmedIntegrationEventHandler` |
| Query Interface | `I{Name}Queries` | `IOrderQueries` |
| Query Implementation | `{Name}Queries` | `OrderQueries` |
| View Model | descriptive `record` names | `OrderSummary`, `CardType` |
| Repository Interface | `I{Aggregate}Repository` | `IOrderRepository` |
| Namespace | `eShop.{ProjectName}` | `eShop.Ordering.API`, `eShop.Ordering.Domain` |
| Test Class | `{Subject}Test` | `OrderAggregateTest`, `NewOrderRequestHandlerTest` |

## Coding Standards

- Use `ArgumentNullException.ThrowIfNull` or `?? throw new ArgumentNullException(nameof(...))` for constructor guards
- Use primary constructors for simple DI (e.g., `OrderQueries(OrderingContext context)`)
- Use `record` types for integration events, view models, and simple commands
- Use `[DataContract]`/`[DataMember]` for complex immutable commands
- Use `TypedResults` with `Results<T1, T2>` union types in Minimal API endpoints
- Use `[AsParameters]` aggregated service classes for endpoint DI
- Use `[FromHeader(Name = "x-requestid")]` for idempotency request IDs
- Use `TreatWarningsAsErrors` (project-wide build setting)
- Use central package management via `Directory.Packages.props`

## Test Conventions

- **Unit Tests**: MSTest framework, NSubstitute for mocking (never Moq), `[TestClass]`/`[TestMethod]`, AAA pattern with `//Arrange //Act //Assert` comments
- **Functional Tests**: xunit v3, `IClassFixture<T>`, `WebApplicationFactory<Program>`, Aspire hosting
- Builder pattern for test data (see `tests/Ordering.UnitTests/Builders.cs`)
- Assert methods: `Assert.IsTrue()`, `Assert.ThrowsExactly<T>()`, `Assert.HasCount()`, `Assert.AreEqual()`
- Parallel execution: `[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]`

## Project Structure

```
src/{ServiceName}/
├── Apis/                          # Minimal API endpoint classes
├── Application/
│   ├── Behaviors/                 # MediatR pipeline behaviors
│   ├── Commands/                  # Command + Handler pairs
│   ├── DomainEventHandlers/       # INotificationHandler implementations
│   ├── IntegrationEvents/
│   │   ├── EventHandling/         # IIntegrationEventHandler implementations
│   │   └── Events/                # Integration event records
│   ├── Models/                    # DTOs and API models
│   ├── Queries/                   # Query interfaces, implementations, view models
│   └── Validations/               # FluentValidation validators
├── Extensions/                    # DI registration and extension methods
├── Infrastructure/                # EF Core context, seeds, services
└── Program.cs
```

## Key Files to Reference

- MediatR registration: [src/Ordering.API/Extensions/Extensions.cs](../../eShop-nana-warriors/src/Ordering.API/Extensions/Extensions.cs)
- Idempotency pattern: [src/Ordering.API/Application/Commands/IdentifiedCommand.cs](../../eShop-nana-warriors/src/Ordering.API/Application/Commands/IdentifiedCommand.cs)
- Domain base types: [src/Ordering.Domain/SeedWork/](../../eShop-nana-warriors/src/Ordering.Domain/SeedWork/)
- Integration event base: [src/EventBus/Events/IntegrationEvent.cs](../../eShop-nana-warriors/src/EventBus/Events/IntegrationEvent.cs)
- API endpoint pattern: [src/Ordering.API/Apis/OrdersApi.cs](../../eShop-nana-warriors/src/Ordering.API/Apis/OrdersApi.cs)
