using System.Collections;
using System.Reflection;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace AlRobban.WebAPI.Security;

/// <summary>
/// Marks controllers/actions that legitimately operate without a resolved tenant
/// (e.g. platform-level company administration, "who am I").
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class SkipTenantEnforcementAttribute : Attribute { }

/// <summary>
/// Server-side tenant guard:
///  1. Rejects any tenant-scoped request when no tenant can be resolved from the JWT
///     (or X-Tenant-Id for SuperAdmin).
///  2. Overwrites every client-supplied companyId / tenantId (query params and request bodies)
///     with the authenticated tenant, so a caller can never address another company.
/// </summary>
public sealed class TenantEnforcementFilter : IAsyncActionFilter
{
    private static readonly string[] TenantPropertyNames = { "CompanyId", "TenantId" };
    private readonly ICurrentTenantContext _tenant;

    public TenantEnforcementFilter(ICurrentTenantContext tenant)
    {
        _tenant = tenant;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var metadata = context.ActionDescriptor.EndpointMetadata;
        if (metadata.OfType<IAllowAnonymous>().Any() || metadata.OfType<SkipTenantEnforcementAttribute>().Any())
        {
            await next();
            return;
        }

        var tenantId = _tenant.TenantId;
        if (tenantId is null)
        {
            context.Result = new ObjectResult(new
            {
                code = "Tenant.Required",
                message = _tenant.IsSuperAdmin
                    ? "يجب تحديد الشركة المستهدفة (ترويسة X-Tenant-Id) قبل تنفيذ هذه العملية."
                    : "تعذر تحديد الشركة المرتبطة بحسابك."
            })
            { StatusCode = StatusCodes.Status400BadRequest };
            return;
        }

        foreach (var parameter in context.ActionDescriptor.Parameters)
        {
            if (!context.ActionArguments.TryGetValue(parameter.Name, out var value)) continue;

            var type = parameter.ParameterType;
            if (IsGuidType(type) &&
                (parameter.Name.Equals("companyId", StringComparison.OrdinalIgnoreCase) ||
                 parameter.Name.Equals("tenantId", StringComparison.OrdinalIgnoreCase)))
            {
                context.ActionArguments[parameter.Name] = tenantId.Value;
                continue;
            }

            if (value != null)
            {
                Overwrite(value, tenantId.Value, depth: 0);
            }
        }

        await next();
    }

    private static void Overwrite(object target, Guid tenantId, int depth)
    {
        var type = target.GetType();
        if (type.IsPrimitive || type.IsEnum || type == typeof(string) || type == typeof(Guid) || target is IEnumerable)
        {
            return;
        }

        foreach (var property in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (property.GetIndexParameters().Length > 0) continue;

            if (TenantPropertyNames.Contains(property.Name, StringComparer.OrdinalIgnoreCase) &&
                IsGuidType(property.PropertyType) &&
                property.SetMethod != null)
            {
                property.SetValue(target, tenantId);
                continue;
            }

            // Descend one level into our own DTOs (e.g. command.Request.CompanyId)
            if (depth < 2 &&
                property.CanRead &&
                !property.PropertyType.IsValueType &&
                property.PropertyType != typeof(string) &&
                !typeof(IEnumerable).IsAssignableFrom(property.PropertyType) &&
                property.PropertyType.Namespace?.StartsWith("AlRobban", StringComparison.Ordinal) == true)
            {
                var child = property.GetValue(target);
                if (child != null) Overwrite(child, tenantId, depth + 1);
            }
        }
    }

    private static bool IsGuidType(Type type) =>
        type == typeof(Guid) || Nullable.GetUnderlyingType(type) == typeof(Guid);
}
