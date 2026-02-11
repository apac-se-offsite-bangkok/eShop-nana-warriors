# AGENTS.md — Copilot Coding Agent Instructions for eShop

> This file tells GitHub Copilot (and other AI coding agents) how to build, test,
> navigate, and contribute to the **eShop** reference application.

---

## 1. Project Overview

eShop is a reference .NET e-commerce application built with **.NET Aspire** using a
**services-based architecture**. It demonstrates best practices for building
cloud-native, microservices-style applications with .NET.

| Key Fact              | Value                                          |
|-----------------------|------------------------------------------------|
| Target Framework      | `net10.0`                                      |
| SDK Version           | `.NET 10.0.100` (see `global.json`)            |
| Aspire Version        | `13.1.0`                                       |
| Solution File         | `eShop.slnx` (full) / `eShop.Web.slnf` (web)  |
| Package Management    | Central — `Directory.Packages.props`           |
| Build Warnings        | `TreatWarningsAsErrors = true`                 |
| Artifacts Output      | `UseArtifactsOutput = true`                    |

---

## 2. Build Commands

### Build the full solution (excluding MAUI/mobile)

```bash
dotnet build eShop.Web.slnf
```

### Build the entire solution (includes MAUI — requires MAUI workload)

```bash
dotnet build eShop.slnx
```

### Build a specific project

```bash
dotnet build src/Catalog.API/Catalog.API.csproj
```

### Run the application (requires Docker Desktop running)

```bash
dotnet run --project src/eShop.AppHost/eShop.AppHost.csproj
```

> **Important**: Docker Desktop must be running. The AppHost orchestrates
> PostgreSQL (pgvector), Redis, and RabbitMQ containers automatically.

---

## 3. Test Commands

### Run all tests (web projects only — recommended)

```bash
dotnet test eShop.Web.slnf
```

### Run all tests (full solution, requires MAUI workload)

```bash
dotnet test eShop.slnx
```

### Run a specific test project

```bash
dotnet test tests/Basket.UnitTests
dotnet test tests/Ordering.UnitTests
dotnet test tests/Catalog.FunctionalTests
dotnet test tests/Ordering.FunctionalTests
```

### Test frameworks in use

| Test Project                    | Framework     | Type        | Notes                                      |
|---------------------------------|---------------|-------------|---------------------------------------------|
| `Basket.UnitTests`              | MSTest 4.x    | Unit        | Uses NSubstitute for mocking                |
| `Ordering.UnitTests`            | MSTest 4.x    | Unit        | Uses NSubstitute for mocking                |
| `ClientApp.UnitTests`           | MSTest 4.x    | Unit        | Requires MAUI workload                      |
| `Catalog.FunctionalTests`       | xUnit v3      | Functional  | Spins up real PostgreSQL via Aspire TestHost |
| `Ordering.FunctionalTests`      | xUnit v3      | Functional  | Spins up real PostgreSQL via Aspire TestHost |

### Key testing conventions

- **Mocking**: Use **NSubstitute** (not Moq) — already referenced in unit test projects.
- **Unit tests** use `MSTest.Sdk` with `Microsoft.Testing.Platform` runner.
- **Functional tests** use `xunit.v3.mtp-v2` with the **Aspire AppHost SDK** to spin up real infrastructure (PostgreSQL containers).
- **Test runner**: `Microsoft.Testing.Platform` (configured in `global.json`).
- Test analysis mode: `MSTestAnalysisMode = Recommended` (see `tests/Directory.Build.props`).

### E2E tests (Playwright — TypeScript)

```bash
npx playwright install chromium
npx playwright test
```

- Tests live in the `e2e/` directory.
- Base URL: `http://localhost:5045` (WebApp must be running via AppHost).
- Auth credentials come from `TEST_USER` and `TEST_PASSWORD` env vars.
- For CI, set `ESHOP_USE_HTTP_ENDPOINTS=1` to force HTTP (no TLS).

---

## 4. Project Structure

