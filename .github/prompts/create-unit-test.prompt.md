---
name: create-unit-test
description: Scaffold MSTest unit tests with NSubstitute mocking
agent: agent
argument-hint: "Name the class to test, e.g.: CancelOrderCommandHandler"
tools:
  - search/changes
  - edit/editFiles
  - search/codebase
  - read/terminalLastCommand
  - edit/createFile
---

Create MSTest unit tests for a class. Use NSubstitute for mocking (NEVER Moq).

Class to test: ${input:class:Name the class to test, e.g. CancelOrderCommandHandler, Order aggregate}

## What to generate

Read the class under test first, then generate tests modeled after:
- Handler tests → like [NewOrderCommandHandlerTest.cs](../../tests/Ordering.UnitTests/Application/NewOrderCommandHandlerTest.cs)
- Domain tests → like [OrderAggregateTest.cs](../../tests/Ordering.UnitTests/Domain/OrderAggregateTest.cs)
- Identified handler tests → like [IdentifiedCommandHandlerTest.cs](../../tests/Ordering.UnitTests/Application/IdentifiedCommandHandlerTest.cs)
- Reuse existing [Builders.cs](../../tests/Ordering.UnitTests/Builders.cs) for test data

Place handler tests in `tests/Ordering.UnitTests/Application/`, domain tests in `tests/Ordering.UnitTests/Domain/`.

## Follow these conventions

- Read [test instructions](../../.github/instructions/csharp-tests.instructions.md) for all assertion and mocking rules
- Read [unit test template](../../.github/skills/cqrs-implementation/unit-test-template.md) for structure
- Always use `//Arrange //Act //Assert` comments
- After generating, run the tests to verify they pass
