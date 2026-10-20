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
    public async Task JoinTenantGroup(string tenantId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
    }

    public async Task LeaveTenantGroup(string tenantId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
    }
}
