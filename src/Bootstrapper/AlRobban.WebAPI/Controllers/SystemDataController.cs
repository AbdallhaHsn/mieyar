using System.Text.Json;
using AlRobban.Modules.Purchasing.Domain.Entities;
using AlRobban.Modules.Purchasing.Infrastructure.Persistence;
using AlRobban.Shared.Application.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Authorize]
public class SystemDataController : ControllerBase
{
    private readonly PurchasingDbContext _purchasingDb;
    private readonly ICurrentTenantContext _tenantContext;

    public SystemDataController(
        PurchasingDbContext purchasingDb,
        ICurrentTenantContext tenantContext)
    {
        _purchasingDb = purchasingDb;
        _tenantContext = tenantContext;
    }

    private Guid GetEffectiveCompanyId(Guid? companyId)
    {
        if (companyId.HasValue && companyId.Value != Guid.Empty) return companyId.Value;
        return _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : Guid.Parse("11111111-2222-3333-4444-555555555555");
    }

    // =========================================================================
    // 1. Item Categories Endpoints (/api/items/categories)
    // =========================================================================
    [HttpGet("api/items/categories")]
    public async Task<IActionResult> GetItemCategories([FromQuery] Guid? companyId, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var list = await _purchasingDb.ItemCategories.AsNoTracking()
            .Where(c => c.CompanyId == effectiveCompanyId)
            .OrderBy(c => c.Code)
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpPost("api/items/categories")]
    public async Task<IActionResult> SaveItemCategory([FromBody] SaveItemCategoryRequest req, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(req.CompanyId);
        Guid.TryParse(req.Id, out var parsedId);

        var existing = await _purchasingDb.ItemCategories
            .FirstOrDefaultAsync(c =>
                c.CompanyId == effectiveCompanyId &&
                ((parsedId != Guid.Empty && c.Id == parsedId) || c.Code.ToLower() == (req.Code ?? "").ToLower()), ct);

        if (existing != null)
        {
            existing.Code = string.IsNullOrWhiteSpace(req.Code) ? existing.Code : req.Code.Trim();
            existing.NameAr = req.NameAr.Trim();
            existing.NameEn = string.IsNullOrWhiteSpace(req.NameEn) ? req.NameAr.Trim() : req.NameEn.Trim();
            existing.Description = req.Description;
            existing.Color = req.Color;
            existing.Icon = req.Icon;
            existing.IsActive = req.IsActive;
            await _purchasingDb.SaveChangesAsync(ct);
            return Ok(existing);
        }

        var created = new ItemCategory(parsedId != Guid.Empty ? parsedId : Guid.NewGuid())
        {
            CompanyId = effectiveCompanyId,
            Code = string.IsNullOrWhiteSpace(req.Code) ? $"CAT-{DateTime.UtcNow:HHmmss}" : req.Code.Trim(),
            NameAr = req.NameAr.Trim(),
            NameEn = string.IsNullOrWhiteSpace(req.NameEn) ? req.NameAr.Trim() : req.NameEn.Trim(),
            Description = req.Description,
            Color = req.Color ?? "#0284c7",
            Icon = req.Icon ?? "pi pi-folder",
            IsActive = req.IsActive
        };

        await _purchasingDb.ItemCategories.AddAsync(created, ct);
        await _purchasingDb.SaveChangesAsync(ct);
        return Ok(created);
    }

    [HttpDelete("api/items/categories/{id}")]
    public async Task<IActionResult> DeleteItemCategory(string id, [FromQuery] Guid? companyId, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        if (Guid.TryParse(id, out var guidId))
        {
            var cat = await _purchasingDb.ItemCategories
                .FirstOrDefaultAsync(c => c.Id == guidId && c.CompanyId == effectiveCompanyId, ct);
            if (cat != null)
            {
                _purchasingDb.ItemCategories.Remove(cat);
                await _purchasingDb.SaveChangesAsync(ct);
            }
        }
        return Ok(true);
    }

    [HttpDelete("api/items/categories")]
    public async Task<IActionResult> ClearItemCategories([FromQuery] Guid? companyId, CancellationToken ct)
    {
        var effectiveCompanyId = GetEffectiveCompanyId(companyId);
        var categories = await _purchasingDb.ItemCategories
            .Where(c => c.CompanyId == effectiveCompanyId)
            .ToListAsync(ct);

        if (categories.Count > 0)
        {
            _purchasingDb.ItemCategories.RemoveRange(categories);
            await _purchasingDb.SaveChangesAsync(ct);
        }
        return Ok(true);
    }

    // =========================================================================
    // 2. Module Settings & Personal Workspace Persistence (/api/system-data/*)
    // =========================================================================
    [HttpGet("api/system-data/store/{key}")]
    public async Task<IActionResult> GetStoreValue(string key, CancellationToken ct)
    {
        var conn = (SqlConnection)_purchasingDb.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(ct);
        }

        await using var cmd = new SqlCommand(
            "SELECT JsonValue FROM dbo.SystemKeyValueStores WHERE StoreKey = @key", conn);
        cmd.Parameters.AddWithValue("@key", key);

        var result = await cmd.ExecuteScalarAsync(ct) as string;
        if (string.IsNullOrWhiteSpace(result))
        {
            return Ok(new { found = false, data = (JsonElement?)null });
        }

        var doc = JsonDocument.Parse(result);
        return Ok(new { found = true, data = doc.RootElement.Clone() });
    }

    [HttpPost("api/system-data/store/{key}")]
    public async Task<IActionResult> SaveStoreValue(string key, [FromBody] JsonElement payload, CancellationToken ct)
    {
        var json = payload.GetRawText();
        var conn = (SqlConnection)_purchasingDb.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            await conn.OpenAsync(ct);
        }

        const string sql = @"
IF EXISTS (SELECT 1 FROM dbo.SystemKeyValueStores WHERE StoreKey = @key)
    UPDATE dbo.SystemKeyValueStores SET JsonValue = @json, UpdatedAtUtc = GETUTCDATE() WHERE StoreKey = @key;
ELSE
    INSERT INTO dbo.SystemKeyValueStores (StoreKey, JsonValue, UpdatedAtUtc) VALUES (@key, @json, GETUTCDATE());";

        await using var cmd = new SqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@key", key);
        cmd.Parameters.AddWithValue("@json", json);
        await cmd.ExecuteNonQueryAsync(ct);

        return Ok(new { success = true });
    }
}

public record SaveItemCategoryRequest(
    string? Id,
    Guid? CompanyId,
    string? Code,
    string NameAr,
    string? NameEn,
    string? Description,
    string? Color,
    string? Icon,
    bool IsActive = true);
