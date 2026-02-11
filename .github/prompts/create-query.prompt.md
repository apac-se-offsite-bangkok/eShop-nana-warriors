---
name: create-query
description: Scaffold a query interface + implementation + view models (NO MediatR)
agent: agent
argument-hint: "Name the entity to query, e.g.: buyer payments"
tools:
  - search/changes
  - edit/editFiles
  - search/codebase
  - edit/createFile
---

Create a query interface, implementation, and view model records in `src/Ordering.API/Application/Queries/`.

**Queries do NOT use MediatR.** Use EF Core DbContext directly.

User wants to query: ${input:entity:Name the entity to query, e.g. buyer, payment}

## What to generate

1. **Interface** — like [IOrderQueries.cs](../../src/Ordering.API/Application/Queries/IOrderQueries.cs): async methods returning view model records
2. **Implementation** — like [OrderQueries.cs](../../src/Ordering.API/Application/Queries/OrderQueries.cs): primary constructor injecting `OrderingContext`, EF Core LINQ, throw `KeyNotFoundException` when not found
3. **View models** — like [OrderViewModel.cs](../../src/Ordering.API/Application/Queries/OrderViewModel.cs): `record` types with `{ get; init; }` properties. Create Detail + Summary records.

## Follow these conventions

- Read [query template](../../.github/skills/cqrs-implementation/query-template.md) for full structure
- Return mapped `record` view models — NEVER return domain entities
- Use primary constructor: `public class XQueries(OrderingContext context) : IXQueries`
- Remind the user to register in [Extensions.cs](../../src/Ordering.API/Extensions/Extensions.cs): `services.AddScoped<IXQueries, XQueries>();`
