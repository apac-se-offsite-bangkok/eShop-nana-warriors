# Minimal API Endpoint Template

## File placement

- Endpoint: `src/{Service}.API/Apis/{Name}Api.cs`
- Services: `src/{Service}.API/Apis/{Name}Services.cs`

## Aggregated Services Class

```csharp
public class {Name}Services(
    IMediator mediator,
    I{Name}Queries queries,
    IIdentityService identityService,
    ILogger<{Name}Services> logger)
{
    public IMediator Mediator { get; set; } = mediator;
    public ILogger<{Name}Services> Logger { get; } = logger;
    public I{Name}Queries Queries { get; } = queries;
    public IIdentityService IdentityService { get; } = identityService;
}
```

## API Endpoint Class

```csharp
using Microsoft.AspNetCore.Http.HttpResults;

public static class {Name}Api
{
    public static RouteGroupBuilder Map{Name}ApiV1(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("api/{name}").HasApiVersion(1.0);
        api.MapGet("{id:int}", GetAsync);
        api.MapGet("/", GetAllAsync);
        api.MapPost("/", CreateAsync);
        api.MapPut("/cancel", CancelAsync);
        return api;
    }

    // GET by ID (query, no MediatR)
    public static async Task<Results<Ok<{DetailViewModel}>, NotFound>> GetAsync(
        int id, [AsParameters] {Name}Services services)
    {
        try
        {
            var result = await services.Queries.Get{Name}Async(id);
            return TypedResults.Ok(result);
        }
        catch { return TypedResults.NotFound(); }
    }

    // GET list (query, no MediatR)
    public static async Task<Ok<IEnumerable<{SummaryViewModel}>>> GetAllAsync(
        [AsParameters] {Name}Services services)
    {
        var userId = services.IdentityService.GetUserIdentity();
        var items = await services.Queries.Get{Name}sFromUserAsync(userId);
        return TypedResults.Ok(items);
    }

    // POST create (command via MediatR + idempotency)
    public static async Task<Results<Ok, BadRequest<string>>> CreateAsync(
        [FromHeader(Name = "x-requestid")] Guid requestId,
        Create{Name}Request request,
        [AsParameters] {Name}Services services)
    {
        if (requestId == Guid.Empty)
            return TypedResults.BadRequest("RequestId is missing.");

        var command = new Create{Name}Command(/* map from request */);
        var identified = new IdentifiedCommand<Create{Name}Command, bool>(command, requestId);
        var result = await services.Mediator.Send(identified);
        return TypedResults.Ok();
    }

    // PUT cancel (command via MediatR + idempotency)
    public static async Task<Results<Ok, BadRequest<string>, ProblemHttpResult>> CancelAsync(
        [FromHeader(Name = "x-requestid")] Guid requestId,
        Cancel{Name}Command command,
        [AsParameters] {Name}Services services)
    {
        if (requestId == Guid.Empty)
            return TypedResults.BadRequest("Empty GUID is not valid for request ID");

        var identified = new IdentifiedCommand<Cancel{Name}Command, bool>(command, requestId);
        var commandResult = await services.Mediator.Send(identified);

        if (!commandResult)
            return TypedResults.Problem(detail: "Cancel failed to process.", statusCode: 500);

        return TypedResults.Ok();
    }
}
```

Register in `Program.cs`: `app.Map{Name}ApiV1();`
