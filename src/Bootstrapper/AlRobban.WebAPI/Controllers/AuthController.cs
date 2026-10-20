using System.Security.Claims;
using AlRobban.Modules.IdentityAndAccess.Application.Commands.Login;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }

        return Ok(result.Value);
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized();
        }

        return Ok(new
        {
            UserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            UserName = User.FindFirst(ClaimTypes.Name)?.Value,
            Email = User.FindFirst(ClaimTypes.Email)?.Value,
            Role = User.FindFirst(ClaimTypes.Role)?.Value,
            TenantId = User.FindFirst("tenant_id")?.Value,
            CompanyCode = User.FindFirst("company_code")?.Value,
            CompanyNameAr = User.FindFirst("company_name_ar")?.Value,
            CompanyNameEn = User.FindFirst("company_name_en")?.Value,
            CompanyLogo = User.FindFirst("company_logo")?.Value,
            BrandColor = User.FindFirst("brand_color")?.Value
        });
    }
}
