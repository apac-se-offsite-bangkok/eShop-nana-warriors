---
name: create-aggregate
description: Scaffold a DDD aggregate root + child entities + repository
agent: agent
argument-hint: "Name and describe the aggregate, e.g.: Payment aggregate with payment methods"
tools:
  - search/changes
  - edit/editFiles
  - edit/createFile
  - search/codebase
---

Create a DDD aggregate root with child entities, repository interface, and repository implementation.

User wants: ${input:aggregate:Name and describe the aggregate, e.g. Payment aggregate tracking payment methods}

## What to generate

Model everything after the Order aggregate:

1. **Aggregate root** in `src/Ordering.Domain/AggregatesModel/{Name}Aggregate/` — follow [Order.cs](../../src/Ordering.Domain/AggregatesModel/OrderAggregate/Order.cs) exactly
2. **Child entities** in same folder — follow [OrderItem.cs](../../src/Ordering.Domain/AggregatesModel/OrderAggregate/OrderItem.cs)
3. **Value objects** if needed — follow [Address.cs](../../src/Ordering.Domain/AggregatesModel/OrderAggregate/Address.cs)
4. **Repository interface** in same folder — follow [IOrderRepository.cs](../../src/Ordering.Domain/AggregatesModel/OrderAggregate/IOrderRepository.cs)
5. **Repository implementation** in `src/Ordering.Infrastructure/Repositories/` — follow [OrderRepository.cs](../../src/Ordering.Infrastructure/Repositories/OrderRepository.cs)

## Follow these conventions

- Read [domain instructions](../../.github/instructions/csharp-domain.instructions.md) for all DDD rules
- Read [infrastructure instructions](../../.github/instructions/csharp-infrastructure.instructions.md) for repository patterns
- Read [aggregate template](../../.github/skills/cqrs-implementation/aggregate-template.md) for full structure
- Base types are in [SeedWork/](../../src/Ordering.Domain/SeedWork/)
