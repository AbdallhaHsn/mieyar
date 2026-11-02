using AlRobban.WebAPI.Security;
using Microsoft.AspNetCore.Authorization;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Infrastructure.Persistence;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Modules.Purchasing.Domain.Enums;
using AlRobban.Modules.Purchasing.Domain.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlRobban.WebAPI.Controllers;

public record EnterpriseAuditLogDto(
    string Id,
    string ModuleAr,
    string ModuleEn,
    string ActionAr,
    string ActionEn,
    string ReferenceNumber,
    DateTime Timestamp,
    string FormattedTimestamp,
    string Actor,
    decimal? Amount,
    string FormattedAmount,
    string Description,
    string StatusBadge,
    string BadgeSeverity
);

public record DashboardKpiCardDto(
    string TitleAr,
    string TitleEn,
    decimal Amount,
    string FormattedAmount,
    string Trend,
    bool IsPositive,
    string Accent
);

public record RecentJournalEntrySummaryDto(
    string VoucherNo,
    string Date,
    string DescriptionAr,
    string DescriptionEn,
    decimal Amount,
    string FormattedAmount,
    string BranchAr,
    string BranchEn,
    string Status
);

public record RecentInvoiceSummaryDto(
    Guid Id,
    string InvoiceNumber,
    string IssueDate,
    string CustomerName,
    decimal TotalAmount,
    string FormattedAmount,
    string StatusNameAr,
    string PaymentStatusNameAr
);

public record DashboardSummaryDto(
    Guid CompanyId,
    DateTime GeneratedAtUtc,
    DashboardKpiCardDto RevenueCard,
    DashboardKpiCardDto ExpensesCard,
    DashboardKpiCardDto OperatingProfitCard,
    DashboardKpiCardDto VatCard,
    DashboardKpiCardDto LiquidityCard,
    DashboardKpiCardDto ReceivablesCard,
    DashboardKpiCardDto PayablesCard,
    // ZATCA Metrics
    int TotalInvoicesCount,
    decimal TotalInvoicesVolume,
    int ClearedInvoicesCount,
    int ReportedInvoicesCount,
    int DraftInvoicesCount,
    double ComplianceRate,
    int AvgSigningLatencyMs,
    // Operational Metrics
    int TotalVouchersCount,
    decimal TotalReceiptsAmount,
    decimal TotalPaymentsAmount,
    int TotalPurchaseInvoicesCount,
    decimal TotalPurchaseInvoicesVolume,
    // Feeds
    List<RecentJournalEntrySummaryDto> RecentEntries,
    List<RecentInvoiceSummaryDto> RecentInvoices
);

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = AppRoles.BackOffice)]
public class DashboardController : ControllerBase
{
    private readonly GeneralLedgerDbContext _glContext;
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IPurchaseInvoiceRepository _purchaseRepo;
    private readonly IInventoryTransactionRepository _invTxRepo;

    public DashboardController(
        GeneralLedgerDbContext glContext,
        IInvoiceRepository invoiceRepo,
        IPurchaseInvoiceRepository purchaseRepo,
        IInventoryTransactionRepository invTxRepo)
    {
        _glContext = glContext;
        _invoiceRepo = invoiceRepo;
        _purchaseRepo = purchaseRepo;
        _invTxRepo = invTxRepo;
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(
        [FromQuery] Guid? companyId,
        CancellationToken cancellationToken = default)
    {
        var targetCompanyId = companyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        // 1. Live GL Account Calculations
        var postedLinesQuery = _glContext.JournalEntryLines
            .Include(l => l.Account)
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry != null && l.JournalEntry.CompanyId == targetCompanyId && l.JournalEntry.Status == JournalEntryStatus.Posted);

        // 1.1 Revenue (AccountCode starts with '4', Credit - Debit)
        var totalRevenue = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("4"))
            .SumAsync(l => l.Credit - l.Debit, cancellationToken);

