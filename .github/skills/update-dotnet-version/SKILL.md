---
name: update-dotnet-version
description: Update the .NET SDK version, target framework monikers (TFMs), Aspire SDK, and all related package versions across the eShop codebase. Use when upgrading from one .NET major version to another (e.g., net10.0 → net11.0), bumping the Aspire orchestrator version, or updating ASP.NET Core / EF Core / Extensions package versions. Covers global.json, Directory.Packages.props, all csproj files (including MAUI multi-target), devcontainer, CI/CD workflows, and documentation.
---

# Update .NET Version

Perform a coordinated .NET version bump across the entire eShop codebase. This is a multi-file, multi-layer operation — every touchpoint must be updated atomically to avoid build failures.

## Pre-flight Checklist

Before starting, determine these values from the user:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `NEW_SDK_VERSION` | `11.0.100` | .NET SDK version for `global.json` |
| `NEW_TFM` | `net11.0` | Target framework moniker |
| `OLD_TFM` | `net10.0` | Current TFM to replace |
| `NEW_ASPNET_VERSION` | `11.0.0` | ASP.NET Core package version |
| `NEW_EXTENSIONS_VERSION` | `11.1.0` | Microsoft.Extensions.* version |
| `NEW_ASPIRE_VERSION` | `14.0.0` | .NET Aspire stable version |
| `NEW_ASPIRE_UNSTABLE_VERSION` | `14.0.0-preview.1.xxxxx.x` | Aspire preview packages version |
| `NEW_EF_VERSION` | `11.0.0` | Npgsql.EntityFrameworkCore.PostgreSQL version |
| `ALLOW_PRERELEASE` | `true` or `false` | Whether SDK allows prerelease |

If the user only specifies the major version (e.g., "upgrade to .NET 11"), infer sensible defaults:
- SDK: `{major}.0.100`
- TFM: `net{major}.0`
- ASP.NET packages: `{major}.0.0`
- Extensions: `{major}.1.0`
- Leave Aspire, gRPC, Duende, and third-party versions unchanged unless the user explicitly provides new versions

## Update Sequence

Execute updates in this exact order. Verify the build compiles after all changes.

### Step 1: SDK Version — `global.json`

Update the SDK version and prerelease flag:

```json
{
  "sdk": {
    "version": "{NEW_SDK_VERSION}",
    "rollForward": "latestFeature",
    "allowPrerelease": {ALLOW_PRERELEASE}
  }
}
```

Also review `msbuild-sdks` entries (e.g., `MSTest.Sdk`) — update if a new version is required for the new SDK.

### Step 2: Central Package Versions — `Directory.Packages.props`

This file controls ALL package versions via central package management. Update these categories:

#### Version properties (top of file)

```xml
<PropertyGroup>
  <AspnetVersion>{NEW_ASPNET_VERSION}</AspnetVersion>
  <MicrosoftExtensionsVersion>{NEW_EXTENSIONS_VERSION}</MicrosoftExtensionsVersion>
  <AspireVersion>{NEW_ASPIRE_VERSION}</AspireVersion>
  <AspireUnstablePackagesVersion>{NEW_ASPIRE_UNSTABLE_VERSION}</AspireUnstablePackagesVersion>
  <!-- GrpcVersion, DuendeVersion, ApiVersioningVersion — update only if needed -->
</PropertyGroup>
```

#### Hardcoded Microsoft package versions

These do NOT use the version properties above — each has an explicit version that must be updated individually:

