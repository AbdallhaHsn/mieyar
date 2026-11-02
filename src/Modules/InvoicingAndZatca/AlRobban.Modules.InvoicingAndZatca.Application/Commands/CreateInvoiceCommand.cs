using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Entities;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands;

public record CreateInvoiceCommand(CreateInvoiceRequest Request) : IRequest<Result<InvoiceDto>>;

public class CreateInvoiceCommandHandler : IRequestHandler<CreateInvoiceCommand, Result<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly ISalespersonRepository _salespersonRepo;
    private readonly IBusinessPartnerRepository? _partnerRepo;
    private readonly IMediator _mediator;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateInvoiceCommandHandler(
        IInvoiceRepository invoiceRepo,
        ISalespersonRepository salespersonRepo,
        IMediator mediator,
        ICurrentTenantContext tenantContext,
        IBusinessPartnerRepository? partnerRepo = null)
    {
        _invoiceRepo = invoiceRepo;
        _salespersonRepo = salespersonRepo;
        _mediator = mediator;
        _tenantContext = tenantContext;
        _partnerRepo = partnerRepo;
    }

    public async Task<Result<InvoiceDto>> Handle(CreateInvoiceCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (string.IsNullOrWhiteSpace(req.CustomerName))
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.CustomerNameRequired", "اسم العميل / المشتري إلزامي"));
        }

        if (req.Lines == null || req.Lines.Count == 0)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.LinesRequired", "يجب إضافة بند واحد على الأقل في الفاتورة"));
        }

        var currentTenantId = _tenantContext.TenantId;
        var companyId = req.CompanyId ?? currentTenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var tenantId = currentTenantId ?? companyId;
        var year = req.IssueDate.Year;

        // Lookup business partner if customer is provided or named
        BusinessPartner? partner = null;
        if (_partnerRepo != null)
        {
            if (req.CustomerId.HasValue && req.CustomerId.Value != Guid.Empty)
            {
                partner = await _partnerRepo.GetByIdAsync(req.CustomerId.Value, cancellationToken);
            }
            else if (!string.IsNullOrWhiteSpace(req.CustomerName) && !req.CustomerName.Contains("نقدي"))
            {
                var pList = await _partnerRepo.GetListAsync(companyId, null, req.CustomerName, cancellationToken);
                partner = pList.FirstOrDefault(p => string.Equals(p.NameAr, req.CustomerName, StringComparison.OrdinalIgnoreCase) ||
                                                    string.Equals(p.NameEn, req.CustomerName, StringComparison.OrdinalIgnoreCase));
            }
        }

        // Generate next sequence number
        var invoiceNumber = await _invoiceRepo.GenerateNextNumberAsync(companyId, req.TransactionType, year, cancellationToken);
        var lastPih = await _invoiceRepo.GetLastInvoiceHashAsync(companyId, cancellationToken);

        var customerAddress = req.CustomerAddress;
        if (string.IsNullOrWhiteSpace(customerAddress) && !string.IsNullOrWhiteSpace(req.BuyerStreet))
        {
            customerAddress = $"مبنى {req.BuyerBuildingNumber}، {req.BuyerStreet}، {req.BuyerDistrict}، {req.BuyerCity} {req.BuyerPostalCode}، {req.BuyerCountryCode}".Trim('،', ' ');
        }
        else if (string.IsNullOrWhiteSpace(customerAddress) && partner != null)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(partner.BuildingNumber)) parts.Add($"مبنى {partner.BuildingNumber}");
            if (!string.IsNullOrWhiteSpace(partner.StreetName)) parts.Add(partner.StreetName);
            if (!string.IsNullOrWhiteSpace(partner.CitySubdivisionName)) parts.Add(partner.CitySubdivisionName);
            if (!string.IsNullOrWhiteSpace(partner.CityName)) parts.Add(partner.CityName);
            if (!string.IsNullOrWhiteSpace(partner.PostalZone)) parts.Add(partner.PostalZone);
            parts.Add(partner.CountryCode ?? "SA");
            customerAddress = string.Join("، ", parts);
        }

        var crNumber = !string.IsNullOrWhiteSpace(req.CustomerCrNumber) ? req.CustomerCrNumber : req.BuyerOtherIdValue;
        if (string.IsNullOrWhiteSpace(crNumber) && partner != null)
        {
            crNumber = partner.CommercialRegistration ?? partner.OtherIdValue;
        }

        if (string.IsNullOrWhiteSpace(req.CustomerVatNumber) && partner != null)
        {
            req.CustomerVatNumber = partner.TaxNumber;
        }

        var targetWarehouse = req.WarehouseCode ?? "WH-MAIN";
        Guid? spId = null;
        string? spName = null;

        // Strict Server-Side Salesperson & Warehouse Security:
        // If caller is authenticated as a Salesperson, ALWAYS resolve salesperson and warehouse
        // strictly from their JWT identity, ignoring any client-sent salesperson ID.
        if (Guid.TryParse(_tenantContext.UserId, out var currentUserId))
        {
            var userSp = await _salespersonRepo.GetByUserIdAsync(companyId, currentUserId, cancellationToken);
            if (userSp != null)
            {
                spId = userSp.Id;
                spName = userSp.NameAr;
                if (!string.IsNullOrWhiteSpace(userSp.WarehouseCode))
                {
                    targetWarehouse = userSp.WarehouseCode;
                }
            }
        }

        // If not a Salesperson user (e.g. Admin entering invoice on behalf of a salesperson)
        if (!spId.HasValue && req.SalespersonId.HasValue && _tenantContext.Role != "Salesperson")
        {
            var sp = await _salespersonRepo.GetByIdAsync(req.SalespersonId.Value, cancellationToken);
            if (sp != null)
            {
                spId = sp.Id;
                spName = sp.NameAr;
                if (!string.IsNullOrWhiteSpace(sp.WarehouseCode))
                {
                    targetWarehouse = sp.WarehouseCode;
                }
            }
        }

        var invoice = Invoice.Create(
            tenantId,
            companyId,
            invoiceNumber,
            req.IssueDate,
            req.InvoiceType,
            req.TransactionType,
            req.CustomerName,
            req.CustomerVatNumber,
            crNumber,
            customerAddress,
            lastPih,
            req.CustomerId,
            req.ReferenceInvoiceId,
            req.ReferenceInvoiceNumber,
            req.ModificationReason,
            spId,
            spName,
            targetWarehouse,
            req.CreatedBy ?? _tenantContext.UserDisplayName ?? _tenantContext.UserName ?? "المستخدم");

        foreach (var line in req.Lines)
        {
            invoice.AddLine(
                line.ItemNameAr,
                line.ItemNameEn,
                line.Quantity,
                line.UnitPrice,
                line.Discount,
                line.VatRate,
                line.ItemId,
                targetWarehouse);
        }

        invoice.RecalculateTotals();

        // All sales invoices are initially recorded as Credit (آجلة - غير مسددة).
        // Settlement and payment occurs via the collection workflow (زر التحصيل / PayInvoiceCommand).

        await _invoiceRepo.AddAsync(invoice, cancellationToken);
        await _invoiceRepo.SaveChangesAsync(cancellationToken);

        // If AutoIssueAndPost requested, trigger Issue command (Quotations remain proposals and are never auto-issued as tax invoices)
        if (req.AutoIssueAndPost && req.TransactionType != TransactionType.Quotation)
        {
            var issueResult = await _mediator.Send(new IssueInvoiceCommand(invoice.Id), cancellationToken);
            if (issueResult.IsSuccess)
            {
                // Reload updated invoice
                var refreshed = await _invoiceRepo.GetByIdAsync(invoice.Id, cancellationToken);
                if (refreshed != null)
                {
                    return Result.Success(MapToDto(refreshed, 0m, partner));
                }
            }
        }

        return Result.Success(MapToDto(invoice, 0m, partner));
    }

    public static InvoiceDto MapToDto(Invoice inv, decimal returnedAmount = 0m, BusinessPartner? partner = null)
    {
        var typeNameAr = inv.InvoiceType switch
        {
            InvoiceType.Standard => "فاتورة ضريبية (B2B)",
            InvoiceType.Simplified => "فاتورة مبسطة (B2C)",
            _ => "فاتورة"
        };

        var transTypeNameAr = inv.TransactionType switch
        {
            TransactionType.Invoice => "فاتورة مبيعات",
            TransactionType.CreditNote => "إشعار دائن (مرتجع)",
            TransactionType.DebitNote => "إشعار مدين",
            TransactionType.Quotation => "عرض أسعار",
            _ => "فاتورة"
        };

        var statusNameAr = inv.Status switch
        {
            InvoiceStatus.Draft => "مسودة",
            InvoiceStatus.Issued => "معتمدة ومصدرة",
            InvoiceStatus.Cleared => "مقبولة ومعتمدة زكاة",
            InvoiceStatus.Reported => "مبلّغة لدى هيئة زكاة",
            InvoiceStatus.Rejected => "مرفوضة",
            InvoiceStatus.Cancelled => "ملغاة",
            _ => "مسودة"
        };

        var isCreditNote = inv.TransactionType == TransactionType.CreditNote || inv.InvoiceNumber.StartsWith("CN-");
        var effectiveRemaining = isCreditNote ? 0m : Math.Max(0, inv.TotalAmount - inv.PaidAmount - returnedAmount);
        var paymentStatus = isCreditNote ? InvoicePaymentStatus.Paid : inv.PaymentStatus;
        var paymentStatusNameAr = isCreditNote
            ? "مرتجع معتمد (مسوى)"
            : inv.PaymentStatus switch
            {
                InvoicePaymentStatus.Paid => "مسددة بالكامل",
                InvoicePaymentStatus.PartiallyPaid => "مسددة جزئياً",
                InvoicePaymentStatus.Unpaid => "غير مسددة (آجلة)",
                _ => "غير مسددة"
            };

        if (!isCreditNote && returnedAmount > 0)
        {
            if (effectiveRemaining <= 0.001m)
            {
                paymentStatusNameAr = "مرتجعة بالكامل (مسواة)";
                paymentStatus = InvoicePaymentStatus.Paid;
            }
            else
            {
                paymentStatusNameAr = "مخصوم مرتجع (متبقي جزئي)";
            }
        }

        var lines = inv.Lines.Select(l => new InvoiceLineDto(
            l.Id,
            l.LineNumber,
            l.ItemId,
            l.WarehouseCode,
            l.ItemNameAr,
            l.ItemNameEn,
            l.Quantity,
            l.UnitPrice,
            l.SubTotal,
            l.Discount,
            l.TaxableAmount,
            l.VatRate,
            l.VatAmount,
            l.TotalAmount)).ToList();

        var isCashCustomer = (partner != null && partner.Code == "CUST-CASH") ||
                             string.IsNullOrWhiteSpace(inv.CustomerName) ||
                             inv.CustomerName.Trim().Equals("عميل نقدي عام", StringComparison.OrdinalIgnoreCase) ||
                             inv.CustomerName.Trim().Equals("عميل نقدي", StringComparison.OrdinalIgnoreCase) ||
                             inv.CustomerName.Contains("نقدي", StringComparison.OrdinalIgnoreCase);

        var buyerStreet = partner?.StreetName;
        var buyerBuildingNumber = partner?.BuildingNumber;
        var buyerPlotIdentification = partner?.PlotIdentification;
        var buyerCitySubdivision = partner?.CitySubdivisionName;
        var buyerCity = partner?.CityName;
        var buyerPostalCode = partner?.PostalZone;
        var buyerCountryCode = partner?.CountryCode ?? "SA";
        var buyerOtherIdType = partner?.OtherIdType ?? (!string.IsNullOrWhiteSpace(inv.CustomerCrNumber) ? "CRN" : null);
        var buyerOtherIdVal = partner?.OtherIdValue ?? partner?.CommercialRegistration ?? inv.CustomerCrNumber;
        var buyerPhone = partner?.Phone;
        var buyerEmail = partner?.Email;
        var buyerVat = !string.IsNullOrWhiteSpace(inv.CustomerVatNumber) ? inv.CustomerVatNumber : partner?.TaxNumber;

        // If no partner was found or partner fields are missing, parse components from address string
        if (!string.IsNullOrWhiteSpace(inv.CustomerAddress))
        {
            var addr = inv.CustomerAddress;
            var parts = addr.Split(new[] { '،', ',' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            var bldMatch = System.Text.RegularExpressions.Regex.Match(addr, @"مبنى\s*([0-9A-Za-z]+)");
            if (bldMatch.Success) buyerBuildingNumber ??= bldMatch.Groups[1].Value;

            var postMatch = System.Text.RegularExpressions.Regex.Match(addr, @"\b([0-9]{5})\b");
            if (postMatch.Success) buyerPostalCode ??= postMatch.Groups[1].Value;

            var addMatch = System.Text.RegularExpressions.Regex.Match(addr, @"(إضافي|رقم إضافي)\s*([0-9]{4})");
            if (addMatch.Success) buyerPlotIdentification ??= addMatch.Groups[2].Value;

            foreach (var part in parts)
            {
                if (string.IsNullOrWhiteSpace(buyerStreet) && (part.Contains("شارع") || part.Contains("طريق")))
                {
                    buyerStreet = part;
                }
                else if (string.IsNullOrWhiteSpace(buyerCitySubdivision) && part.Contains("حي "))
                {
                    buyerCitySubdivision = part;
                }
            }

            if (string.IsNullOrWhiteSpace(buyerCity))
            {
                if (addr.Contains("الرياض")) buyerCity = "الرياض";
                else if (addr.Contains("جدة")) buyerCity = "جدة";
                else if (addr.Contains("الدمام")) buyerCity = "الدمام";
                else if (addr.Contains("مكة")) buyerCity = "مكة المكرمة";
                else if (addr.Contains("المدينة")) buyerCity = "المدينة المنورة";
                else if (addr.Contains("الخبر")) buyerCity = "الخبر";
                else if (addr.Contains("الجبيل")) buyerCity = "الجبيل";
                else if (addr.Contains("الأحساء") || addr.Contains("الهفوف")) buyerCity = "الأحساء";
                else if (addr.Contains("بريدة") || addr.Contains("القصيم")) buyerCity = "بريدة";
                else if (addr.Contains("خميس مشيط") || addr.Contains("أبها")) buyerCity = "أبها";
                else if (addr.Contains("تبوك")) buyerCity = "تبوك";
                else if (addr.Contains("جازان")) buyerCity = "جازان";
                else if (addr.Contains("حائل")) buyerCity = "حائل";
                else if (addr.Contains("نجران")) buyerCity = "نجران";
                else if (addr.Contains("ينبع")) buyerCity = "ينبع";
                else if (addr.Contains("الطائف")) buyerCity = "الطائف";
            }
        }

        // For Cash / B2C Simplified sales without explicit National Address components, populate standard ZATCA compliant address
        if (isCashCustomer)
        {
            buyerStreet ??= "طريق الملك فهد";
            buyerBuildingNumber ??= "1234";
            buyerPlotIdentification ??= "2134";
            buyerCitySubdivision ??= "حي العليا";
            buyerCity ??= "الرياض";
            buyerPostalCode ??= "12211";
            buyerCountryCode = "SA";
        }

        var customerAddress = !string.IsNullOrWhiteSpace(inv.CustomerAddress) ? inv.CustomerAddress : partner?.Address;
        if (string.IsNullOrWhiteSpace(customerAddress))
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(buyerBuildingNumber)) parts.Add($"مبنى {buyerBuildingNumber}");
            if (!string.IsNullOrWhiteSpace(buyerStreet)) parts.Add(buyerStreet);
            if (!string.IsNullOrWhiteSpace(buyerCitySubdivision)) parts.Add(buyerCitySubdivision);
            if (!string.IsNullOrWhiteSpace(buyerCity)) parts.Add(buyerCity);
            if (!string.IsNullOrWhiteSpace(buyerPostalCode)) parts.Add(buyerPostalCode);
            parts.Add(buyerCountryCode ?? "SA");
            customerAddress = string.Join("، ", parts);
        }

        return new InvoiceDto(
            inv.Id,
            inv.InvoiceNumber,
            inv.Uuid,
            inv.IssueDate,
            inv.IssueTime,
            inv.InvoiceType,
            typeNameAr,
            inv.TransactionType,
            transTypeNameAr,
            inv.Status,
            statusNameAr,
            paymentStatus,
            paymentStatusNameAr,
            inv.Currency,
            inv.CustomerId,
            inv.CustomerName,
            buyerVat,
            buyerOtherIdVal,
            customerAddress,
            inv.ReferenceInvoiceId,
            inv.ReferenceInvoiceNumber,
            inv.ModificationReason,
            inv.SubTotal,
            inv.TotalDiscount,
            inv.TotalTaxableAmount,
            inv.TotalVat,
            inv.TotalAmount,
            inv.PaidAmount,
            effectiveRemaining,
            inv.PreviousInvoiceHash,
            inv.InvoiceHash,
            inv.CryptographicStamp,
            inv.QrCodePayload,
            inv.AssociatedJournalEntryId,
            inv.AssociatedJournalEntryNumber,
            inv.SalespersonId,
            inv.SalespersonName,
            inv.WarehouseCode,
            inv.CreatedBy,
            inv.CreatedAtUtc,
            lines,
            returnedAmount,
            buyerStreet,
            buyerBuildingNumber,
            buyerPlotIdentification,
            buyerCitySubdivision,
            buyerCity,
            buyerPostalCode,
            buyerCountryCode,
            buyerOtherIdType,
            buyerOtherIdVal,
            buyerPhone,
            buyerEmail,
            isCashCustomer);
    }
}
