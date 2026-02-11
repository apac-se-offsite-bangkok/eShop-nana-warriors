# FluentValidation Validator Template

## File placement

`src/{Service}.API/Application/Validations/{CommandName}Validator.cs`

Validators extend `AbstractValidator<TCommand>` from FluentValidation 12.0.0. Auto-discovered via `services.AddValidatorsFromAssemblyContaining<>()`. Executed in the `ValidatorBehavior` pipeline behavior.

## Validator

```csharp
namespace eShop.{Service}.API.Application.Validations;

public class {CommandName}Validator : AbstractValidator<{CommandName}>
{
    public {CommandName}Validator(ILogger<{CommandName}Validator> logger)
    {
        // Required field validations
        RuleFor(command => command.{Property}).NotEmpty().WithMessage("No {property} found");

        // String length validations
        // RuleFor(command => command.Name).Length(1, 100).WithMessage("Name must be between 1 and 100 characters");

        // Numeric range validations
        // RuleFor(command => command.Quantity).GreaterThan(0).WithMessage("Quantity must be greater than 0");

        // Custom predicate validations
        // RuleFor(command => command.CardExpiration).Must(BeValidExpirationDate).WithMessage("Card is expired");

        // Collection validations
        // RuleFor(command => command.OrderItems).Must(ContainOrderItems).WithMessage("No order items found");

        // Trace logging for diagnostics
        if (logger.IsEnabled(LogLevel.Trace))
        {
            logger.LogTrace("INSTANCE CREATED - {ClassName}", GetType().Name);
        }
    }

    // Custom validation methods
    // private bool BeValidExpirationDate(DateTime dateTime) => dateTime >= DateTime.UtcNow;
    // private bool ContainOrderItems(IEnumerable<OrderItemDTO> orderItems) => orderItems.Any();
}
```

No manual DI registration needed — FluentValidation discovers all validators in the assembly automatically.
