# Product Requirements Document (PRD)

## eShop Reference Application — "AdventureWorks"

| Field | Value |
|---|---|
| **Product Name** | eShop (AdventureWorks) |
| **Version** | .NET 10 / Aspire 13.1 |
| **Repository** | `dotnet/eShop` |
| **Document Date** | February 11, 2026 |
| **Status** | Reference Application — Active Development |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Objectives](#2-product-vision--objectives)
3. [Target Audience](#3-target-audience)
4. [System Architecture Overview](#4-system-architecture-overview)
5. [Technology Stack](#5-technology-stack)
6. [Microservice Specifications](#6-microservice-specifications)
7. [Frontend Applications](#7-frontend-applications)
8. [Shared Libraries & Infrastructure](#8-shared-libraries--infrastructure)
9. [Data Architecture](#9-data-architecture)
10. [Integration & Messaging](#10-integration--messaging)
11. [Security & Authentication](#11-security--authentication)
12. [Observability & Monitoring](#12-observability--monitoring)
13. [AI & Intelligent Features](#13-ai--intelligent-features)
14. [API Specifications](#14-api-specifications)
15. [Testing Strategy](#15-testing-strategy)
16. [Build, CI/CD & Deployment](#16-build-cicd--deployment)
17. [Non-Functional Requirements](#17-non-functional-requirements)
18. [Order Lifecycle & Business Flows](#18-order-lifecycle--business-flows)
19. [Configuration & Environment](#19-configuration--environment)
20. [Glossary](#20-glossary)

---

## 1. Executive Summary

eShop is a **reference .NET application** demonstrating a modern, cloud-native e-commerce platform built using a microservices architecture orchestrated by **.NET Aspire**. The application showcases best practices for building distributed systems with .NET, including Domain-Driven Design (DDD), CQRS with MediatR, event-driven communication via RabbitMQ, gRPC inter-service communication, transactional outbox patterns, OpenTelemetry observability, and AI-powered features.

The application simulates an outdoor adventure gear online store ("AdventureWorks") with full e-commerce capabilities: product browsing, shopping basket management, order processing, payment simulation, identity management, and webhook-based notifications.

---

## 2. Product Vision & Objectives

### Vision
Serve as the canonical reference implementation for building cloud-native, microservices-based applications on the .NET platform, demonstrating production-grade architectural patterns and practices.

### Objectives

| # | Objective | Description |
|---|-----------|-------------|
| O1 | **Architectural Reference** | Demonstrate microservices decomposition, bounded contexts, and service-to-service communication patterns |
| O2 | **.NET Aspire Showcase** | Illustrate orchestration, service discovery, health checks, and telemetry via .NET Aspire |
| O3 | **DDD & CQRS Patterns** | Provide a complete DDD implementation with aggregates, domain events, CQRS, and MediatR pipeline |
| O4 | **Event-Driven Architecture** | Demonstrate asynchronous integration events with RabbitMQ and the transactional outbox pattern |
| O5 | **Multi-Client Support** | Support Blazor Server web, .NET MAUI hybrid, and native mobile frontends sharing components |
| O6 | **AI Integration** | Showcase optional AI features (semantic search, chat) with OpenAI/Ollama |
| O7 | **Observability** | Full OpenTelemetry instrumentation — distributed tracing, metrics, and structured logging |
| O8 | **Security** | Production-grade OAuth 2.0 / OpenID Connect flows with IdentityServer (Duende) |

---

## 3. Target Audience

| Audience | Purpose |
|----------|---------|
| **.NET developers** | Learn best practices for building microservice applications |
| **Solution architects** | Reference architecture for distributed system design |
| **DevOps engineers** | Container orchestration, health checks, and observability patterns |
| **Students & educators** | Comprehensive learning resource for cloud-native development |
| **Microsoft product teams** | Showcase for .NET Aspire, .NET MAUI, and Blazor technologies |

---

## 4. System Architecture Overview

### 4.1 High-Level Architecture

The system follows a **microservices architecture** with the following key architectural decisions:

- **Orchestration**: .NET Aspire `DistributedApplication` manages service lifecycle, dependencies, and configuration
- **API Gateway**: YARP reverse proxy provides a Backend-for-Frontend (BFF) pattern for mobile clients
- **Communication**: REST (Minimal APIs) for external/web clients, gRPC for internal inter-service calls, RabbitMQ for asynchronous event-driven messaging
- **Data Isolation**: Each service owns its data store (Database-per-Service pattern)
- **Event-Driven**: Integration events enable loose coupling between bounded contexts

### 4.2 Service Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        .NET Aspire AppHost                             │
│                    (Orchestration & Service Discovery)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐   │
│  │ WebApp   │  │ Hybrid   │  │ ClientApp │  │ WebhookClient       │   │
│  │ (Blazor) │  │ (MAUI+B) │  │ (MAUI)    │  │ (Blazor Server)     │   │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └──────────┬──────────┘   │
│       │              │              │                     │             │
│       │              │        ┌─────┴──────┐              │             │
│       │              └────────┤ mobile-bff  │              │             │
│       │                       │  (YARP)     │              │             │
│       │                       └─────┬──────┘              │             │
│  ┌────┴──────────────────────────────┴────────────────────┴──────────┐  │
│  │                        API Layer                                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │ Catalog    │  │ Basket     │  │ Ordering    │  │ Webhooks  │  │  │
│  │  │ API        │  │ API        │  │ API         │  │ API       │  │  │
│  │  │ (REST)     │  │ (gRPC)     │  │ (REST)      │  │ (REST)    │  │  │
│  │  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘  └────┬──────┘  │  │
│  └────────┼───────────────┼──────────────────┼──────────────┼────────┘  │
│           │               │                  │              │           │
│  ┌────────┼───────────────┼──────────────────┼──────────────┼────────┐  │
│  │        │          Infrastructure          │              │        │  │
│  │  ┌─────┴──────┐  ┌────┴────┐  ┌──────────┴───┐  ┌──────┴─────┐  │  │
│  │  │ PostgreSQL │  │  Redis  │  │  RabbitMQ    │  │ Identity   │  │  │
│  │  │ (pgvector) │  │         │  │  (EventBus)  │  │ API (OIDC) │  │  │
│  │  └────────────┘  └─────────┘  └──────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Background Services: OrderProcessor │ PaymentProcessor          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Bounded Contexts

| Bounded Context | Services | Domain |
|-----------------|----------|--------|
| **Catalog** | Catalog.API | Product catalog, brands, types, stock management, AI search |
| **Basket** | Basket.API | Shopping cart management |
| **Ordering** | Ordering.API, OrderProcessor | Order lifecycle, buyers, payments (DDD aggregate) |
| **Payment** | PaymentProcessor | Payment simulation |
| **Identity** | Identity.API | User authentication & authorization |
| **Webhooks** | Webhooks.API, WebhookClient | Event notification subscriptions |

---

## 5. Technology Stack

### 5.1 Core Platform

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | .NET | 10.0 |
| SDK | .NET SDK | 10.0.100 |
| Orchestration | .NET Aspire | 13.1.0 |
| Language | C# | Latest (implicit) |

### 5.2 Backend Frameworks & Libraries

| Category | Technology | Version |
|----------|-----------|---------|
| Web APIs | ASP.NET Core Minimal APIs | 10.0 |
| API Versioning | Asp.Versioning.Http | 8.1.0 |
| gRPC | Grpc.AspNetCore | 2.71.0 |
| ORM | Entity Framework Core (Npgsql) | 10.0 |
| CQRS / Mediator | MediatR | 13.0.0 |
| Validation | FluentValidation | 12.0.0 |
| Micro-ORM | Dapper | 2.1.35 |
| Resilience | Microsoft.Extensions.Http.Resilience (Polly) | 10.1.0 |
| Identity Server | Duende IdentityServer | 7.3.2 |
| Reverse Proxy | YARP (Aspire.Hosting.Yarp) | via Aspire |
| OpenAPI / Swagger | Microsoft.AspNetCore.OpenApi + Scalar | 10.0 / 2.8.6 |
| Protobuf | Google.Protobuf | 3.33.0 |

### 5.3 Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary Database | PostgreSQL (ankane/pgvector) | Catalog, Identity, Ordering, Webhooks data |
| Vector Search | pgvector | AI semantic similarity search |
| Cache / Session | Redis | Basket storage |
| Message Broker | RabbitMQ | Asynchronous integration events |

### 5.4 Frontend

| Application | Technology | Platform |
|-------------|-----------|----------|
| WebApp | Blazor Server (Interactive SSR) | Web browsers |
| WebAppComponents | Razor Class Library | Shared components |
| HybridApp | .NET MAUI + Blazor Hybrid | iOS, Android, Windows, macOS |
| ClientApp | .NET MAUI (native) | iOS, Android (MVVM) |

### 5.5 Observability

| Concern | Technology |
|---------|-----------|
| Distributed Tracing | OpenTelemetry (ASP.NET, HTTP, gRPC, RabbitMQ, AI) |
| Metrics | OpenTelemetry Runtime + ASP.NET + HTTP meters |
| Logging | OpenTelemetry structured logging |
| Export | OTLP (OpenTelemetry Protocol) |
| Dashboard | .NET Aspire Dashboard |

### 5.6 AI / ML

| Feature | Technology |
|---------|-----------|
| Embeddings | OpenAI / Azure OpenAI / Ollama |
| Chat | OpenAI / Ollama chat completions |
| Vector Storage | pgvector (via EF Core + Pgvector.EntityFrameworkCore) |

### 5.7 Testing

| Layer | Framework |
|-------|-----------|
| Unit Tests | MSTest 4.0 / xUnit v3 |
| Mocking | NSubstitute 5.3 |
| Functional Tests | ASP.NET Core TestHost + Aspire containers |
| E2E Tests | Playwright (TypeScript) |

---

## 6. Microservice Specifications

### 6.1 Catalog.API

| Property | Detail |
|----------|--------|
| **Responsibility** | Product catalog management — CRUD, search, stock validation, AI semantic search |
| **API Style** | REST (Minimal APIs) with API versioning (v1/v2) |
| **Database** | PostgreSQL (`catalogdb`) with pgvector extension |
| **ORM** | Entity Framework Core (Npgsql + pgvector) |
| **Port** | Dynamically assigned by Aspire |

#### Data Model

| Entity | Fields |
|--------|--------|
| `CatalogItem` | Id, Name, Description, Price, PictureFileName, CatalogTypeId, CatalogBrandId, AvailableStock, RestockThreshold, MaxStockThreshold, Embedding (Vector?), OnReorder |
| `CatalogBrand` | Id, Brand |
| `CatalogType` | Id, Type |

#### API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/catalog/items` | No | Paginated item list (v2 adds name/type/brand filters) |
| GET | `/api/catalog/items/{id}` | No | Get single item |
| GET | `/api/catalog/items/by?ids=` | No | Batch get by multiple IDs |
| GET | `/api/catalog/items/by/{name}` | No | Search by name (v1 only) |
| GET | `/api/catalog/items/{id}/pic` | No | Get product image |
| GET | `/api/catalog/items/withsemanticrelevance/{text}` | No | AI-powered semantic search |
| GET | `/api/catalog/catalogtypes` | No | List all product types |
| GET | `/api/catalog/catalogbrands` | No | List all brands |
| PUT | `/api/catalog/items` | No | Update existing item |
| POST | `/api/catalog/items` | No | Create new item |
| DELETE | `/api/catalog/items/{id}` | No | Delete item |

#### Integration Events

| Direction | Event | Trigger |
|-----------|-------|---------|
| **Subscribes** | `OrderStatusChangedToAwaitingValidationIntegrationEvent` | Validates stock availability for order items |
| **Subscribes** | `OrderStatusChangedToPaidIntegrationEvent` | Decrements stock for paid order items |
| **Publishes** | `ProductPriceChangedIntegrationEvent` | When a catalog item price is modified |
| **Publishes** | `OrderStockConfirmedIntegrationEvent` | When stock is available for all order items |
| **Publishes** | `OrderStockRejectedIntegrationEvent` | When stock is insufficient for one or more items |

#### Key Design Decisions

- Uses **transactional outbox pattern** (`IntegrationEventLogEF`) for reliable event publishing
- **API versioning** (v1 → v2) demonstrates backward-compatible API evolution
- **AI semantic search** is optional — catalog functions without AI enabled
- Stock management methods (`AddStock`, `RemoveStock`) enforce domain invariants
- Product images served directly from the API via file system

---

### 6.2 Basket.API

| Property | Detail |
|----------|--------|
| **Responsibility** | Shopping basket CRUD for authenticated users |
| **API Style** | gRPC (no REST endpoints) |
| **Storage** | Redis |
| **Protocol** | Protocol Buffers (proto3) |

#### Data Model

| Entity | Fields |
|--------|--------|
| `CustomerBasket` | BuyerId (string), Items (List\<BasketItem\>) |
| `BasketItem` | Id, ProductId, ProductName, UnitPrice, OldUnitPrice, Quantity, PictureUrl |

#### gRPC Service Definition (`basket.proto`)

| RPC Method | Request | Response | Auth |
|------------|---------|----------|------|
| `GetBasket` | - | `CustomerBasketResponse` | Anonymous allowed |
| `UpdateBasket` | `UpdateBasketRequest` (items) | `CustomerBasketResponse` | Required |
| `DeleteBasket` | - | `DeleteBasketResponse` | Required |

#### Storage Pattern

- Baskets stored as JSON strings in Redis at key `/basket/{userId}`
- Source-generated `System.Text.Json` serialization for performance
- Repository pattern: `IBasketRepository` → `RedisBasketRepository`

#### Integration Events

| Direction | Event | Behavior |
|-----------|-------|----------|
| **Subscribes** | `OrderStartedIntegrationEvent` | Deletes the user's basket when an order is placed |

#### Key Design Decisions

- **gRPC-only** API (no REST fallback) — optimized for internal service-to-service communication
- Uses `AddBasicServiceDefaults()` (no HTTP resilience, since no outgoing HTTP calls)
- JWT Bearer authentication with user identity extracted from gRPC `ServerCallContext`
- Stateless — basket data lives entirely in Redis

---

### 6.3 Ordering.API

| Property | Detail |
|----------|--------|
| **Responsibility** | Full order lifecycle management — the most complex bounded context |
| **API Style** | REST (Minimal APIs) with API versioning (v1) |
| **Database** | PostgreSQL (`orderingdb`, schema: `ordering`) |
| **ORM** | Entity Framework Core |
| **Patterns** | DDD, CQRS, MediatR, Idempotent Commands, Domain Events |

#### Domain Model (Ordering.Domain)

**Order Aggregate:**

| Entity / VO | Type | Fields |
|-------------|------|--------|
| `Order` | Aggregate Root | OrderDate, Address, BuyerId, OrderStatus, Description, OrderItems |
| `OrderItem` | Entity | ProductId, ProductName, UnitPrice, Discount, Units, PictureUrl |
| `Address` | Value Object | Street, City, State, Country, ZipCode |
| `OrderStatus` | Enumeration | Submitted, AwaitingValidation, StockConfirmed, Paid, Shipped, Cancelled |

**Buyer Aggregate:**

| Entity | Type | Fields |
|--------|------|--------|
| `Buyer` | Aggregate Root | IdentityGuid, Name, PaymentMethods |
| `PaymentMethod` | Entity | Card details (alias, number, security, expiration, type) |
| `CardType` | Enumeration | Amex, Visa, MasterCard |

#### API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/orders` | Required | Create order (idempotent via `x-requestid`) |
| POST | `/api/orders/draft` | Required | Create draft order for preview |
| GET | `/api/orders/{orderId}` | Required | Get order details |
| GET | `/api/orders` | Required | Get current user's orders |
| GET | `/api/orders/cardtypes` | Required | List supported card types |
| PUT | `/api/orders/cancel` | Required | Cancel an order |
| PUT | `/api/orders/ship` | Required | Ship an order |

#### CQRS Commands (via MediatR)

| Command | Description |
|---------|-------------|
| `CreateOrderCommand` | Place a new order |
| `CreateOrderDraftCommand` | Preview order without persisting |
| `CancelOrderCommand` | Cancel an existing order |
| `ShipOrderCommand` | Mark order as shipped |
| `SetAwaitingValidationOrderStatusCommand` | Transition to awaiting stock validation |
| `SetStockConfirmedOrderStatusCommand` | Confirm stock availability |
| `SetStockRejectedOrderStatusCommand` | Reject order due to stock shortage |
| `SetPaidOrderStatusCommand` | Mark order as paid |

#### MediatR Pipeline Behaviors

| Behavior | Purpose |
|----------|---------|
| `LoggingBehavior` | Cross-cutting command/response logging |
| `ValidatorBehavior` | FluentValidation integration for commands |
| `TransactionBehavior` | Wraps commands in EF Core transactions, publishes integration events atomically |

#### Domain Events (7 handlers)

| Domain Event | Handler Action |
|--------------|----------------|
| `OrderStartedDomainEvent` | Verify/add buyer aggregate, add payment method |
| `OrderStatusChangedToAwaitingValidationDomainEvent` | Publish integration event |
| `OrderStatusChangedToStockConfirmedDomainEvent` | Publish integration event |
| `OrderStatusChangedToPaidDomainEvent` | Publish integration event |
| `OrderShippedDomainEvent` | Publish integration event |
| `OrderCancelledDomainEvent` | Publish integration event |
| `BuyerPaymentMethodVerifiedDomainEvent` | Update order with buyer/payment info |

#### Integration Events

| Direction | Event |
|-----------|-------|
| **Subscribes** | `GracePeriodConfirmedIntegrationEvent` |
| **Subscribes** | `OrderStockConfirmedIntegrationEvent` |
| **Subscribes** | `OrderStockRejectedIntegrationEvent` |
| **Subscribes** | `OrderPaymentSucceededIntegrationEvent` |
| **Subscribes** | `OrderPaymentFailedIntegrationEvent` |
| **Publishes** | `OrderStartedIntegrationEvent` |
| **Publishes** | `OrderStatusChangedToAwaitingValidationIntegrationEvent` |
| **Publishes** | `OrderStatusChangedToStockConfirmedIntegrationEvent` |
| **Publishes** | `OrderStatusChangedToPaidIntegrationEvent` |
| **Publishes** | `OrderStatusChangedToShippedIntegrationEvent` |
| **Publishes** | `OrderStatusChangedToCancelledIntegrationEvent` |
| **Publishes** | `OrderStatusChangedToSubmittedIntegrationEvent` |

#### Ordering.Infrastructure

| Component | Responsibility |
|-----------|---------------|
| `OrderingContext` | EF Core DbContext, implements `IUnitOfWork`, dispatches domain events before `SaveChanges` |
| `OrderRepository` | DDD repository for Order aggregate |
| `BuyerRepository` | DDD repository for Buyer aggregate |
| `RequestManager` | Idempotent command deduplication via `ClientRequest` table |
| EF Migrations | Database schema management |

---

### 6.4 OrderProcessor

| Property | Detail |
|----------|--------|
| **Responsibility** | Background grace period management for submitted orders |
| **Type** | Worker Service (`BackgroundService`) |
| **Database** | PostgreSQL (`orderingdb`) via ADO.NET (NpgsqlDataSource) |

#### Behavior

1. Periodically polls the `ordering.orders` table for orders in `Submitted` status
2. Checks if the order's `OrderDate` has exceeded the configured `GracePeriodTime`
3. For each expired order, publishes `GracePeriodConfirmedIntegrationEvent` to RabbitMQ
4. Configurable via `BackgroundTaskOptions`:
   - `GracePeriodTime` — duration before grace period expires
   - `CheckUpdateTime` — polling interval

#### Integration Events

| Direction | Event |
|-----------|-------|
| **Publishes** | `GracePeriodConfirmedIntegrationEvent` |

---

### 6.5 PaymentProcessor

| Property | Detail |
|----------|--------|
| **Responsibility** | Simulated payment gateway |
| **Type** | Worker Service |
| **Database** | None |

#### Behavior

1. Subscribes to `OrderStatusChangedToStockConfirmedIntegrationEvent`
2. Reads `PaymentOptions.PaymentSucceeded` from configuration (boolean toggle)
3. Publishes either:
   - `OrderPaymentSucceededIntegrationEvent` (if `PaymentSucceeded = true`)
   - `OrderPaymentFailedIntegrationEvent` (if `PaymentSucceeded = false`)

> **Note:** This is a simulation — no real payment processing is implemented. It serves as a placeholder for a real payment gateway integration.

---

### 6.6 Identity.API

| Property | Detail |
|----------|--------|
| **Responsibility** | OAuth 2.0 / OpenID Connect identity provider |
| **Type** | Web application (MVC + Razor views) |
| **Database** | PostgreSQL (`identitydb`) |
| **Framework** | ASP.NET Core Identity + Duende IdentityServer |

#### User Model (`ApplicationUser`)

Extends `IdentityUser` with:
- CardNumber, SecurityNumber, Expiration, CardHolderName, CardType
- Street, City, State, Country, ZipCode
- Name, LastName

#### Configured OIDC Clients

| Client ID | Flow | Scopes | Application |
|-----------|------|--------|-------------|
| `maui` | Authorization Code + PKCE | `openid`, `profile`, `orders`, `basket`, `webhooks` | ClientApp (MAUI native) |
| `webapp` | Authorization Code | `openid`, `profile`, `orders`, `basket` | WebApp (Blazor Server) |
| `webhooksclient` | Authorization Code | `openid`, `profile`, `webhooks` | WebhookClient |
| `basketswaggerui` | Implicit | `basket` | Basket API Swagger |
| `orderingswaggerui` | Implicit | `orders` | Ordering API Swagger |
| `webhooksswaggerui` | Implicit | `webhooks` | Webhooks API Swagger |

#### API Scopes

| Scope | Description |
|-------|-------------|
| `orders` | Ordering API access |
| `basket` | Basket API access |
| `webhooks` | Webhooks API access |

#### Features

- Login / Logout / Consent UI (MVC controllers + Razor views)
- `ProfileService` for custom claims (user name)
- `UsersSeed` — auto-seeds default user on startup
- Auto-migration of identity database schema

---

### 6.7 Webhooks.API

| Property | Detail |
|----------|--------|
| **Responsibility** | Webhook subscription management and event notification delivery |
| **API Style** | REST (Minimal APIs) |
| **Database** | PostgreSQL (`webhooksdb`) |
| **Auth** | JWT Bearer (required) |

#### Data Model

| Entity | Fields |
|--------|--------|
| `WebhookSubscription` | Id, Type (WebhookType), Date, DestUrl, Token, UserId |
| `WebhookType` | CatalogItemPriceChange, OrderShipped, OrderPaid |
| `WebhookData` | When, Payload (JSON string), Type |

#### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/webhooks` | List current user's subscriptions |
| GET | `/api/webhooks/{id}` | Get subscription details |
| POST | `/api/webhooks` | Create subscription (validates grant URL) |
| DELETE | `/api/webhooks/{id}` | Delete subscription |

#### Webhook Delivery

- `WebhooksSender` — HTTP POST to subscriber `DestUrl` with JSON payload
- Includes `X-eshop-whtoken` header for subscriber authentication
- `GrantUrlTesterService` — validates subscriber grant URLs before allowing registration

#### Integration Events

| Direction | Event | Webhook Type |
|-----------|-------|-------------|
| **Subscribes** | `ProductPriceChangedIntegrationEvent` | CatalogItemPriceChange |
| **Subscribes** | `OrderStatusChangedToShippedIntegrationEvent` | OrderShipped |
| **Subscribes** | `OrderStatusChangedToPaidIntegrationEvent` | OrderPaid |

---

## 7. Frontend Applications

### 7.1 WebApp (Blazor Server)

| Property | Detail |
|----------|--------|
| **Framework** | Blazor Server (Interactive Server Rendering) |
| **Auth** | OpenID Connect (client: `webapp`) |
| **Backend Connections** | gRPC → Basket.API, HTTP → Catalog.API (v2), HTTP → Ordering.API (v1) |

#### Features

| Feature | Description |
|---------|-------------|
| Product Catalog | Browse, filter by brand/type, search by name |
| Product Details | View item details with image |
| Shopping Basket | Add/remove items, update quantities (via gRPC) |
| Checkout | Submit order with shipping address and payment details |
| Order History | View past orders and their status |
| Real-time Notifications | Order status updates via `OrderStatusNotificationService` |
| AI Chat | Optional conversational AI for product discovery |
| Image Proxy | YARP-forwarded product images from Catalog.API |

#### Service Layer

| Service | Responsibility |
|---------|---------------|
| `BasketService` | Wraps gRPC basket client, manages basket operations |
| `BasketState` | Stateful basket management with product data enrichment |
| `OrderingService` | HTTP client for order CRUD operations |
| `LogOutService` | Handles sign-out flow |
| `OrderStatusNotificationService` | Subscribes to order status integration events for real-time UI |

### 7.2 WebAppComponents (Shared Library)

A Razor Class Library providing reusable UI components shared between WebApp and HybridApp:

| Component | Purpose |
|-----------|---------|
| `CatalogListItem.razor` | Product card display component |
| `CatalogSearch.razor` | Search and filter UI component |
| `CatalogItem.cs` | Shared catalog item data model |
| `ICatalogService` | Catalog API client interface |
| `CatalogService` | HTTP-based catalog service implementation |
| `IProductImageUrlProvider` | Abstraction for platform-specific image URL resolution |

### 7.3 HybridApp (.NET MAUI Blazor Hybrid)

| Property | Detail |
|----------|--------|
| **Framework** | .NET MAUI + Blazor Hybrid (WebView) |
| **Platforms** | iOS, Android, Windows, macOS |
| **Backend** | HTTP → mobile-bff (YARP proxy) → Catalog.API |
| **Features** | Catalog browsing only (no auth/basket) |

- Shares UI components via `WebAppComponents` library
- Custom `ProductImageUrlProvider` for mobile image resolution
- Connects to `mobile-bff` YARP proxy (localhost:11632 or Android emulator IP)

### 7.4 ClientApp (.NET MAUI Native)

| Property | Detail |
|----------|--------|
| **Framework** | .NET MAUI (fully native) |
| **Architecture** | MVVM pattern |
| **Platforms** | iOS, Android |
| **Auth** | OIDC via IdentityModel.OidcClient with PKCE (client: `maui`) |

#### Features

| Feature | Description |
|---------|-------------|
| Full Catalog | Browse and search products |
| Shopping Basket | Add, update, remove items |
| Checkout | Complete order flow |
| Order History | View past orders with details |
| User Profile | Edit account information |
| Settings | Configure API endpoints, theme |
| Animations | Custom UI animations and transitions |
| Validation | Form input validation framework |

#### MVVM Architecture

| Layer | Components |
|-------|-----------|
| Views | XAML pages for each feature |
| ViewModels | 13 view models (Catalog, Basket, Checkout, OrderDetail, Login, Profile, Settings, etc.) |
| Services | Basket, Catalog, Order, Identity, Location, Navigation, Settings, Theme, Dialog |
| Controls | Custom UI controls |
| Converters | XAML value converters |

### 7.5 WebhookClient (Blazor Server)

| Property | Detail |
|----------|--------|
| **Framework** | Blazor Server |
| **Auth** | OpenID Connect (client: `webhooksclient`, scope: `webhooks`) |
| **Purpose** | Demonstration webhook subscriber/consumer |

- Registers webhook subscriptions with Webhooks.API
- Receives webhook callbacks and stores in-memory (`HooksRepository`)
- Displays received hooks in the UI

---

## 8. Shared Libraries & Infrastructure

### 8.1 EventBus (Abstractions)

Core event bus contracts defining the integration event system:

| Type | Purpose |
|------|---------|
| `IEventBus` | Main interface: `PublishAsync(IntegrationEvent)` |
| `IIntegrationEventHandler<T>` | Handler contract for consuming events |
| `IntegrationEvent` | Base record: `Id` (Guid), `CreationDate` (DateTime) |
| `IEventBusBuilder` | Fluent API for registering event subscriptions |
| `EventBusSubscriptionInfo` | Internal subscription registry |

### 8.2 EventBusRabbitMQ (Implementation)

RabbitMQ-based implementation with production-grade features:

| Feature | Detail |
|---------|--------|
| Exchange | `eshop_event_bus` (direct exchange) |
| Routing | Event type name as routing key |
| Queue | One queue per consuming service (prefixed with service assembly name) |
| Resilience | Polly `ResiliencePipeline` with configurable retry count |
| Tracing | Full OpenTelemetry `ActivitySource` with W3C trace context propagation |
| Registration | `builder.AddRabbitMqEventBus("eventbus").AddSubscription<TEvent, THandler>()` |
| Lifecycle | Implements `IHostedService` — starts consuming on application start |

### 8.3 eShop.ServiceDefaults

Shared Aspire service configuration applied to all microservices:

| Extension | Purpose |
|-----------|---------|
| `AddServiceDefaults()` | Full defaults: health checks, OTEL, service discovery, HTTP resilience |
| `AddBasicServiceDefaults()` | Lightweight: health checks, OTEL, service discovery (no HTTP resilience) |
| `ConfigureOpenTelemetry()` | Logging + metrics (ASP.NET, HTTP, Runtime, AI) + tracing + OTLP export |
| `AddDefaultAuthentication()` | JWT Bearer authentication against Identity.API |
| `MapDefaultEndpoints()` | Health check endpoints: `/health` (readiness), `/alive` (liveness) |
| `ClaimsPrincipalExtensions` | Extract user identity from claims |
| `HttpClientExtensions` | API versioning, auth token propagation for HTTP clients |
| `OpenApiOptionsExtensions` | Swagger/OpenAPI configuration with Scalar UI |

### 8.4 IntegrationEventLogEF

Transactional outbox pattern implementation for reliable event publishing:

| Type | Purpose |
|------|---------|
| `IntegrationEventLogEntry` | Persisted event record: EventId, EventTypeName, Content (JSON), State, TimesSent, TransactionId |
| `EventStateEnum` | NotPublished → InProgress → Published / PublishedFailed |
| `IntegrationEventLogService<TContext>` | Save/retrieve/mark events within EF Core transactions |
| `ResilientTransaction` | Utility for resilient EF Core transaction execution |
| `IntegrationLogExtensions` | Registers `IntegrationEventLogEntry` table in any `DbContext` |

**Used by:** Catalog.API, Ordering.API

### 8.5 Shared

| Utility | Purpose |
|---------|---------|
| `ActivityExtensions` | `SetExceptionTags()` — sets `exception.message`, `exception.stacktrace`, `exception.type` on OpenTelemetry `Activity` |
| `MigrateDbContextExtensions` | Generic EF Core migration + seeding as `BackgroundService` with OpenTelemetry tracing |

---

## 9. Data Architecture

### 9.1 Database-per-Service Pattern

Each microservice owns its database, enforcing data isolation and independent deployment:

| Database | Service Owner | Engine | Schema | Purpose |
|----------|--------------|--------|--------|---------|
| `catalogdb` | Catalog.API | PostgreSQL + pgvector | public | Products, brands, types, embeddings |
| `identitydb` | Identity.API | PostgreSQL | public | Users, ASP.NET Identity, IdentityServer |
| `orderingdb` | Ordering.API + OrderProcessor | PostgreSQL | `ordering` | Orders, buyers, payments, integration event log |
| `webhooksdb` | Webhooks.API | PostgreSQL | public | Webhook subscriptions |
| Redis | Basket.API | Redis | N/A | Shopping baskets (key-value) |

### 9.2 PostgreSQL Configuration

- **Image:** `ankane/pgvector:latest` (PostgreSQL with pgvector extension)
- **Container Lifetime:** Persistent (survives AppHost restarts)
- **Managed by:** .NET Aspire resource provisioning

### 9.3 Data Access Patterns

| Pattern | Used By | Technology |
|---------|---------|-----------|
| EF Core + Repository | Ordering.API | `OrderingContext`, `OrderRepository`, `BuyerRepository` |
| EF Core (direct) | Catalog.API, Identity.API, Webhooks.API | DbContext with Minimal API query handlers |
| ADO.NET (Npgsql) | OrderProcessor | Raw SQL for simple polling queries |
| Redis JSON | Basket.API | `RedisBasketRepository` with source-generated serialization |
| Dapper | Ordering.API (Queries) | Read-side queries in CQRS pattern |

### 9.4 Migration Strategy

- All EF Core databases auto-migrate on startup using `AddMigration<TContext>()` from `Shared`
- Migrations run as `BackgroundService` with OpenTelemetry tracing
- Optional `IDbSeeder<TContext>` for seeding initial data (used by Catalog.API and Identity.API)
- OrderProcessor explicitly `WaitsFor(orderingApi)` to ensure migrations complete first

---

## 10. Integration & Messaging

### 10.1 Event-Driven Architecture

All asynchronous inter-service communication uses **integration events** published via **RabbitMQ**:

- **Exchange:** `eshop_event_bus` (direct exchange)
- **Routing Key:** Full event type name (e.g., `OrderStartedIntegrationEvent`)
- **Queue Per Service:** Each consuming service has its own queue
- **Serialization:** JSON
- **Reliability:** Polly resilience pipeline with configurable retries
- **Observability:** Full distributed tracing context propagated in message headers

### 10.2 Complete Integration Event Map

```
┌─────────────────────────┐
│      Catalog.API        │
│                         │
│  Publishes:             │          ┌──────────────────┐
│  • ProductPriceChanged ─┼─────────►│  Webhooks.API    │
│  • OrderStockConfirmed ─┼──┐      │  (subscriber     │
│  • OrderStockRejected  ─┼──┤      │   notification)  │
│                         │  │      └──────────────────┘
│  Subscribes:            │  │
│  • OrderAwaitingValid.  │  │
│  • OrderPaid            │  │
└─────────────────────────┘  │
                             │
┌─────────────────────────┐  │      ┌──────────────────┐
│     Ordering.API        │◄─┘      │  Basket.API      │
│                         │         │                  │
│  Publishes:             │         │  Subscribes:     │
│  • OrderStarted ────────┼────────►│  • OrderStarted  │
│  • OrderAwaitingValid. ─┼──┐      │    (delete basket)│
│  • OrderStockConfirmed ─┼──┤      └──────────────────┘
│  • OrderPaid ───────────┼──┤
│  • OrderShipped ────────┼──┤      ┌──────────────────┐
│  • OrderCancelled       │  ├─────►│  PaymentProcessor│
│  • OrderSubmitted ──────┼──┤      │                  │
│                         │  │      │  Subscribes:     │
│  Subscribes:            │  │      │  • StockConfirmed│
│  • GracePeriodConfirmed │  │      │                  │
│  • StockConfirmed       │  │      │  Publishes:      │
│  • StockRejected        │  │      │  • PaymentSuccess│
│  • PaymentSucceeded     │  │      │  • PaymentFailed │
│  • PaymentFailed        │  │      └──────────────────┘
└─────────────────────────┘  │
         ▲                   │      ┌──────────────────┐
         │                   └─────►│  WebApp          │
┌────────┴────────────────┐         │  (UI updates)    │
│    OrderProcessor       │         └──────────────────┘
│                         │
│  Publishes:             │
│  • GracePeriodConfirmed │
└─────────────────────────┘
```

### 10.3 Transactional Outbox Pattern

To prevent data inconsistency between database commits and event publishing:

1. Domain operation and integration event record are saved in the **same database transaction**
2. `IntegrationEventLogEntry` records are stored in the service's own database
3. After `SaveChanges`, the `TransactionBehavior` pipeline publishes all pending events
4. Events are marked as `Published` or `PublishedFailed`

**Used by:** Catalog.API, Ordering.API

### 10.4 Idempotent Command Processing

The Ordering.API uses `IdentifiedCommand<T>` wrapping actual commands with a `RequestId` (GUID from the `x-requestid` HTTP header). The `RequestManager` checks if a command with the same ID has already been processed, preventing duplicate order creation.

---

## 11. Security & Authentication

### 11.1 Authentication Architecture

```
┌──────────┐    OIDC     ┌──────────────┐    JWT      ┌──────────┐
│  WebApp  │◄───────────►│ Identity.API │◄───────────►│ APIs     │
│  Client  │  Auth Code  │ (Duende IS)  │  Bearer     │ (Basket, │
│  Apps    │  + PKCE     │              │  Token      │ Ordering,│
└──────────┘             └──────────────┘  Validation │ Webhooks)│
                                                       └──────────┘
```

### 11.2 Authentication Flows

| Client | Flow | Details |
|--------|------|---------|
| WebApp | Authorization Code | Server-side confidential client with `webapp` client ID |
| ClientApp (MAUI) | Authorization Code + PKCE | Public client with `maui` client ID |
| WebhookClient | Authorization Code | Server-side with `webhooksclient` client ID |
| Swagger UIs | Implicit | Browser-based interactive API testing |

### 11.3 Authorization Scopes

| Scope | Protects | Required By |
|-------|----------|-------------|
| `openid` | User identity | All clients |
| `profile` | User profile claims | All clients |
| `orders` | Ordering.API | WebApp, ClientApp |
| `basket` | Basket.API | WebApp, ClientApp |
| `webhooks` | Webhooks.API | WebhookClient, ClientApp |

### 11.4 Service-Level Security

| Service | Authentication | Authorization |
|---------|---------------|---------------|
| Catalog.API | None | Public access (read/write) |
| Basket.API | JWT Bearer | All gRPC methods (except `GetBasket` — anonymous allowed) |
| Ordering.API | JWT Bearer | All endpoints require authorization |
| Webhooks.API | JWT Bearer | All endpoints require authorization |
| Identity.API | Cookie-based (login UI) | N/A (is the auth provider) |

---

## 12. Observability & Monitoring

### 12.1 OpenTelemetry Configuration

All services share a common OpenTelemetry configuration via `eShop.ServiceDefaults`:

#### Logging
- OpenTelemetry structured logging enabled
- OTLP log exporter

#### Metrics
| Meter Source | Description |
|-------------|-------------|
| `Microsoft.AspNetCore.Hosting` | HTTP request metrics |
| `Microsoft.AspNetCore.Server.Kestrel` | Kestrel server metrics |
| `System.Net.Http` | Outgoing HTTP client metrics |
| `Microsoft.AspNetCore.Http.Connections` | SignalR/connection metrics |
| `Microsoft.AspNetCore.Routing` | Routing metrics |
| `Microsoft.AspNetCore.Diagnostics` | Diagnostics metrics |
| `Microsoft.AspNetCore.RateLimiting` | Rate limiting metrics |
| `OpenAI.*` | AI provider metrics |

#### Tracing
| Instrumentation | Description |
|-----------------|-------------|
| ASP.NET Core | Incoming HTTP request traces |
| gRPC Client | Outgoing gRPC call traces |
| HTTP Client | Outgoing HTTP call traces |
| RabbitMQ EventBus | Message publish/consume traces (custom `ActivitySource`) |
| OpenAI | AI API call traces |

#### Health Checks
| Endpoint | Purpose |
|----------|---------|
| `/health` | Full readiness check (all dependencies) |
| `/alive` | Simple liveness check (is the process running) |

### 12.2 .NET Aspire Dashboard

- Aggregates all telemetry from all services
- Accessible via login URL displayed in console output
- Provides:
  - Real-time log viewer with structured log filtering
  - Distributed trace viewer with service-to-service call graphs
  - Metrics dashboards
  - Service health status
  - Resource management (start/stop/restart services)

---

## 13. AI & Intelligent Features

### 13.1 Semantic Search (Catalog.API)

| Component | Purpose |
|-----------|---------|
| `ICatalogAI` / `CatalogAI` | Generates text embeddings using OpenAI/Ollama embedding models |
| pgvector | Stores embeddings alongside catalog items in PostgreSQL |
| Cosine Distance | Similarity metric for semantic search ordering |
| `/api/catalog/items/withsemanticrelevance/{text}` | Endpoint for AI-powered product search |

#### Flow
1. User submits natural language search text
2. `CatalogAI` generates embedding vector for the query
3. PostgreSQL pgvector performs cosine distance search against stored catalog embeddings
4. Results ranked by semantic similarity

### 13.2 AI Chat (WebApp)

- Optional conversational AI assistant for product discovery
- Uses OpenAI or Ollama chat completion models
- Integrated into the WebApp Blazor frontend

### 13.3 Configuration

AI features are **opt-in** and disabled by default:

```csharp
// In eShop.AppHost/Program.cs
bool useOpenAI = false;  // Set to true + configure connection string
bool useOllama = false;   // Set to true for local Ollama
```

**Provider Options:**
- **Azure OpenAI** — via `ConnectionStrings:OpenAi` in `appsettings.json`
- **OpenAI** — direct API access
- **Ollama** — local model hosting (community toolkit integration)

---

## 14. API Specifications

### 14.1 API Documentation

| Service | OpenAPI | UI |
|---------|---------|-----|
| Catalog.API | `/openapi/v1.json`, `/openapi/v2.json` | Scalar UI |
| Ordering.API | `/openapi/v1.json` | Scalar UI |
| Webhooks.API | `/openapi/v1.json` | Scalar UI |
| Basket.API | N/A (gRPC) | gRPC proto file |

### 14.2 API Versioning Strategy

| Service | Current Versions | Strategy |
|---------|-----------------|----------|
| Catalog.API | v1 (legacy), v2 (current) | URL-based versioning via `NewVersionedApi()` |
| Ordering.API | v1 | URL-based versioning |
| Webhooks.API | v1 | URL-based versioning |

### 14.3 Mobile BFF (YARP)

The `mobile-bff` YARP reverse proxy provides a unified gateway for mobile clients:

| Route Pattern | Upstream Service |
|---------------|-----------------|
| `/api/catalog/**` | Catalog.API |
| `/api/orders/**` | Ordering.API |
| `/connect/**` | Identity.API (OIDC) |

---

## 15. Testing Strategy

### 15.1 Test Projects

| Project | Type | Scope |
|---------|------|-------|
| `Basket.UnitTests` | Unit | Basket.API business logic |
| `Ordering.UnitTests` | Unit | Ordering domain logic, commands, handlers |
| `ClientApp.UnitTests` | Unit | MAUI ClientApp view models and services |
| `Catalog.FunctionalTests` | Functional | Catalog.API end-to-end with real dependencies (Aspire test containers) |
| `Ordering.FunctionalTests` | Functional | Ordering.API end-to-end with real dependencies (Aspire test containers) |

### 15.2 Testing Frameworks

| Framework | Version | Purpose |
|-----------|---------|---------|
| MSTest | 4.0.2 | Test framework (via MSTest.Sdk) |
| xUnit v3 | 3.2.1 | Alternative test framework |
| NSubstitute | 5.3.0 | Mocking library |
| Microsoft.AspNetCore.Mvc.Testing | 10.0.1 | Functional test infrastructure |
| Microsoft.AspNetCore.TestHost | 10.0.1 | Test server hosting |
| Microsoft.Testing.Platform | Latest | Test runner |

### 15.3 Functional Test Infrastructure

- Uses **.NET Aspire test containers** — spins up real PostgreSQL, Redis, and RabbitMQ containers
- **Requires Docker** to be running
- Tests actual HTTP/gRPC endpoints with real database schemas and migrations

### 15.4 End-to-End Tests (Playwright)

| Test File | Scope | Auth Required |
|-----------|-------|---------------|
| `BrowseItemTest.spec.ts` | Browse catalog, view product details | No |
| `AddItemTest.spec.ts` | Add item to shopping cart | Yes (authenticated) |
| `RemoveItemTest.spec.ts` | Remove item from cart | Yes (authenticated) |
| `login.setup.ts` | Authentication setup (stores session state) | N/A (setup fixture) |

#### Playwright Configuration

| Setting | Value |
|---------|-------|
| Base URL | `http://localhost:5045` |
| Browser | Desktop Chrome |
| Parallel | Fully parallel (local), sequential (CI) |
| Retries | 0 (local), 2 (CI) |
| Auth State | Persisted via Playwright `storageState` |
| Environment Variables | `USERNAME1`, `PASSWORD` (for login) |

---

## 16. Build, CI/CD & Deployment

### 16.1 Build System

| Tool | Purpose |
|------|---------|
| .NET SDK 10.0 | Primary build toolchain |
| MSBuild | Build engine |
| Central Package Management | `Directory.Packages.props` for centralized version control |
| Artifacts Output | `UseArtifactsOutput=true` — `artifacts/bin/`, `artifacts/obj/` |
| Solution Filter | `eShop.Web.slnf` for web-focused development |
| Solution | `eShop.slnx` for full project set |

### 16.2 Build Configuration

| Setting | Value |
|---------|-------|
| `TreatWarningsAsErrors` | `true` |
| `ImplicitUsings` | `enable` |
| `DebugType` | `embedded` |
| `OpenAI.Experimental.EnableOpenTelemetry` | `true` (runtime host config) |

### 16.3 CI Pipeline (Azure DevOps)

| Stage | Steps |
|-------|-------|
| Build | Install .NET SDK (from `global.json`) → `dotnet build eShop.Web.slnf` |
| SDL | PoliCheck (enabled), TSA (enabled) |
| Pool | `NetCore1ESPool-Svc-Internal` (Windows, VS 2019) |
| Timeout | 90 minutes |
| Trigger | Batch on `main` branch |

### 16.4 Container Build

| Script | Purpose |
|--------|---------|
| `build/acr-build/queue-all.ps1` | Queue ACR (Azure Container Registry) builds for all services |
| `build/multiarch-manifests/create-manifests.ps1` | Create multi-architecture container manifests |

### 16.5 Running the Application

```bash
# Terminal
dotnet run --project src/eShop.AppHost/eShop.AppHost.csproj

# Or Visual Studio: Set eShop.AppHost.csproj as startup project → Ctrl+F5
```

**Prerequisites:**
- .NET 10 SDK
- Docker Desktop (for PostgreSQL, Redis, RabbitMQ containers)
- Optional: Visual Studio 2022 17.10+ with ASP.NET workload

---

## 17. Non-Functional Requirements

### 17.1 Performance

| Requirement | Implementation |
|-------------|---------------|
| HTTP resilience | Polly resilience pipelines via `Microsoft.Extensions.Http.Resilience` |
| Efficient serialization | Source-generated `System.Text.Json`, Protobuf for gRPC |
| Connection pooling | EF Core + Npgsql connection pooling |
| Caching | Redis for basket data, reducing database load |
| Async messaging | RabbitMQ decouples synchronous request paths |

### 17.2 Reliability

| Requirement | Implementation |
|-------------|---------------|
| Transactional consistency | Outbox pattern (`IntegrationEventLogEF`) |
| Idempotent operations | `RequestManager` + `IdentifiedCommand` for order deduplication |
| Message retry | Polly resilience pipeline on RabbitMQ consumer |
| Health monitoring | `/health` and `/alive` endpoints on all services |
| Graceful degradation | AI features optional, app functions without them |

### 17.3 Scalability

| Requirement | Implementation |
|-------------|---------------|
| Service isolation | Database-per-service pattern |
| Stateless services | No in-process state (Redis for basket, PostgreSQL for orders) |
| Independent deployment | Each service is a separate project/container |
| Async processing | Background workers (OrderProcessor, PaymentProcessor) decouple long operations |

### 17.4 Maintainability

| Requirement | Implementation |
|-------------|---------------|
| Domain modeling | DDD with clear aggregate boundaries |
| Separation of concerns | CQRS separates read/write paths |
| Cross-cutting concerns | MediatR pipeline behaviors for logging, validation, transactions |
| Centralized configuration | `Directory.Packages.props`, `Directory.Build.props` |
| Code quality | `TreatWarningsAsErrors`, analyzers (NSubstitute.Analyzers) |

### 17.5 Observability

| Requirement | Implementation |
|-------------|---------------|
| Distributed tracing | OpenTelemetry with context propagation across HTTP, gRPC, RabbitMQ |
| Structured logging | OpenTelemetry logging with OTLP export |
| Metrics | Runtime, HTTP, ASP.NET, AI metrics |
| Dashboard | .NET Aspire Dashboard for unified observability |

---

## 18. Order Lifecycle & Business Flows

### 18.1 Complete Order State Machine

```
                         ┌──────────────┐
                         │  Submitted   │
                         └──────┬───────┘
                                │
                    Grace period expires
                    (OrderProcessor)
                                │
                         ┌──────▼───────┐
                    ┌────│  Awaiting    │────┐
                    │    │  Validation  │    │
                    │    └──────────────┘    │
                    │                        │
              Stock OK                Stock insufficient
             (Catalog.API)            (Catalog.API)
                    │                        │
             ┌──────▼───────┐         ┌──────▼───────┐
             │   Stock      │         │  Cancelled   │
             │  Confirmed   │         │              │
             └──────┬───────┘         └──────────────┘
                    │
            Payment processed
           (PaymentProcessor)
                    │
              ┌─────┴──────┐
              │             │
         Success         Failure
              │             │
       ┌──────▼───────┐  ┌──▼───────────┐
       │    Paid      │  │  Cancelled   │
       └──────┬───────┘  └──────────────┘
              │
         Admin ships
              │
       ┌──────▼───────┐
       │   Shipped    │
       └──────────────┘
```

### 18.2 End-to-End Order Flow

| Step | Actor | Action | Events |
|------|-------|--------|--------|
| 1 | User (WebApp) | Adds items to basket | gRPC → Basket.API → Redis |
| 2 | User (WebApp) | Submits order | POST → Ordering.API |
| 3 | Ordering.API | Creates order aggregate | Raises `OrderStartedDomainEvent` |
| 4 | Domain Handler | Verifies/creates buyer | Persists buyer + payment method |
| 5 | Ordering.API | Publishes integration event | `OrderStartedIntegrationEvent` → RabbitMQ |
| 6 | Basket.API | Deletes user's basket | Subscribes to `OrderStarted` |
| 7 | OrderProcessor | Detects grace period expiry | `GracePeriodConfirmedIntegrationEvent` |
| 8 | Ordering.API | Transitions to AwaitingValidation | `OrderStatusChangedToAwaitingValidation` |
| 9 | Catalog.API | Validates stock for all items | `OrderStockConfirmed` or `OrderStockRejected` |
| 10 | Ordering.API | Transitions to StockConfirmed | `OrderStatusChangedToStockConfirmed` |
| 11 | PaymentProcessor | Simulates payment | `OrderPaymentSucceeded` or `OrderPaymentFailed` |
| 12 | Ordering.API | Transitions to Paid | `OrderStatusChangedToPaid` |
| 13 | Catalog.API | Decrements stock | Subscribes to `OrderPaid` |
| 14 | Webhooks.API | Notifies subscribers | HTTP POST to registered webhook URLs |
| 15 | Admin | Ships order | PUT `/api/orders/ship` |
| 16 | Ordering.API | Transitions to Shipped | `OrderStatusChangedToShipped` |
| 17 | Webhooks.API | Notifies subscribers | HTTP POST to registered webhook URLs |

### 18.3 User Cancellation

Users can cancel orders that are in `Submitted` or `AwaitingValidation` status:
- PUT `/api/orders/cancel` with order ID
- Publishes `OrderStatusChangedToCancelledIntegrationEvent`

---

## 19. Configuration & Environment

### 19.1 .NET Aspire Resource Configuration

| Resource | Configuration |
|----------|--------------|
| Redis | Default configuration, used by Basket.API |
| RabbitMQ | Named `eventbus`, persistent container lifetime |
| PostgreSQL | Image `ankane/pgvector:latest`, persistent container lifetime, hosts 4 databases |

### 19.2 Key Environment Variables

| Variable | Purpose | Set By |
|----------|---------|--------|
| `Identity__Url` | Identity.API endpoint URL | AppHost → services |
| `CallBackUrl` | Self-referencing URL for OIDC callbacks | AppHost → WebApp, WebhookClient |
| `ESHOP_USE_HTTP_ENDPOINTS` | Force HTTP (for CI/testing) | CI environment |
| `ConnectionStrings:OpenAi` | Azure OpenAI connection | `appsettings.json` |
| `USERNAME1` / `PASSWORD` | E2E test credentials | `.env` file |

### 19.3 Service Discovery

- **.NET Aspire service discovery** provides automatic name-based service resolution
- Services reference each other by name (e.g., `basket-api`, `catalog-api`)
- No hardcoded URLs between services

### 19.4 Launch Profiles

| Profile | Protocol | Usage |
|---------|----------|-------|
| `https` | HTTPS | Default for development |
| `http` | HTTP | Used when `ESHOP_USE_HTTP_ENDPOINTS=1` (CI/testing) |

---

## 20. Glossary

| Term | Definition |
|------|-----------|
| **Aggregate** | DDD pattern — a cluster of domain objects treated as a single unit for data changes |
| **Aggregate Root** | The entry point entity of an aggregate, through which all modifications must occur |
| **BFF** | Backend for Frontend — a reverse proxy tailored for a specific client type |
| **Bounded Context** | A DDD concept defining the boundary within which a domain model applies |
| **CQRS** | Command Query Responsibility Segregation — separating read/write models |
| **Domain Event** | An event raised within the domain layer when something significant happens in the aggregate |
| **gRPC** | Google Remote Procedure Call — high-performance binary protocol for service-to-service communication |
| **Integration Event** | An event published across service boundaries via the message broker |
| **MediatR** | In-process mediator pattern library for CQRS command/query dispatching |
| **.NET Aspire** | Cloud-native stack for building observable, distributed .NET applications |
| **Outbox Pattern** | Ensures events are persisted atomically with domain state changes before publishing |
| **pgvector** | PostgreSQL extension for vector similarity search (AI embeddings) |
| **Value Object** | DDD pattern — an object defined by its attributes rather than identity |
| **YARP** | Yet Another Reverse Proxy — a .NET-based reverse proxy library |

---

*This PRD documents the eShop reference application as of .NET 10 / Aspire 13.1. The application is actively maintained by the .NET team as a canonical reference for cloud-native .NET development.*
