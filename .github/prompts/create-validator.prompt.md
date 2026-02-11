---
name: create-validator
description: Scaffold a FluentValidation validator for a command
agent: agent
argument-hint: "Name the command to validate, e.g.: CancelOrderCommand"
tools:
  - search/changes
  - edit/editFiles
  - search/codebase
  - edit/createFile
---

Create a FluentValidation validator for a MediatR command in `src/Ordering.API/Application/Validations/`.

Command to validate: ${input:command:Name the command, e.g. CancelOrderCommand}

## What to generate

A single validator class. Follow these examples exactly:
- Simple: [CancelOrderCommandValidator.cs](../../src/Ordering.API/Application/Validations/CancelOrderCommandValidator.cs)
- Complex: [CreateOrderCommandValidator.cs](../../src/Ordering.API/Application/Validations/CreateOrderCommandValidator.cs)

## Follow these conventions

- Read [validator template](../../.github/skills/cqrs-implementation/validator-template.md) for the structure
- Extend `AbstractValidator<TCommand>`, inject `ILogger` in constructor
- Infer rules from the command's properties (read the command file first)
- Auto-discovered — no manual DI registration needed
