---
name: create-integration-event
description: Scaffold an integration event + handler for cross-service messaging
agent: agent
argument-hint: "Describe the event, e.g.: order stock confirmed"
tools:
  - search/changes
  - edit/editFiles
  - search/codebase
  - edit/createFile
---

Create an integration event record and its handler for cross-service communication via RabbitMQ.

User wants: ${input:event:Describe the integration event, e.g. order stock confirmed, payment failed}

## What to generate

1. **Event record** in `src/Ordering.API/Application/IntegrationEvents/Events/` — extend [IntegrationEvent](../../src/EventBus/Events/IntegrationEvent.cs) base, like existing events in that folder
2. **Handler** in `src/Ordering.API/Application/IntegrationEvents/EventHandling/` — use primary constructor, inject `IMediator` + `ILogger`, create and send a command. See existing [handlers](../../src/Ordering.API/Application/IntegrationEvents/EventHandling/) for examples.
3. **Tell the user** to register in [Extensions.cs](../../src/Ordering.API/Extensions/Extensions.cs) `AddEventBusSubscriptions()` method:
   `eventBus.AddSubscription<XIntegrationEvent, XIntegrationEventHandler>();`

## Follow these conventions

- Read [integration event template](../../.github/skills/cqrs-implementation/integration-event-template.md)
- Events are `record` types — self-contained, no domain entity references
- Handlers send MediatR commands — they do NOT modify aggregates directly
