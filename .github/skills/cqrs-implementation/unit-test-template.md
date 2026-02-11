# Unit Test Template (MSTest + NSubstitute)

## File placement

- Handler tests: `tests/{Service}.UnitTests/Application/{Subject}Test.cs`
- Domain tests: `tests/{Service}.UnitTests/Domain/{Subject}Test.cs`
- Builders: `tests/{Service}.UnitTests/Builders.cs`

Framework: MSTest 4.0.2 | Mocking: NSubstitute 5.3.0 (NEVER Moq)

## Command Handler Test

```csharp
using eShop.{Service}.API.Application.Commands;
using eShop.{Service}.Domain.AggregatesModel.{Aggregate}Aggregate;

namespace eShop.{Service}.UnitTests.Application;

[TestClass]
public class {Verb}{Noun}CommandHandlerTest
{
    private readonly I{Aggregate}Repository _{aggregate}RepositoryMock;

    public {Verb}{Noun}CommandHandlerTest()
    {
        _{aggregate}RepositoryMock = Substitute.For<I{Aggregate}Repository>();
    }

    [TestMethod]
    public async Task Handle_returns_true_when_entity_saved_successfully()
    {
        //Arrange
        var fakeEntity = Fake{Aggregate}();
        _{aggregate}RepositoryMock.GetAsync(Arg.Any<int>())
            .Returns(Task.FromResult(fakeEntity));
        _{aggregate}RepositoryMock.UnitOfWork.SaveEntitiesAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(true));

        var command = new {Verb}{Noun}Command(/* params */);

        //Act
        var handler = new {Verb}{Noun}CommandHandler(_{aggregate}RepositoryMock);
        var result = await handler.Handle(command, CancellationToken.None);

        //Assert
        Assert.IsTrue(result);
    }

    [TestMethod]
    public async Task Handle_returns_false_when_entity_not_found()
    {
        //Arrange
        _{aggregate}RepositoryMock.GetAsync(Arg.Any<int>())
            .Returns(Task.FromResult<{Aggregate}>(null));

        var command = new {Verb}{Noun}Command(/* params */);

        //Act
        var handler = new {Verb}{Noun}CommandHandler(_{aggregate}RepositoryMock);
        var result = await handler.Handle(command, CancellationToken.None);

        //Assert
        Assert.IsFalse(result);
    }

    private {Aggregate} Fake{Aggregate}()
    {
        return new {Aggregate}(/* minimal valid constructor params */);
    }
}
```

## Domain Aggregate Test

```csharp
namespace eShop.{Service}.UnitTests.Domain;

[TestClass]
public class {Aggregate}AggregateTest
{
    [TestMethod]
    public void Create_entity_success()
    {
        //Arrange
        var param = "validValue";

        //Act
        var entity = new {Aggregate}(param);

        //Assert
        Assert.IsNotNull(entity);
    }

    [TestMethod]
    public void Invalid_param_throws_domain_exception()
    {
        //Act - Assert
        Assert.ThrowsExactly<OrderingDomainException>(() => new {Child}(/* invalid params */));
    }

    [TestMethod]
    public void New_entity_raises_domain_event()
    {
        //Arrange
        var expectedResult = 1;

        //Act
        var entity = new {Aggregate}(/* valid params */);

        //Assert
        Assert.HasCount(expectedResult, entity.DomainEvents);
    }
}
```

## Builder Pattern (add to `Builders.cs`)

```csharp
public class {Aggregate}Builder
{
    private readonly {Aggregate} entity;

    public {Aggregate}Builder()
    {
        entity = new {Aggregate}(/* default values */);
    }

    public {Aggregate}Builder AddOne(/* item params */)
    {
        entity.AddItem(/* params */);
        return this;
    }

    public {Aggregate} Build() => entity;
}
```