| Package | Category | Update to |
|---------|----------|-----------|
| `Microsoft.Extensions.ApiDescription.Server` | OpenAPI codegen | Match `{NEW_ASPNET_VERSION}` |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | Auth | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.Authentication.OpenIdConnect` | Auth | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.Components.QuickGrid` | Blazor | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.Components.Web` | Blazor | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.Identity.EntityFrameworkCore` | Identity | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.Identity.UI` | Identity | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.Mvc.Testing` | Testing | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.OpenApi` | OpenAPI | Latest ASP.NET Core patch |
| `Microsoft.AspNetCore.TestHost` | Testing | Latest ASP.NET Core patch |
| `Microsoft.Extensions.Identity.Stores` | Identity | Latest Extensions patch |
| `Microsoft.Extensions.Http.Resilience` | Resilience | Latest Extensions version |
| `Microsoft.Extensions.Options` | Runtime | Latest Extensions patch |
| `Microsoft.Extensions.Configuration.Abstractions` | Runtime | Latest Extensions patch |
| `Microsoft.Extensions.Logging.Abstractions` | Runtime | Latest Extensions patch |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | EF Core | `{NEW_EF_VERSION}` |
| `Microsoft.EntityFrameworkCore.Tools` | EF Core | Latest EF Core patch |

#### Third-party packages — update only if compatibility requires it

- `Duende.IdentityServer` packages — check compatibility with new .NET version
- `Grpc.AspNetCore` / `Grpc.Net.ClientFactory` / `Grpc.Tools` — check gRPC compat
- `FluentValidation`, `MediatR`, `Dapper` — typically version-agnostic
- `OpenTelemetry.*` — check for new .NET version support
- `Scalar.AspNetCore` — check compat
- `AspNetCore.HealthChecks.Uris` (Xabaril) — may lag behind; check NuGet for new version

**Important:** Never add `Version=` attributes to individual `.csproj` files. All versions live here.

### Step 3: Target Framework — All `.csproj` Files

#### Standard projects (single TFM)

Replace `<TargetFramework>{OLD_TFM}</TargetFramework>` with `<TargetFramework>{NEW_TFM}</TargetFramework>` in all of these:

**Source projects (17 files):**
- `src/Basket.API/Basket.API.csproj`
- `src/Catalog.API/Catalog.API.csproj`
- `src/eShop.AppHost/eShop.AppHost.csproj`
- `src/eShop.ServiceDefaults/eShop.ServiceDefaults.csproj`
- `src/EventBus/EventBus.csproj`
- `src/EventBusRabbitMQ/EventBusRabbitMQ.csproj`
- `src/Identity.API/Identity.API.csproj`
- `src/IntegrationEventLogEF/IntegrationEventLogEF.csproj`
- `src/Ordering.API/Ordering.API.csproj`
- `src/Ordering.Domain/Ordering.Domain.csproj`
- `src/Ordering.Infrastructure/Ordering.Infrastructure.csproj`
- `src/OrderProcessor/OrderProcessor.csproj`
- `src/PaymentProcessor/PaymentProcessor.csproj`
- `src/WebApp/WebApp.csproj`
- `src/WebAppComponents/WebAppComponents.csproj`
- `src/WebhookClient/WebhookClient.csproj`
- `src/Webhooks.API/Webhooks.API.csproj`

**Test projects (5 files):**
- `tests/Basket.UnitTests/Basket.UnitTests.csproj`
- `tests/Catalog.FunctionalTests/Catalog.FunctionalTests.csproj`
- `tests/ClientApp.UnitTests/ClientApp.UnitTests.csproj`
- `tests/Ordering.FunctionalTests/Ordering.FunctionalTests.csproj`
- `tests/Ordering.UnitTests/Ordering.UnitTests.csproj`

#### MAUI multi-target projects (platform-specific TFMs)

These require replacing ALL occurrences of the old TFM prefix, including platform suffixes and MSBuild conditions:

**`src/HybridApp/HybridApp.csproj`** — replace every `{OLD_TFM}` with `{NEW_TFM}` in:
- `<TargetFrameworks>{OLD_TFM}-android;{OLD_TFM}-ios;{OLD_TFM}-maccatalyst</TargetFrameworks>`
- `<TargetFrameworks Condition="...">$(TargetFrameworks);{OLD_TFM}-windows10.0.19041.0</TargetFrameworks>`
- Commented-out tizen line: `{OLD_TFM}-tizen`

**`src/ClientApp/ClientApp.csproj`** — same as HybridApp, plus additional occurrences:
- `<TargetFrameworks>{OLD_TFM}-android;{OLD_TFM}-ios;{OLD_TFM}-maccatalyst;{OLD_TFM}</TargetFrameworks>` (includes bare TFM)
- `<OutputType Condition="'$(TargetFramework)' != '{OLD_TFM}'">Exe</OutputType>`
- `<PropertyGroup Condition="'$(Configuration)|$(TargetFramework)|$(Platform)'=='Debug|{OLD_TFM}-ios|AnyCPU'">`

**Approach:** Use a global find-and-replace of `{OLD_TFM}` → `{NEW_TFM}` within these two csproj files to catch all occurrences. There are approximately 6 occurrences per MAUI project.

**ClientApp special case:** `ClientApp.csproj` sets `<ManagePackageVersionsCentrally>false</ManagePackageVersionsCentrally>`, so it has inline package versions that must be updated manually. Check and update any `Version=` attributes in its `<PackageReference>` items.

### Step 4: Aspire SDK — AppHost and Functional Test Projects

Three `.csproj` files reference the Aspire SDK version in their `<Project Sdk="...">` attribute:

```xml
<!-- Update the SDK version in the Project element -->
<Project Sdk="Aspire.AppHost.Sdk/{NEW_ASPIRE_VERSION}">
```

Files to update:
- `src/eShop.AppHost/eShop.AppHost.csproj` (line 1)
- `tests/Catalog.FunctionalTests/Catalog.FunctionalTests.csproj` (line 1)
- `tests/Ordering.FunctionalTests/Ordering.FunctionalTests.csproj` (line 1)

**Known issue:** The functional test projects may be on a different Aspire SDK version than the AppHost. Ensure all three use the same `{NEW_ASPIRE_VERSION}`.

### Step 5: Dev Container — `.devcontainer/devcontainer.json`

Update the base image tag to match the new .NET major version:

```jsonc
{
  "image": "mcr.microsoft.com/devcontainers/dotnet:{NEW_MAJOR_VERSION}.0"
}
```

Example: for .NET 11, use `"mcr.microsoft.com/devcontainers/dotnet:11.0"`.

Also verify the `postCreateCommand` still installs the correct workloads:
```jsonc
"postCreateCommand": "dotnet workload install aspire && dotnet restore && npm install"
```

### Step 6: CI/CD Workflows

#### `.github/workflows/playwright.yml`

Has a **hardcoded** `dotnet-version` string:

```yaml
- uses: actions/setup-dotnet@v4
  with:
    dotnet-version: '{NEW_MAJOR_VERSION}.0.x'
    dotnet-quality: 'preview'  # Remove when using GA release
