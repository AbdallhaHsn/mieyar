using AlRobban.Modules.DocumentManagement.Infrastructure.Persistence;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using AlRobban.Modules.IdentityAndAccess.Infrastructure.Persistence;
using AlRobban.Modules.InvoicingAndZatca.Infrastructure.Persistence;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AlRobban.WebAPI.DesignTime;

/// <summary>
/// Design-time factories used ONLY by `dotnet ef migrations ...`.
/// They build each module DbContext without booting the web host (so no startup side-effects touch the database).
/// Connection string: env ALROBBAN_DESIGN_CONNECTION, otherwise the local default.
/// </summary>
internal static class DesignTimeSupport
{
    public static string ConnectionString =>
        Environment.GetEnvironmentVariable("ALROBBAN_DESIGN_CONNECTION")
        ?? "Server=localhost;Database=AlRobbanDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";

    public static DbContextOptions<T> Options<T>(string historySchema) where T : DbContext =>
        new DbContextOptionsBuilder<T>()
            .UseSqlServer(ConnectionString, o => o.MigrationsHistoryTable("__EFMigrationsHistory", historySchema))
            .Options;

    public sealed class NoTenant : ICurrentTenantContext
    {
        public Guid? TenantId => null;
        public string? TenantCode => null;
        public string? UserId => null;
        public string? UserName => null;
        public string? UserDisplayName => null;
        public string? Role => null;
        public bool IsSuperAdmin => false;
        public bool IsAuthenticated => false;
        public void SetTenant(Guid tenantId, string? code = null) { }
    }
}

internal sealed class GeneralLedgerDesignFactory : IDesignTimeDbContextFactory<GeneralLedgerDbContext>
{
    public GeneralLedgerDbContext CreateDbContext(string[] args) =>
        new(DesignTimeSupport.Options<GeneralLedgerDbContext>("gl"), new DesignTimeSupport.NoTenant(), null!);
}

internal sealed class IdentityDesignFactory : IDesignTimeDbContextFactory<IdentityAndAccessDbContext>
{
    public IdentityAndAccessDbContext CreateDbContext(string[] args) =>
        new(DesignTimeSupport.Options<IdentityAndAccessDbContext>("identity"), new DesignTimeSupport.NoTenant(), null!);
}

internal sealed class InvoicingDesignFactory : IDesignTimeDbContextFactory<InvoicingDbContext>
{
    public InvoicingDbContext CreateDbContext(string[] args) =>
        new(DesignTimeSupport.Options<InvoicingDbContext>("inv"), new DesignTimeSupport.NoTenant(), null!);
}

internal sealed class PurchasingDesignFactory : IDesignTimeDbContextFactory<PurchasingDbContext>
{
    public PurchasingDbContext CreateDbContext(string[] args) =>
        new(DesignTimeSupport.Options<PurchasingDbContext>("pur"), new DesignTimeSupport.NoTenant(), null!);
}

internal sealed class DocumentManagementDesignFactory : IDesignTimeDbContextFactory<DocumentManagementDbContext>
{
    public DocumentManagementDbContext CreateDbContext(string[] args) =>
        new(DesignTimeSupport.Options<DocumentManagementDbContext>("doc"), new DesignTimeSupport.NoTenant(), null!);
}

internal sealed class HumanResourcesDesignFactory : IDesignTimeDbContextFactory<AlRobban.Modules.HumanResources.Infrastructure.Persistence.HumanResourcesDbContext>
{
    public AlRobban.Modules.HumanResources.Infrastructure.Persistence.HumanResourcesDbContext CreateDbContext(string[] args) =>
        new(DesignTimeSupport.Options<AlRobban.Modules.HumanResources.Infrastructure.Persistence.HumanResourcesDbContext>("hr"), new DesignTimeSupport.NoTenant(), null!);
}

