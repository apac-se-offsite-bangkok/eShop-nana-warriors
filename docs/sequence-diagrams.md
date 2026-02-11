# eShop Sequence Diagrams

This document contains sequence diagrams for the major flows in the eShop
reference application. All diagrams use [Mermaid](https://mermaid.js.org/)
syntax and render natively on GitHub.

---

## Table of Contents

1. [Catalog Browsing Flow](#1-catalog-browsing-flow)
2. [Basket / Cart Management Flow](#2-basket--cart-management-flow)
3. [Order Placement & Processing Flow](#3-order-placement--processing-flow)
4. [Order Grace Period Flow](#4-order-grace-period-flow)
5. [Authentication Flow](#5-authentication-flow)
6. [Integration Events Overview](#6-integration-events-overview)

---

## 1. Catalog Browsing Flow

The user browses the product catalog through the Blazor WebApp, which calls the
Catalog REST API. The API queries PostgreSQL (with pgvector for AI-powered
semantic search).

```mermaid
sequenceDiagram
    actor User
    participant WebApp as WebApp<br/>(Blazor Server)
    participant CatalogService as CatalogService<br/>(HTTP Client)
    participant CatalogAPI as Catalog.API<br/>(REST)
    participant DB as PostgreSQL<br/>(pgvector)

    User->>WebApp: Browse catalog page
    WebApp->>CatalogService: GetCatalogItems(page, pageSize, brand, type)
    CatalogService->>CatalogAPI: GET /api/catalog/items?pageIndex=0&pageSize=10
    CatalogAPI->>DB: SELECT from Catalog (EF Core query)
    DB-->>CatalogAPI: List of CatalogItem entities
    CatalogAPI-->>CatalogService: PaginatedItems<CatalogItem> (JSON)
    CatalogService-->>WebApp: CatalogResult
    WebApp-->>User: Render product grid

    Note over User,DB: Optional – AI semantic search

    User->>WebApp: Search "red shoes"
    WebApp->>CatalogService: GetCatalogItems(text="red shoes")
    CatalogService->>CatalogAPI: GET /api/catalog/items/withsemanticrelevance?text=red+shoes
    CatalogAPI->>DB: Vector similarity query (pgvector)
    DB-->>CatalogAPI: Ranked CatalogItem list
    CatalogAPI-->>CatalogService: PaginatedItems<CatalogItem>
    CatalogService-->>WebApp: CatalogResult
    WebApp-->>User: Render search results

    Note over User,DB: View single product

    User->>WebApp: Click product
    WebApp->>CatalogService: GetCatalogItem(itemId)
    CatalogService->>CatalogAPI: GET /api/catalog/items/{id}
    CatalogAPI->>DB: SELECT by Id
    DB-->>CatalogAPI: CatalogItem
    CatalogAPI-->>CatalogService: CatalogItem (JSON)
    CatalogService-->>WebApp: CatalogItem
    WebApp-->>User: Render product detail page
```

---

## 2. Basket / Cart Management Flow

The basket service uses **gRPC** for communication between the WebApp and
Basket.API, and **Redis** for persistence. When an order is placed, an
integration event clears the basket.

```mermaid
sequenceDiagram
    actor User
    participant WebApp as WebApp<br/>(Blazor Server)
    participant BasketState as BasketState<br/>(App State)
    participant BasketService as BasketService<br/>(gRPC Client)
    participant BasketAPI as Basket.API<br/>(gRPC)
    participant Redis as Redis<br/>(Cache)

    Note over User,Redis: Add item to basket

    User->>WebApp: Click "Add to Cart"
    WebApp->>BasketState: AddAsync(catalogItem)
    BasketState->>BasketService: UpdateBasketAsync(basket)
    BasketService->>BasketAPI: gRPC UpdateBasket(UpdateBasketRequest)
    BasketAPI->>Redis: SET basket:{buyerId} (serialized JSON)
    Redis-->>BasketAPI: OK
    BasketAPI-->>BasketService: CustomerBasketResponse
    BasketService-->>BasketState: Updated basket
    BasketState-->>WebApp: Basket updated
    WebApp-->>User: Show updated cart badge

    Note over User,Redis: View basket

    User->>WebApp: Open cart page
    WebApp->>BasketState: GetBasketItemsAsync()
    BasketState->>BasketService: GetBasketAsync()
    BasketService->>BasketAPI: gRPC GetBasket(GetBasketRequest)
    BasketAPI->>Redis: GET basket:{buyerId}
    Redis-->>BasketAPI: Serialized basket JSON
    BasketAPI-->>BasketService: CustomerBasketResponse
    BasketService-->>BasketState: List of BasketItems
    BasketState-->>WebApp: BasketItems
    WebApp-->>User: Render cart with items

    Note over User,Redis: Delete basket (triggered by order creation)

    participant RabbitMQ as RabbitMQ<br/>(Event Bus)
    RabbitMQ->>BasketAPI: OrderStartedIntegrationEvent
    BasketAPI->>Redis: DEL basket:{buyerId}
    Redis-->>BasketAPI: OK
```

---

## 3. Order Placement & Processing Flow

This is the most complex flow in the application, spanning multiple services and
using **CQRS**, **Domain Events**, **Integration Events**, and the
**Transactional Outbox** pattern.

### 3a. Order Creation

```mermaid
sequenceDiagram
    actor User
    participant WebApp as WebApp<br/>(Blazor Server)
    participant OrderingService as OrderingService<br/>(HTTP Client)
    participant OrderingAPI as Ordering.API<br/>(REST)
    participant MediatR as MediatR<br/>(CQRS)
    participant OrderAggregate as Order<br/>(Domain)
    participant OrderDB as PostgreSQL<br/>(OrderingDb)
    participant EventLog as IntegrationEvent<br/>LogService
    participant RabbitMQ as RabbitMQ<br/>(Event Bus)
    participant BasketAPI as Basket.API

    User->>WebApp: Click "Place Order"
    WebApp->>OrderingService: CreateOrder(request, requestId)
    OrderingService->>OrderingAPI: POST /api/orders (x-requestid header)

    OrderingAPI->>MediatR: Send CreateOrderCommand
    Note over MediatR: IdentifiedCommandHandler checks<br/>idempotency via requestId

    MediatR->>OrderAggregate: new Order(address, cardInfo, items)
    OrderAggregate->>OrderAggregate: AddOrderItem() for each item
    OrderAggregate->>OrderAggregate: AddDomainEvent(OrderStartedDomainEvent)

    MediatR->>OrderDB: SaveEntitiesAsync() (UnitOfWork)
    Note over OrderDB: Saves Order + dispatches domain events<br/>in same transaction

    OrderDB->>EventLog: AddAndSaveEventAsync(OrderStartedIntegrationEvent)
    EventLog->>OrderDB: Save event to IntegrationEventLog table
    OrderDB-->>MediatR: Saved

    MediatR->>EventLog: PublishThroughEventBusAsync()
    EventLog->>RabbitMQ: Publish OrderStartedIntegrationEvent
    RabbitMQ->>BasketAPI: OrderStartedIntegrationEvent
    BasketAPI->>BasketAPI: Clear basket for buyer

    OrderingAPI-->>OrderingService: 200 OK
    OrderingService-->>WebApp: Order created
    WebApp-->>User: Show order confirmation
```

### 3b. Stock Validation & Payment Processing

```mermaid
sequenceDiagram
    participant OrderingAPI as Ordering.API
    participant RabbitMQ as RabbitMQ<br/>(Event Bus)
    participant CatalogAPI as Catalog.API
    participant PaymentProcessor as Payment<br/>Processor
    participant OrderDB as PostgreSQL<br/>(OrderingDb)

    Note over OrderingAPI,OrderDB: After order is submitted and grace period passes

    OrderingAPI->>RabbitMQ: OrderStatusChangedToAwaitingValidationIntegrationEvent
    RabbitMQ->>CatalogAPI: (subscribed)

    CatalogAPI->>CatalogAPI: Check AvailableStock for each OrderStockItem

    alt All items in stock
        CatalogAPI->>RabbitMQ: OrderStockConfirmedIntegrationEvent
        RabbitMQ->>OrderingAPI: (subscribed)
        OrderingAPI->>OrderDB: Update Order status → StockConfirmed
        OrderingAPI->>RabbitMQ: OrderStatusChangedToStockConfirmedIntegrationEvent

        RabbitMQ->>PaymentProcessor: (subscribed)

        alt Payment succeeds
            PaymentProcessor->>RabbitMQ: OrderPaymentSucceededIntegrationEvent
            RabbitMQ->>OrderingAPI: (subscribed)
            OrderingAPI->>OrderDB: Update Order status → Paid
            OrderingAPI->>RabbitMQ: OrderStatusChangedToPaidIntegrationEvent
        else Payment fails
            PaymentProcessor->>RabbitMQ: OrderPaymentFailedIntegrationEvent
            RabbitMQ->>OrderingAPI: (subscribed)
            OrderingAPI->>OrderDB: Update Order status → Cancelled
        end

    else Some items out of stock
        CatalogAPI->>RabbitMQ: OrderStockRejectedIntegrationEvent
        RabbitMQ->>OrderingAPI: (subscribed)
        OrderingAPI->>OrderDB: Update Order status → Cancelled
    end
```

### 3c. Complete Order State Machine

```mermaid
stateDiagram-v2
    [*] --> Submitted : CreateOrderCommand
    Submitted --> AwaitingValidation : GracePeriodConfirmed
    AwaitingValidation --> StockConfirmed : OrderStockConfirmed
    AwaitingValidation --> Cancelled : OrderStockRejected
    StockConfirmed --> Paid : OrderPaymentSucceeded
    StockConfirmed --> Cancelled : OrderPaymentFailed
    Paid --> Shipped : ShipOrderCommand
    Submitted --> Cancelled : CancelOrderCommand
    Cancelled --> [*]
    Shipped --> [*]
```

---

## 4. Order Grace Period Flow

The **OrderProcessor** background service manages a configurable grace period
before orders proceed to validation. This allows buyers to cancel recently
placed orders.

```mermaid
sequenceDiagram
    participant OrderProcessor as OrderProcessor<br/>(Background Service)
    participant OrderDB as PostgreSQL<br/>(OrderingDb)
    participant RabbitMQ as RabbitMQ<br/>(Event Bus)
    participant OrderingAPI as Ordering.API

    loop Every CheckUpdateTime seconds
        OrderProcessor->>OrderDB: Query orders WHERE<br/>status = 'Submitted' AND<br/>CreatedTime + GracePeriod ≤ NOW
        OrderDB-->>OrderProcessor: List of expired orders

        loop For each expired order
            OrderProcessor->>RabbitMQ: GracePeriodConfirmedIntegrationEvent(orderId)
            RabbitMQ->>OrderingAPI: (subscribed)
            OrderingAPI->>OrderingAPI: SetAwaitingValidationOrderStatusCommand
            OrderingAPI->>OrderDB: Update Order status → AwaitingValidation
            OrderingAPI->>RabbitMQ: OrderStatusChangedToAwaitingValidationIntegrationEvent
        end
    end
```

---

## 5. Authentication Flow

Identity.API acts as the **OpenID Connect** provider (Duende IdentityServer).
The WebApp authenticates users and includes JWT tokens when calling downstream
APIs.

```mermaid
sequenceDiagram
    actor User
    participant WebApp as WebApp<br/>(Blazor Server)
    participant IdentityAPI as Identity.API<br/>(Duende IdentityServer)
    participant IdentityDB as PostgreSQL<br/>(IdentityDb)
    participant API as Downstream API<br/>(Catalog / Ordering / Basket)

    Note over User,API: User login

    User->>WebApp: Access protected page
    WebApp->>WebApp: Check authentication cookie
    WebApp-->>User: 302 Redirect to Identity.API /connect/authorize

    User->>IdentityAPI: GET /connect/authorize (OIDC request)
    IdentityAPI-->>User: Login page

    User->>IdentityAPI: POST credentials (username, password)
    IdentityAPI->>IdentityDB: Validate user (AspNetUsers)
    IdentityDB-->>IdentityAPI: User found & password valid

    IdentityAPI->>IdentityAPI: Generate authorization code
    IdentityAPI-->>User: 302 Redirect to WebApp callback

    User->>WebApp: Callback with authorization code
    WebApp->>IdentityAPI: POST /connect/token (exchange code for tokens)
    IdentityAPI-->>WebApp: JWT access token + refresh token

    WebApp->>WebApp: Store tokens in auth cookie (2h lifetime)
    WebApp-->>User: Redirect to original page (authenticated)

    Note over User,API: Authenticated API call

    User->>WebApp: Place order
    WebApp->>WebApp: Retrieve JWT from cookie
    WebApp->>API: POST /api/orders<br/>Authorization: Bearer {JWT}
    API->>API: Validate JWT signature & claims
    API-->>WebApp: 200 OK (order response)
    WebApp-->>User: Order confirmation
```

---

## 6. Integration Events Overview

All inter-service communication flows through **RabbitMQ** using the
publish/subscribe pattern. Events are persisted in an **IntegrationEventLog**
table (transactional outbox) before being published.

```mermaid
sequenceDiagram
    participant OrderingAPI as Ordering.API
    participant BasketAPI as Basket.API
    participant CatalogAPI as Catalog.API
    participant PaymentProc as PaymentProcessor
    participant OrderProc as OrderProcessor
    participant WebhooksAPI as Webhooks.API
    participant WebApp as WebApp
    participant RabbitMQ as RabbitMQ<br/>(Event Bus)

    Note over OrderingAPI,RabbitMQ: Order lifecycle events

    OrderingAPI->>RabbitMQ: OrderStartedIntegrationEvent
    RabbitMQ->>BasketAPI: → Clear buyer's basket

    OrderProc->>RabbitMQ: GracePeriodConfirmedIntegrationEvent
    RabbitMQ->>OrderingAPI: → Set AwaitingValidation status

    OrderingAPI->>RabbitMQ: OrderStatusChangedToAwaitingValidationIntegrationEvent
    RabbitMQ->>CatalogAPI: → Validate stock levels

    CatalogAPI->>RabbitMQ: OrderStockConfirmedIntegrationEvent
    RabbitMQ->>OrderingAPI: → Set StockConfirmed status

    CatalogAPI->>RabbitMQ: OrderStockRejectedIntegrationEvent
    RabbitMQ->>OrderingAPI: → Cancel order

    OrderingAPI->>RabbitMQ: OrderStatusChangedToStockConfirmedIntegrationEvent
    RabbitMQ->>PaymentProc: → Process payment

    PaymentProc->>RabbitMQ: OrderPaymentSucceededIntegrationEvent
    RabbitMQ->>OrderingAPI: → Set Paid status

    PaymentProc->>RabbitMQ: OrderPaymentFailedIntegrationEvent
    RabbitMQ->>OrderingAPI: → Cancel order

    Note over OrderingAPI,RabbitMQ: Status notification events

    OrderingAPI->>RabbitMQ: OrderStatusChangedToPaidIntegrationEvent
    RabbitMQ->>WebApp: → Notify UI
    RabbitMQ->>WebhooksAPI: → Trigger webhooks
    RabbitMQ->>CatalogAPI: → Reduce stock

    OrderingAPI->>RabbitMQ: OrderStatusChangedToShippedIntegrationEvent
    RabbitMQ->>WebApp: → Notify UI

    OrderingAPI->>RabbitMQ: OrderStatusChangedToCancelledIntegrationEvent
    RabbitMQ->>WebApp: → Notify UI

    Note over CatalogAPI,RabbitMQ: Catalog events

    CatalogAPI->>RabbitMQ: ProductPriceChangedIntegrationEvent
    RabbitMQ->>WebhooksAPI: → Trigger price-change webhooks
```

---

## Service Dependency Map

The diagram below shows how services depend on each other and on shared
infrastructure, as defined in the Aspire AppHost.

```mermaid
graph TD
    subgraph Infrastructure
        PG[(PostgreSQL)]
        Redis[(Redis)]
        RabbitMQ{{RabbitMQ}}
    end

    subgraph Databases
        PG --> CatalogDb[(catalogdb)]
        PG --> IdentityDb[(identitydb)]
        PG --> OrderingDb[(orderingdb)]
        PG --> WebhooksDb[(webhooksdb)]
    end

    subgraph Services
        IdentityAPI[Identity.API]
        CatalogAPI[Catalog.API]
        BasketAPI[Basket.API]
        OrderingAPI[Ordering.API]
        OrderProcessor[OrderProcessor]
        PaymentProcessor[PaymentProcessor]
        WebhooksAPI[Webhooks.API]
        WebApp[WebApp]
    end

    CatalogAPI --> CatalogDb
    CatalogAPI --> RabbitMQ
    IdentityAPI --> IdentityDb
    BasketAPI --> Redis
    BasketAPI --> RabbitMQ
    OrderingAPI --> OrderingDb
    OrderingAPI --> RabbitMQ
    OrderProcessor --> OrderingDb
    OrderProcessor --> RabbitMQ
    PaymentProcessor --> RabbitMQ
    WebhooksAPI --> WebhooksDb
    WebhooksAPI --> RabbitMQ
    WebApp --> RabbitMQ

    WebApp -->|HTTP| CatalogAPI
    WebApp -->|gRPC| BasketAPI
    WebApp -->|HTTP| OrderingAPI

    CatalogAPI -.->|JWT validation| IdentityAPI
    BasketAPI -.->|JWT validation| IdentityAPI
    OrderingAPI -.->|JWT validation| IdentityAPI
    WebhooksAPI -.->|JWT validation| IdentityAPI
    WebApp -.->|OIDC login| IdentityAPI
```
