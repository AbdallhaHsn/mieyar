using Microsoft.AspNetCore.SignalR;

namespace AlRobban.WebAPI.Hubs;

public interface INotificationClient
{
    Task ReceiveNotification(string title, string message, string type);
    Task InvoiceStatusUpdated(string invoiceId, string status, string? zatcaWarning);
    Task FinancialPostingCompleted(string journalEntryId, string status);
}

public class NotificationHub : Hub<INotificationClient>
{
    private string? CallerTenantId() => Context.User?.FindFirst("tenant_id")?.Value;

    private bool IsSuperAdmin() => Context.User?.IsInRole("SuperAdmin") == true;

    // The requested tenant is honoured only for the platform owner; everyone else is pinned to their own tenant.
    private string? ResolveTenant(string requestedTenantId) =>
        IsSuperAdmin() && Guid.TryParse(requestedTenantId, out _) ? requestedTenantId : CallerTenantId();

    public async Task JoinTenantGroup(string tenantId)
    {
        var tenant = ResolveTenant(tenantId);
        if (string.IsNullOrEmpty(tenant)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenant}");
    }

    public async Task LeaveTenantGroup(string tenantId)
    {
        var tenant = ResolveTenant(tenantId);
        if (string.IsNullOrEmpty(tenant)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"tenant-{tenant}");
    }
}
