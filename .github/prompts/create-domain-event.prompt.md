---
name: create-domain-event
description: Scaffold a domain event and its handler
agent: agent
argument-hint: "Describe the event, e.g.: order status changed to shipped"
tools:
  - search/changes
  - edit/editFiles
  - search/codebase
  - edit/createFile
---

Create a domain event and its handler. The event goes in Domain, the handler in API.

User wants: ${input:event:Describe the domain event, e.g. order shipped, payment verified}

## What to generate

1. **Domain event** in `src/Ordering.Domain/Events/` — `record class` implementing `INotification`, like [OrderStartedDomainEvent.cs](../../src/Ordering.Domain/Events/OrderStartedDomainEvent.cs)
2. **Handler** in `src/Ordering.API/Application/DomainEventHandlers/` — like [OrderCancelledDomainEventHandler.cs](../../src/Ordering.API/Application/DomainEventHandlers/OrderCancelledDomainEventHandler.cs): fetch related data → create integration event → `AddAndSaveEventAsync()`
3. **Tell the user** where to add `AddDomainEvent(new XDomainEvent(...))` in the [aggregate](../../src/Ordering.Domain/AggregatesModel/OrderAggregate/Order.cs)

## Follow these conventions

- Read [domain instructions](../../.github/instructions/csharp-domain.instructions.md) for naming/style
- Read [domain event template](../../.github/skills/cqrs-implementation/domain-event-template.md) for structure
- Events are raised in aggregate methods — NEVER in handlers
- Dispatched BEFORE `SaveChangesAsync()` (same transaction)
