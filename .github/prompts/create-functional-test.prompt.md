---
name: create-functional-test
description: Scaffold xunit v3 functional tests for API endpoints
agent: agent
argument-hint: "Name the endpoint to test, e.g.: GET /api/orders"
tools:
  - search/changes
  - edit/editFiles
  - search/codebase
  - read/terminalLastCommand
---

Create xunit v3 functional tests for API endpoints.

Endpoint to test: ${input:endpoint:Describe the endpoint, e.g. GET /api/orders, POST /api/orders/cancel}

## What to generate

Model after the existing Ordering functional tests:

1. **Reuse existing fixture** [OrderingApiFixture.cs](../../tests/Ordering.FunctionalTests/OrderingApiFixture.cs) if testing Ordering endpoints. Create new fixture only if testing a different service.
2. **Add test methods** to [OrderingApiTests.cs](../../tests/Ordering.FunctionalTests/OrderingApiTests.cs) or create new test class using same pattern: `IClassFixture<OrderingApiFixture>`, `HttpClient`, `[Fact]` methods.

## Follow these conventions

- Read [test instructions](../../.github/instructions/csharp-tests.instructions.md) for xunit v3 rules
- Use `[Fact]` (not `[TestMethod]` — that's MSTest)
- Assert `HttpStatusCode`: `Assert.Equal(HttpStatusCode.OK, response.StatusCode)`
- Use `AutoAuthorizeMiddleware` for auth bypass
- After generating, run the tests to verify they pass
