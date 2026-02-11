---
name: create-command
description: Scaffold a new MediatR command + handler + identified handler
agent: agent
argument-hint: "Describe the command purpose, e.g.: cancel order by order number"
tools:
  - search/changes
  - edit/editFiles
  - edit/createFile
  - search/codebase
---

Create a MediatR command, its handler, and identified command handler in `src/Ordering.API/Application/Commands/`.

User wants to create: ${input:description:Describe what the command does, e.g. cancel an order by order number}

## What to generate

1. **Command** — if 1-3 params, use `record` like [CancelOrderCommand.cs](../../src/Ordering.API/Application/Commands/CancelOrderCommand.cs). If 4+ params, use `[DataContract]` class like [CreateOrderCommand.cs](../../src/Ordering.API/Application/Commands/CreateOrderCommand.cs).
2. **Handler** — follow [CreateOrderCommandHandler.cs](../../src/Ordering.API/Application/Commands/CreateOrderCommandHandler.cs) exactly: inject repo + logger, fetch/create aggregate, call business methods, `SaveEntitiesAsync()`.
3. **Identified handler** — co-locate in same file as handler. Override `CreateResultForDuplicateRequest()` returning `true`.

## Follow these conventions

- Read [command instructions](../../.github/instructions/csharp-commands.instructions.md) for naming and style rules
- Read [command template](../../.github/skills/cqrs-implementation/command-template.md) for the full structure
- Business logic goes in the **aggregate**, not the handler
- Place all files in `src/Ordering.API/Application/Commands/`
