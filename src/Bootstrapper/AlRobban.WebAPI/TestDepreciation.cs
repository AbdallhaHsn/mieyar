using System;
using System.Linq;
using System.Threading.Tasks;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AlRobban.WebAPI;

public static class TestDepreciation
{
    public static async Task Run(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GeneralLedgerDbContext>();
        var asset = await db.FixedAssets.FirstOrDefaultAsync();
        if (asset == null)
        {
            Console.WriteLine("Asset is null");
            return;
        }

        Console.WriteLine($"Found asset: {asset.AssetCode}, CurrentBookValue: {asset.CurrentBookValue}");
        try
        {
            asset.ApplyDepreciation(new DateTime(2026, 10, 31), 10, 2026, 1500, Guid.NewGuid(), "TEST-01", "Admin");
            await db.SaveChangesAsync();
            Console.WriteLine("SUCCESS updating asset!");
        }
        catch (Exception ex)
        {
            Console.WriteLine("EXCEPTION: " + ex.ToString());
        }
    }
}