```
eShop/
├── src/                          # All source projects
│   ├── eShop.AppHost/            # .NET Aspire orchestrator (startup project)
│   ├── eShop.ServiceDefaults/    # Shared service configuration (auth, telemetry, health)
│   ├── Basket.API/               # Basket microservice (gRPC + REST)
│   ├── Catalog.API/              # Product catalog microservice (REST)
│   ├── Ordering.API/             # Order management microservice (REST)
│   ├── Ordering.Domain/          # Ordering domain model (DDD)
│   ├── Ordering.Infrastructure/  # Ordering data access (EF Core)
│   ├── OrderProcessor/           # Background worker — processes orders
│   ├── PaymentProcessor/         # Background worker — processes payments
│   ├── Identity.API/             # Authentication (Duende IdentityServer)
│   ├── WebApp/                   # Blazor Server frontend (Razor Components)
│   ├── WebAppComponents/         # Shared Blazor/Razor components
│   ├── HybridApp/                # Blazor Hybrid (MAUI)
│   ├── ClientApp/                # .NET MAUI mobile client
│   ├── WebhookClient/            # Webhook consumer
│   ├── Webhooks.API/             # Webhook management service
│   ├── EventBus/                 # Event bus abstractions
│   ├── EventBusRabbitMQ/         # RabbitMQ event bus implementation
│   ├── IntegrationEventLogEF/    # Integration event logging (EF Core)
│   └── Shared/                   # Shared DTOs and contracts
├── tests/                        # All test projects
│   ├── Basket.UnitTests/
│   ├── Ordering.UnitTests/
│   ├── Catalog.FunctionalTests/
│   ├── Ordering.FunctionalTests/
│   └── ClientApp.UnitTests/
├── e2e/                          # Playwright end-to-end tests (TypeScript)
├── build/                        # Build scripts (ACR, multiarch)
├── Directory.Build.props         # Global MSBuild properties
├── Directory.Build.targets       # Global MSBuild targets
├── Directory.Packages.props      # Central package version management
├── global.json                   # SDK version pinning
├── eShop.slnx                    # Full solution (all projects)
├── eShop.Web.slnf                # Filtered solution (excludes MAUI)
└── playwright.config.ts          # Playwright E2E configuration
```

---

## 5. Service Architecture

### Microservices

| Service            | Type                    | Port  | Database        | Messaging |
|--------------------|-------------------------|-------|-----------------|-----------|
| **Catalog.API**    | REST API                | —     | PostgreSQL (pgvector) | RabbitMQ |
| **Basket.API**     | REST + gRPC             | —     | Redis           | RabbitMQ  |
| **Ordering.API**   | REST API                | —     | PostgreSQL      | RabbitMQ  |
| **Identity.API**   | OpenID Connect (Duende) | —     | PostgreSQL      | —         |
| **OrderProcessor** | Background worker       | —     | PostgreSQL      | RabbitMQ  |
| **PaymentProcessor** | Background worker     | —     | —               | RabbitMQ  |
| **WebApp**         | Blazor Server           | 5045  | —               | RabbitMQ  |
| **Webhooks.API**   | REST API                | —     | PostgreSQL      | RabbitMQ  |
| **WebhookClient**  | Web app                 | —     | —               | —         |

### Infrastructure (managed by AppHost)

| Resource       | Image / Type                | Purpose                              |
|----------------|-----------------------------|--------------------------------------|
| PostgreSQL     | `ankane/pgvector:latest`    | 4 databases: catalog, identity, ordering, webhooks |
| Redis          | Container (persistent)      | Basket session storage               |
| RabbitMQ       | Container (persistent)      | Async event bus for integration events |
| OpenAI         | Optional (Azure/OpenAI/Ollama) | AI features in Catalog + WebApp   |

### Inter-service communication patterns

- **Synchronous**: REST (HTTP) and gRPC between services.
- **Asynchronous**: RabbitMQ for integration events (pub/sub).
- **Service discovery**: .NET Aspire built-in service discovery.
- **Auth**: JWT Bearer tokens issued by Identity.API (Duende IdentityServer).

---

## 6. Coding Conventions

### C# style (from `.editorconfig`)

- **Indentation**: 4 spaces for C#/VB, 2 spaces for XML/JSON project files.
- **Charset**: `utf-8-bom` for C# files.
- **Usings**: Sort `System.*` first (`dotnet_sort_system_directives_first = true`).
- **`this.` qualification**: Do not use (`false:silent` for fields, properties, methods, events).
- **Type references**: Prefer language keywords (`int` over `Int32`).
- **`var` usage**: Allowed everywhere (`csharp_style_var_*: true:silent`).
- **Braces**: Preferred but not enforced (`csharp_prefer_braces = true:silent`).
- **Readonly fields**: Preferred (`dotnet_style_readonly_field = true:suggestion`).
- **Constants**: PascalCase naming.
- **Modifier order**: `public, private, protected, internal, static, extern, new, virtual, abstract, sealed, override, readonly, unsafe, volatile, async`.
- **New lines**: Before open braces (all kinds), before `else`, `catch`, `finally`.
- **Final newline**: Insert at end of file.

### Project conventions

- **Central package management**: All NuGet package versions are declared in `Directory.Packages.props`. Never add `Version=` attributes in `.csproj` files — use `<PackageReference Include="..." />` only.
- **Global usings**: Each project has a `GlobalUsings.cs` file.
- **Implicit usings**: Enabled globally (`<ImplicitUsings>enable</ImplicitUsings>`).
- **Warnings as errors**: All warnings are errors (`TreatWarningsAsErrors = true`). Fix all warnings before submitting.

---

## 7. Key Files to Understand

| File | Purpose |
|------|---------|
| `src/eShop.AppHost/Program.cs` | Aspire orchestration — defines all services, databases, and dependencies |
| `src/eShop.AppHost/Extensions.cs` | Helper methods for forwarded headers, OpenAI config, YARP mobile BFF routes |
| `src/eShop.ServiceDefaults/` | Shared configuration: auth, telemetry, health checks, resilience |
| `Directory.Build.props` | Global MSBuild properties (warnings-as-errors, artifacts output) |
| `Directory.Packages.props` | All NuGet package versions (central management) |
| `global.json` | .NET SDK version pinning and test runner config |
| `.editorconfig` | Code style rules |

