---
name: 'Test Standards'
description: 'MSTest unit test and xunit v3 functional test conventions for eShop projects'
applyTo: 'tests/**/*.cs'
---

# Test Coding Standards

## Unit Tests (MSTest + NSubstitute)

### Framework
- **MSTest 4.0.2** — `[TestClass]`, `[TestMethod]`
- **NSubstitute 5.3.0** for mocking — **NEVER use Moq**
- Parallel: `[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]`

### Class Structure
- Name: `{Subject}Test` (e.g., `OrderAggregateTest`, `NewOrderRequestHandlerTest`)
- Constructor initializes NSubstitute mocks via `Substitute.For<T>()`
- Use `Fake{Type}()` helper methods for test data creation

### Test Method Pattern
- Name: underscore-separated descriptive (e.g., `Handle_returns_false_if_order_is_not_persisted`)
- ALWAYS use AAA comments:
```csharp
[TestMethod]
public async Task Handle_returns_true_when_saved()
{
    //Arrange
    var mock = Substitute.For<IRepository>();
    mock.UnitOfWork.SaveChangesAsync(default).Returns(Task.FromResult(1));

    //Act
    var handler = new CommandHandler(mock);
    var result = await handler.Handle(command, CancellationToken.None);

    //Assert
    Assert.IsTrue(result);
}
```

### Assertions — Use These Exact Methods
- `Assert.IsTrue(value)` / `Assert.IsFalse(value)` — booleans
- `Assert.IsNotNull(value)` — existence
- `Assert.ThrowsExactly<TException>(() => action)` — exception testing (NOT `ThrowsException`)
- `Assert.HasCount(expected, collection)` — collection count
- `Assert.AreEqual(expected, actual)` — equality
- `Assert.AreSame(expected, actual)` — reference equality
- `Assert.IsInstanceOfType<T>(value)` — type verification

### NSubstitute Patterns
```csharp
// Create mock
var mock = Substitute.For<IOrderRepository>();

// Setup returns
mock.GetAsync(Arg.Any<int>()).Returns(Task.FromResult(fakeOrder));
mock.UnitOfWork.SaveChangesAsync(default).Returns(Task.FromResult(1));

// Verify calls
await mock.Received().GetAsync(Arg.Any<int>());
await mock.DidNotReceive().GetAsync(42);
```

### Test Builders
Place in `Builders.cs` in the test project root:
```csharp
public class OrderBuilder
{
    private readonly Order order;
    public OrderBuilder(Address address)
    {
        order = new Order("userId", "fakeName", address, 5, "12", "123", "name", DateTime.UtcNow);
    }
    public OrderBuilder AddOne(int productId, string name, decimal price, decimal discount, string url, int units = 1)
    {
        order.AddOrderItem(productId, name, price, discount, url, units);
        return this;
    }
    public Order Build() => order;
}
```

## Functional Tests (xunit v3)

### Framework
- **xunit v3** (`xunit.v3.mtp-v2`) — `[Fact]`, `[Theory]`
- `IClassFixture<TFixture>` for shared test infrastructure
- `IAsyncLifetime` for async setup/teardown

### Fixture Pattern
- `WebApplicationFactory<Program>` with `WithWebHostBuilder` overrides
- `AutoAuthorizeMiddleware` to bypass authentication
- Infrastructure via Aspire `DistributedApplication` (PostgreSQL, RabbitMQ)

### Test Pattern
```csharp
public class OrderingApiTests : IClassFixture<OrderingApiFixture>
{
    private readonly HttpClient _client;
    public OrderingApiTests(OrderingApiFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task GetAllStoredOrdersWorks()
    {
        var response = await _client.GetAsync("/api/orders");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
```

### Rules
- Use `ApiVersionHandler` for API versioning in HTTP requests
- Assert `HttpStatusCode` on responses
- Deserialize with `JsonSerializer.Deserialize<T>()` for body verification
- Tests have `InternalsVisibleTo` access from the API project