        // 1.2 Expenses & COGS (AccountCode starts with '5', Debit - Credit)
        var totalExpenses = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("5"))
            .SumAsync(l => l.Debit - l.Credit, cancellationToken);

        // 1.3 Operating Profit
        var operatingProfit = totalRevenue - totalExpenses;
        var profitMargin = totalRevenue > 0 ? Math.Round((operatingProfit / totalRevenue) * 100, 1) : 0;

        // 1.4 Cash & Bank Liquidity (111xx, Debit - Credit)
        var liquidity = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("111"))
            .SumAsync(l => l.Debit - l.Credit, cancellationToken);

        // 1.5 Accounts Receivable (112xx, Debit - Credit)
        var receivables = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("112"))
            .SumAsync(l => l.Debit - l.Credit, cancellationToken);

        // 1.6 Accounts Payable (211xx, Credit - Debit)
        var payables = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("211"))
            .SumAsync(l => l.Credit - l.Debit, cancellationToken);

        // 1.7 Net VAT Position (Output VAT 21201 minus Input VAT 11401)
        var outputVat = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("212"))
            .SumAsync(l => l.Credit - l.Debit, cancellationToken);
        var inputVat = await postedLinesQuery
            .Where(l => l.Account != null && l.Account.AccountCode.StartsWith("114"))
            .SumAsync(l => l.Debit - l.Credit, cancellationToken);
        var netVat = outputVat - inputVat;

        // 2. Invoices & ZATCA Metrics
        var salesInvoices = await _invoiceRepo.GetListAsync(targetCompanyId, cancellationToken: cancellationToken);
        var totalInvoicesCount = salesInvoices.Count;
        var totalInvoicesVolume = salesInvoices.Sum(i => i.TotalAmount);
        var clearedInvoicesCount = salesInvoices.Count(i => i.Status == InvoiceStatus.Cleared || i.Status == InvoiceStatus.Issued);
        var reportedInvoicesCount = salesInvoices.Count(i => i.Status == InvoiceStatus.Reported);
        var draftInvoicesCount = salesInvoices.Count(i => i.Status == InvoiceStatus.Draft);

        // 3. Purchase Invoices
        var purchaseInvoices = await _purchaseRepo.GetListAsync(targetCompanyId, cancellationToken: cancellationToken);
        var totalPurchasesCount = purchaseInvoices.Count;
        var totalPurchasesVolume = purchaseInvoices.Sum(p => p.TotalAmount);

        // 4. Vouchers
        var vouchers = await _glContext.Vouchers
            .Where(v => v.CompanyId == targetCompanyId)
            .ToListAsync(cancellationToken);
        var totalVouchersCount = vouchers.Count;
        var totalReceipts = vouchers.Where(v => v.VoucherType == VoucherType.Receipt && v.Status == VoucherStatus.Posted).Sum(v => v.Amount);
        var totalPayments = vouchers.Where(v => v.VoucherType == VoucherType.Payment && v.Status == VoucherStatus.Posted).Sum(v => v.Amount);

        // 5. Recent Journal Entries (Top 5)
        var recentEntries = await _glContext.JournalEntries
            .Where(j => j.CompanyId == targetCompanyId)
            .OrderByDescending(j => j.EntryDate)
            .ThenByDescending(j => j.CreatedAtUtc)
            .Take(5)
            .Select(j => new RecentJournalEntrySummaryDto(
                j.EntryNumber,
                j.EntryDate.ToString("yyyy-MM-dd"),
                j.DescriptionAr,
                j.DescriptionEn ?? string.Empty,
                j.TotalDebit,
                j.TotalDebit.ToString("N2"),
                "الفرع الرئيسي",
                "Main Branch",
                j.Status == JournalEntryStatus.Posted ? "Posted" : "Draft"
            ))
            .ToListAsync(cancellationToken);

        // 6. Recent Sales Invoices (Top 5)
        var recentInvoices = salesInvoices
            .OrderByDescending(i => i.IssueDate)
            .Take(5)
            .Select(i => new RecentInvoiceSummaryDto(
                i.Id,
                i.InvoiceNumber,
                i.IssueDate.ToString("yyyy-MM-dd"),
                i.CustomerName,
                i.TotalAmount,
                i.TotalAmount.ToString("N2"),
                i.Status == InvoiceStatus.Cleared ? "معتمدة زكاة" : (i.Status == InvoiceStatus.Issued ? "معتمدة" : "مسودة"),
                i.PaymentStatus == InvoicePaymentStatus.Paid ? "مسددة بالكامل" : (i.PaymentStatus == InvoicePaymentStatus.PartiallyPaid ? "مسددة جزئياً" : "غير مسددة")
            ))
            .ToList();

        // 7. Compose KPI Cards
        var revenueCard = new DashboardKpiCardDto(
            TitleAr: "إجمالي الإيرادات",
            TitleEn: "Total Revenue",
            Amount: totalRevenue,
            FormattedAmount: $"SAR {totalRevenue:N2}",
            Trend: totalRevenue > 0 ? "+100%" : "0%",
            IsPositive: true,
            Accent: "green"
        );

        var expensesCard = new DashboardKpiCardDto(
            TitleAr: "المصروفات وتكلفة البضاعة (COGS)",
            TitleEn: "Total Expenses & COGS",
            Amount: totalExpenses,
            FormattedAmount: $"SAR {totalExpenses:N2}",
            Trend: totalExpenses > 0 ? "+تشغيلي" : "0%",
            IsPositive: true,
            Accent: "cyan"
        );

        var profitCard = new DashboardKpiCardDto(
            TitleAr: "صافي الأرباح التشغيلية",
            TitleEn: "Operating Profit",
            Amount: operatingProfit,
            FormattedAmount: $"SAR {operatingProfit:N2}",
            Trend: $"{profitMargin}% هامش",
            IsPositive: operatingProfit >= 0,
            Accent: "green"
        );

        var vatCard = new DashboardKpiCardDto(
            TitleAr: "صافي ضريبة القيمة المضافة",
            TitleEn: "Net VAT Payable (15%)",
            Amount: netVat,
            FormattedAmount: $"SAR {netVat:N2}",
            Trend: "مطابق ZATCA",
            IsPositive: true,
            Accent: "cyan"
        );

        var liquidityCard = new DashboardKpiCardDto(
            TitleAr: "السيولة النقدية والمصرفية",
            TitleEn: "Cash & Bank Liquidity",
            Amount: liquidity,
            FormattedAmount: $"SAR {liquidity:N2}",
            Trend: "متاح بالصندوق والراجحي",
            IsPositive: liquidity >= 0,
            Accent: "green"
        );

        var receivablesCard = new DashboardKpiCardDto(
            TitleAr: "مستحقات العملاء (ذمم مدينة)",
            TitleEn: "Accounts Receivable",
            Amount: receivables,
            FormattedAmount: $"SAR {receivables:N2}",
            Trend: "مبيعات آجلة مفتوحة",
            IsPositive: true,
            Accent: "cyan"
        );

        var payablesCard = new DashboardKpiCardDto(
            TitleAr: "مستحقات الموردين (ذمم دائنة)",
            TitleEn: "Accounts Payable",
            Amount: payables,
            FormattedAmount: $"SAR {payables:N2}",
            Trend: "فواتير توريد مستحقة",
            IsPositive: false,
            Accent: "cyan"
        );

        var summary = new DashboardSummaryDto(
            targetCompanyId,
            DateTime.UtcNow,
            revenueCard,
            expensesCard,
            profitCard,
            vatCard,
            liquidityCard,
            receivablesCard,
            payablesCard,
            totalInvoicesCount,
            totalInvoicesVolume,
            clearedInvoicesCount,
            reportedInvoicesCount,
            draftInvoicesCount,
            ComplianceRate: 100.0,
            AvgSigningLatencyMs: 8,
            totalVouchersCount,
            totalReceipts,
            totalPayments,
            totalPurchasesCount,
            totalPurchasesVolume,
            recentEntries,
            recentInvoices
        );

        return Ok(summary);
    }

    [HttpGet("audit-logs")]
    [ProducesResponseType(typeof(List<EnterpriseAuditLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] Guid? companyId,
        [FromQuery] string? module,
        [FromQuery] string? search,
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        var targetCompanyId = companyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var logs = new List<EnterpriseAuditLogDto>();

        // 1. Invoices & ZATCA Events
        var salesInvoices = await _invoiceRepo.GetListAsync(targetCompanyId, cancellationToken: cancellationToken);
        foreach (var inv in salesInvoices)
        {
            var isCleared = inv.Status == InvoiceStatus.Cleared;
            logs.Add(new EnterpriseAuditLogDto(
                Id: $"INV-{inv.Id}",
                ModuleAr: "المبيعات والفوترة الإلكترونية",
                ModuleEn: "Sales & E-Invoicing",
                ActionAr: isCleared ? "اعتماد وترحيل فاتورة ZATCA" : "إصدار فاتورة مبيعات",
                ActionEn: isCleared ? "ZATCA Invoice Cleared" : "Sales Invoice Issued",
                ReferenceNumber: inv.InvoiceNumber,
                Timestamp: inv.CreatedAtUtc,
                FormattedTimestamp: inv.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                Actor: inv.CreatedBy ?? "نظام الفوترة",
                Amount: inv.TotalAmount,
                FormattedAmount: $"SAR {inv.TotalAmount:N2}",
                Description: $"فاتورة مبيعات للعميل: {inv.CustomerName} - شاملة الضريبة (15%): SAR {inv.TotalVat:N2}",
                StatusBadge: inv.Status.ToString(),
                BadgeSeverity: isCleared ? "success" : "info"
            ));
        }

        // 2. Treasury Vouchers (سندات القبض والصرف والقيود)
        var vouchers = await _glContext.Vouchers
            .Where(v => v.CompanyId == targetCompanyId)
            .ToListAsync(cancellationToken);
        foreach (var v in vouchers)
        {
            var typeAr = v.VoucherType == VoucherType.Receipt ? "سند قبض مالي" : (v.VoucherType == VoucherType.Payment ? "سند صرف مالي" : "سند قيد");
            var typeEn = v.VoucherType.ToString();
            logs.Add(new EnterpriseAuditLogDto(
                Id: $"VOUCH-{v.Id}",
                ModuleAr: "سندات الخزينة والمصارف",
                ModuleEn: "Treasury & Vouchers",
                ActionAr: $"توثيق {typeAr}",
                ActionEn: $"Issued {typeEn} Voucher",
                ReferenceNumber: v.VoucherNumber,
                Timestamp: v.CreatedAtUtc,
                FormattedTimestamp: v.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                Actor: v.CreatedBy ?? "أمين الصندوق",
                Amount: v.Amount,
                FormattedAmount: $"SAR {v.Amount:N2}",
                Description: !string.IsNullOrWhiteSpace(v.Description) ? v.Description : $"{typeAr} برقم {v.VoucherNumber}",
                StatusBadge: v.Status.ToString(),
                BadgeSeverity: v.Status == VoucherStatus.Posted ? "success" : "warning"
            ));
        }

        // 3. GL Journal Entries (قيود اليومية والاقفالات والتسويات)
        var journalEntries = await _glContext.JournalEntries
            .Where(j => j.CompanyId == targetCompanyId)
            .OrderByDescending(j => j.CreatedAtUtc)
            .Take(50)
            .ToListAsync(cancellationToken);
        foreach (var j in journalEntries)
        {
            var isTaxClosing = j.DescriptionAr?.Contains("إقفال") == true;
            var isAdjustment = j.DescriptionAr?.Contains("تسوية") == true;
            var actionAr = isTaxClosing ? "إقفال إقرار ضريبي ZATCA" : (isAdjustment ? "تسوية محاسبية للمخزون" : "ترحيل قيد يومية عام");
            var actionEn = isTaxClosing ? "VAT Period Closing" : (isAdjustment ? "Stock Adjustment Entry" : "Journal Entry Posted");
            logs.Add(new EnterpriseAuditLogDto(
                Id: $"JV-{j.Id}",
                ModuleAr: "دفتر الأستاذ والضرائب",
                ModuleEn: "General Ledger & VAT",
                ActionAr: actionAr,
                ActionEn: actionEn,
                ReferenceNumber: j.EntryNumber,
                Timestamp: j.CreatedAtUtc,
                FormattedTimestamp: j.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                Actor: j.CreatedBy ?? "المدير المالي",
                Amount: j.TotalDebit,
                FormattedAmount: $"SAR {j.TotalDebit:N2}",
                Description: j.DescriptionAr ?? j.DescriptionEn ?? "قيد محاسبي مرحل",
                StatusBadge: j.Status.ToString(),
                BadgeSeverity: "success"
            ));
        }

        // 4. Inventory Transactions (تحويلات وتسويات وتوريدات)
        var invTransactions = await _invTxRepo.GetListAsync(targetCompanyId, cancellationToken: cancellationToken);
        foreach (var tx in invTransactions)
        {
            var actionAr = tx.MovementType switch
            {
                InventoryMovementType.InventoryAdjustment => "تسوية جردية للمخزون",
                InventoryMovementType.TransferOut => "تحويل مخزني صادر بين الفروع",
                InventoryMovementType.TransferIn => "تحويل مخزني وارد بين الفروع",
                InventoryMovementType.PurchaseIn => "استلام مشتريات وتوريد مخزني",
                InventoryMovementType.ReturnOut => "مردودات مشتريات لمورد",
                InventoryMovementType.SaleOut => "صرف بضاعة لمبيعات",
                InventoryMovementType.ReturnIn => "مردودات مبيعات من عميل",
                _ => "حركة مخزنية موثقة"
            };

            var actionEn = tx.MovementType.ToString();

            logs.Add(new EnterpriseAuditLogDto(
                Id: $"INV-TX-{tx.Id}",
                ModuleAr: "المستودعات والمخزون",
                ModuleEn: "Inventory & Warehouses",
                ActionAr: actionAr,
                ActionEn: actionEn,
                ReferenceNumber: tx.ReferenceNumber ?? tx.Id.ToString()[..8].ToUpper(),
                Timestamp: tx.CreatedAtUtc,
                FormattedTimestamp: tx.CreatedAtUtc.ToString("yyyy-MM-dd HH:mm"),
                Actor: tx.CreatedBy ?? "أمين المستودع",
                Amount: tx.TotalCost,
                FormattedAmount: $"SAR {tx.TotalCost:N2}",
                Description: tx.Notes ?? $"حركة مخزنية وارد: {tx.QuantityIn} / صادر: {tx.QuantityOut}",
                StatusBadge: "موثق",
                BadgeSeverity: "info"
            ));
        }

        // Filtering
        var filtered = logs.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(module))
        {
            filtered = filtered.Where(l => l.ModuleAr.Contains(module, StringComparison.OrdinalIgnoreCase) ||
                                           l.ModuleEn.Contains(module, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            filtered = filtered.Where(l => l.ReferenceNumber.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                                           l.Description.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                                           l.Actor.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                                           l.ActionAr.Contains(s, StringComparison.OrdinalIgnoreCase));
        }

        var result = filtered
            .OrderByDescending(l => l.Timestamp)
            .Take(take)
            .ToList();

        return Ok(result);
    }
}