---

## 8. Common Patterns

### Adding a new API endpoint (e.g., to Catalog.API)

1. Define the endpoint in `src/Catalog.API/Apis/CatalogApi.cs` using minimal API style.
2. DTOs and models go in `src/Catalog.API/Model/`.
3. Register the endpoint mapping in `Program.cs`.
4. Add corresponding unit or functional tests.

### Adding an integration event

1. Define the event record in the service's `IntegrationEvents/Events/` folder.
2. Create an event handler in `IntegrationEvents/EventHandling/`.
3. Register the handler in the service's `Program.cs` via the event bus.
4. The `EventBus` project has the base abstractions; `EventBusRabbitMQ` is the implementation.

### Adding a new service

1. Create the project under `src/`.
2. Reference `eShop.ServiceDefaults` for shared configuration.
3. Register in `src/eShop.AppHost/Program.cs` with appropriate dependencies.
4. Add the project to `eShop.slnx` and `eShop.Web.slnf`.
5. Add test project(s) under `tests/`.

### Data access

- Uses **Entity Framework Core** with **PostgreSQL** (Npgsql provider).
- The Catalog service uses **pgvector** for vector similarity search.
- Migrations live alongside each service's `Infrastructure/` folder.
- Connection strings are managed by Aspire service discovery (no hardcoded strings).

---

## 9. PR Guidelines

When submitting pull requests:

1. **Build must pass**: `dotnet build eShop.Web.slnf` with zero warnings (warnings are errors).
2. **Tests must pass**: `dotnet test eShop.Web.slnf`.
3. **Follow existing patterns**: Match the coding style in `.editorconfig` and existing code.
4. **Keep PRs focused**: One logical change per PR.
5. **Include tests**: Add unit tests for new logic; add functional tests for new API endpoints.
6. **Central packages**: Add new package versions to `Directory.Packages.props`, not individual `.csproj` files.
7. **No `this.` qualifier**: Follow the project convention of omitting `this.`.
8. **Sort usings**: `System.*` namespaces first.

---

## 10. Environment & Prerequisites

| Prerequisite       | Required For       | Install Command / Notes                     |
|--------------------|--------------------|----------------------------------------------|
| .NET 10 SDK        | Everything         | `dotnet-install` or [dot.net/download](https://dot.net/download) |
| Docker Desktop     | Running AppHost    | Must be running before `dotnet run`          |
| Node.js (LTS)      | E2E tests only     | For Playwright                               |
| MAUI workload      | Mobile projects    | `dotnet workload install maui`               |

### Environment variables

| Variable                    | Purpose                                      |
|-----------------------------|----------------------------------------------|
| `ESHOP_USE_HTTP_ENDPOINTS`  | Set to `1` to force HTTP (for CI/Playwright) |
| `TEST_USER`                 | E2E test login username                      |
| `TEST_PASSWORD`             | E2E test login password                      |

---

## 11. CI Workflow

The GitHub Actions workflow at `.github/workflows/build-and-test.yml` runs on pushes
to `main`, `develop`, and `copilot/**` branches, and on PRs to `main`/`develop`.

**Critical**: The workflow **must** use .NET 10 SDK (with `dotnet-quality: 'preview'`)
to match the project's `global.json` requirement of SDK `10.0.100`. Using an older SDK
(e.g., .NET 8) will cause zero tests to run and 4 errors because the test assemblies
won't be built for the correct target framework.

```yaml
- name: Setup .NET 10
  uses: actions/setup-dotnet@v4
  with:
    dotnet-version: '10.0.x'
    dotnet-quality: 'preview'
```

---

## 12. Troubleshooting

| Problem | Solution |
|---------|----------|
| Build fails on MAUI projects | Use `eShop.Web.slnf` instead of `eShop.slnx`, or install MAUI workload |
| Docker errors on AppHost start | Ensure Docker Desktop is running |
| Functional tests fail | Docker must be running (tests spin up PostgreSQL containers) |
| `TreatWarningsAsErrors` failures | Fix all warnings — they are treated as errors in this repo |
| Package version conflicts | Update versions only in `Directory.Packages.props` |
| E2E tests fail on HTTPS | Set `ESHOP_USE_HTTP_ENDPOINTS=1` |
| CI: "Zero tests ran" with errors | SDK version mismatch — ensure CI uses .NET 10.x (not 8.x). See `global.json` |

---

## 13. Quick Reference for Agents

```bash
# Validate a change end-to-end
dotnet build eShop.Web.slnf && dotnet test eShop.Web.slnf

# Run just unit tests (fast)
dotnet test tests/Basket.UnitTests && dotnet test tests/Ordering.UnitTests

# Run functional tests (needs Docker)
dotnet test tests/Catalog.FunctionalTests && dotnet test tests/Ordering.FunctionalTests

# Start the full application
dotnet run --project src/eShop.AppHost/eShop.AppHost.csproj
```