```

When the new SDK is GA (not preview), remove `dotnet-quality: 'preview'`.

#### `.github/workflows/pr-validation.yml` and `pr-validation-maui.yml`

These use `actions/setup-dotnet` with `global-json-file` — they automatically pick up the SDK version from `global.json`. No changes needed unless the workflow file hardcodes a version.

#### `ci.yml` (Azure DevOps)

Uses `UseDotNet@2` with `useGlobalJson: true` — automatically picks up the SDK version. No changes needed.

#### MAUI workflow workload installs

In `.github/workflows/pr-validation-maui.yml`, verify the workload install commands are still valid:
```yaml
- run: dotnet workload install android ios maccatalyst maui
```

New .NET versions sometimes rename or restructure workloads.

### Step 7: Documentation Updates

Update version references in these files (search for the old version string patterns):

#### `README.md`
- "This version of eShop is based on .NET {X}" → update to new version
- SDK download link and text
- Visual Studio version prerequisites (check if a newer VS is required)
- Previous version branch links (add current version as a branch link)

#### `PRD.md`
- Header table: `.NET {X} / Aspire {Y}`
- Technology Stack tables (Section 5): SDK version, Aspire version
- Package version tables throughout
- Prerequisites section
- Footer version reference

#### `.github/copilot-instructions.md`
- Header: `.NET {X} ... .NET Aspire {Y}`
- `net{X}.0` TFM reference in Key Conventions section

#### `.github/instructions/common.instructions.md`
- ".NET {X} SDK built-in analyzers" reference

## Post-Update Verification

After all changes, run these commands to verify:

```bash
# 1. Restore and build the web solution filter
dotnet build eShop.Web.slnf

# 2. Run unit tests
dotnet test tests/Ordering.UnitTests/Ordering.UnitTests.csproj
dotnet test tests/Basket.UnitTests/Basket.UnitTests.csproj

# 3. Run functional tests (requires Docker)
dotnet test tests/Catalog.FunctionalTests/Catalog.FunctionalTests.csproj
dotnet test tests/Ordering.FunctionalTests/Ordering.FunctionalTests.csproj

# 4. Start the full application (requires Docker)
dotnet run --project src/eShop.AppHost/eShop.AppHost.csproj
```

## Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Missing MAUI TFM occurrence | Use global find-replace for `{OLD_TFM}` in MAUI csproj files — they contain 5-6 occurrences including conditions and comments |
| Aspire SDK version mismatch | Verify all three `Sdk="Aspire.AppHost.Sdk/X.Y.Z"` attributes match (AppHost + 2 functional tests) |
| ClientApp inline versions | `ClientApp.csproj` opts out of central package management — check for inline `Version=` attributes |
| Stale README.md | README may already reference an older version than what's in code — verify against actual `global.json` |
| Playwright workflow hardcoded version | `.github/workflows/playwright.yml` has a literal `dotnet-version` string, not global.json |
| Preview vs GA quality flag | Remove `dotnet-quality: 'preview'` from workflows once the SDK is GA |
| Breaking API changes | After version bump, run the build — new SDK analyzers or API removals may surface new warnings (which are errors due to `TreatWarningsAsErrors`) |
| Third-party package lag | Packages like `AspNetCore.HealthChecks.Uris`, `Duende.IdentityServer`, and community Aspire packages may not have a release for the new .NET version yet — check NuGet availability |
| EF Core migrations | Major version bumps may require regenerating EF Core migrations if the migration format changes |
| Devcontainer image availability | The `mcr.microsoft.com/devcontainers/dotnet:{version}` image may not exist yet for preview releases |
| MSTest SDK version | `global.json` pins `MSTest.Sdk` — verify compatibility with the new .NET SDK |
