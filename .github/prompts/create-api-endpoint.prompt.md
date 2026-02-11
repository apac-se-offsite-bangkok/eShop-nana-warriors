---
name: create-api-endpoint
description: Scaffold a Minimal API endpoint + services class
agent: agent
argument-hint: "Name the resource and HTTP methods, e.g.: payments with GET and POST"
tools:
  - search/changes
  - edit/editFiles
  - edit/createFile
  - search/codebase
---

Create a Minimal API endpoint class and its services class in `src/Ordering.API/Apis/`.

User wants: ${input:resource:Name the resource and methods, e.g. payments with GET, POST, PUT}

## What to generate

Model everything after the Orders API:

1. **Services class** — like [OrderServices.cs](../../src/Ordering.API/Apis/OrderServices.cs): primary constructor with `IMediator`, `IXQueries`, `IIdentityService`, `ILogger`
2. **API class** — like [OrdersApi.cs](../../src/Ordering.API/Apis/OrdersApi.cs): static class, `MapXApiV1()` extension method, static handler methods
3. **Tell the user** to register `app.MapXApiV1();` in `Program.cs`

## Key patterns from OrdersApi.cs

- **GET** endpoints use queries directly (no MediatR): `Results<Ok<T>, NotFound>`
- **POST/PUT** endpoints: `[FromHeader(Name = "x-requestid")] Guid requestId`, wrap in `IdentifiedCommand<T, bool>`, return `Results<Ok, BadRequest<string>, ProblemHttpResult>`
- Use `[AsParameters] XServices services` for DI
- Use `TypedResults.Ok()`, `.BadRequest()`, `.Problem()`

## Follow these conventions

- Read [api endpoint template](../../.github/skills/cqrs-implementation/api-endpoint-template.md)
