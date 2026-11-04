using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AlRobban.WebAPI.Security;

/// <summary>
/// Marks a state-changing action (approve / post / reverse ...) that a <c>FinancialAuditor</c>
/// is allowed to execute. Every other write endpoint is read-only for auditors.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class AllowAuditorWriteAttribute : Attribute { }

/// <summary>
/// Global guard: a FinancialAuditor may read everything their role can reach and perform only the
/// approval/posting actions explicitly tagged with <see cref="AllowAuditorWriteAttribute"/>.
/// Any other POST/PUT/PATCH/DELETE issued by an auditor is rejected with 403.
/// </summary>
public sealed class AuditorWriteGuardFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var isSafeMethod = HttpMethods.IsGet(http.Request.Method)
                           || HttpMethods.IsHead(http.Request.Method)
                           || HttpMethods.IsOptions(http.Request.Method);

        if (!isSafeMethod && http.User.IsInRole(AppRoles.FinancialAuditor))
        {
            var metadata = context.ActionDescriptor.EndpointMetadata;
            var allowed = metadata.OfType<AllowAuditorWriteAttribute>().Any()
                          || metadata.OfType<IAllowAnonymous>().Any()
                          || http.Request.Path.StartsWithSegments("/api/auth");

            if (!allowed)
            {
                context.Result = new ObjectResult(new
                {
                    code = "Auditor.ReadOnly",
                    description = "حساب المراجع المالي للقراءة والاعتماد فقط ولا يملك صلاحية التعديل على هذه العملية."
                })
                { StatusCode = StatusCodes.Status403Forbidden };
                return;
            }
        }

        await next();
    }
}
