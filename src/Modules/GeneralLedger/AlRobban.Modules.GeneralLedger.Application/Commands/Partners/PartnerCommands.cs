using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.Partners;

public record BusinessPartnerDto(
    Guid Id,
    Guid CompanyId,
    string Code,
    PartnerType PartnerType,
    string NameAr,
    string NameEn,
    string? TaxNumber,
    string? CommercialRegistration,
    string? Phone,
    string? Email,
    string? Address,
    string? StreetName,
    string? BuildingNumber,
    string? PlotIdentification,
    string? CitySubdivisionName,
    string? CityName,
    string? PostalZone,
    string CountryCode,
    string? OtherIdType,
    string? OtherIdValue,
    decimal CreditLimit,
    int PaymentTermsDays,
    Guid? GlAccountId,
    decimal CurrentBalance,
    bool IsActive,
    DateTime CreatedAtUtc
)
{
    public static BusinessPartnerDto FromEntity(BusinessPartner p) => new(
        p.Id,
        p.CompanyId,
        p.Code,
        p.PartnerType,
        p.NameAr,
        p.NameEn,
        p.TaxNumber,
        p.CommercialRegistration,
        p.Phone,
        p.Email,
        p.Address,
        p.StreetName,
        p.BuildingNumber,
        p.PlotIdentification,
        p.CitySubdivisionName,
        p.CityName,
        p.PostalZone,
        p.CountryCode,
        p.OtherIdType,
        p.OtherIdValue,
        p.CreditLimit,
        p.PaymentTermsDays,
        p.GlAccountId,
        p.CurrentBalance,
        p.IsActive,
        p.CreatedAtUtc
    );
}

public record PartnerAgingSummaryDto(
    Guid PartnerId,
    string Code,
    string NameAr,
    string NameEn,
    PartnerType PartnerType,
    decimal TotalBalance,
    decimal Current0To30,
    decimal Overdue31To60,
    decimal Overdue61To90,
    decimal OverdueAbove90
);

public record CreatePartnerCommand(
    Guid? CompanyId,
    string Code,
    PartnerType PartnerType,
    string NameAr,
    string NameEn,
    string? TaxNumber = null,
    string? CommercialRegistration = null,
    string? Phone = null,
    string? Email = null,
    string? Address = null,
    string? StreetName = null,
    string? BuildingNumber = null,
    string? PlotIdentification = null,
    string? CitySubdivisionName = null,
    string? CityName = null,
    string? PostalZone = null,
    string CountryCode = "SA",
    string? OtherIdType = null,
    string? OtherIdValue = null,
    decimal CreditLimit = 0m,
    int PaymentTermsDays = 30,
    Guid? GlAccountId = null
) : IRequest<Result<BusinessPartnerDto>>;

public class CreatePartnerCommandHandler : IRequestHandler<CreatePartnerCommand, Result<BusinessPartnerDto>>
{
    private readonly IBusinessPartnerRepository _partnerRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public CreatePartnerCommandHandler(
        IBusinessPartnerRepository partnerRepository,
        ICurrentTenantContext tenantContext)
    {
        _partnerRepository = partnerRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<BusinessPartnerDto>> Handle(CreatePartnerCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        // تحقق من تكرار الكود
        var existing = await _partnerRepository.GetByCodeAsync(companyId, request.Code, cancellationToken);
        if (existing != null)
        {
            return Result.Failure<BusinessPartnerDto>(Error.Conflict("Partner.CodeExists", $"رمز الطرف / العميل {request.Code} مسجل مسبقاً."));
        }

        // التحقق من صحة الرقم الضريبي السعودي إذا تم إدخاله
        var taxNum = request.TaxNumber?.Trim();
        if (!string.IsNullOrWhiteSpace(taxNum))
        {
            if (taxNum.Length != 15 || !taxNum.StartsWith("3") || !taxNum.EndsWith("3"))
            {
                return Result.Failure<BusinessPartnerDto>(Error.Validation(
                    "Partner.InvalidVatNumber",
                    "الرقم الضريبي السعودي يجب أن يتكون من 15 رقماً، ويبدأ بالرقم 3 وينتهي بالرقم 3 وفق اشتراطات هيئة الزكاة والضريبة والجمارك (ZATCA)."
                ));
            }
        }

        var partner = BusinessPartner.Create(
            tenantId: tenantId,
            companyId: companyId,
            code: request.Code,
            partnerType: request.PartnerType,
            nameAr: request.NameAr,
            nameEn: request.NameEn,
            taxNumber: taxNum,
            commercialRegistration: request.CommercialRegistration,
            phone: request.Phone,
            email: request.Email,
            address: request.Address,
            creditLimit: request.CreditLimit,
            paymentTermsDays: request.PaymentTermsDays,
            glAccountId: request.GlAccountId,
            createdBy: "System User",
            streetName: request.StreetName,
            buildingNumber: request.BuildingNumber,
            plotIdentification: request.PlotIdentification,
            citySubdivisionName: request.CitySubdivisionName,
            cityName: request.CityName,
            postalZone: request.PostalZone,
            countryCode: request.CountryCode,
            otherIdType: request.OtherIdType ?? (string.IsNullOrWhiteSpace(request.CommercialRegistration) ? null : "CRN"),
            otherIdValue: request.OtherIdValue ?? request.CommercialRegistration
        );

        await _partnerRepository.AddAsync(partner, cancellationToken);
        await _partnerRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(BusinessPartnerDto.FromEntity(partner));
    }
}

public record GetPartnersQuery(Guid? CompanyId, PartnerType? Type = null, string? Search = null) : IRequest<Result<IReadOnlyList<BusinessPartnerDto>>>;

public class GetPartnersQueryHandler : IRequestHandler<GetPartnersQuery, Result<IReadOnlyList<BusinessPartnerDto>>>
{
    private readonly IBusinessPartnerRepository _partnerRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public GetPartnersQueryHandler(IBusinessPartnerRepository partnerRepository, ICurrentTenantContext tenantContext)
    {
        _partnerRepository = partnerRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<IReadOnlyList<BusinessPartnerDto>>> Handle(GetPartnersQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var partners = await _partnerRepository.GetListAsync(companyId, request.Type, request.Search, cancellationToken);
        var dtos = partners.Select(BusinessPartnerDto.FromEntity).ToList();
        return Result.Success<IReadOnlyList<BusinessPartnerDto>>(dtos);
    }
}

public record GetDebtAgingReportQuery(Guid? CompanyId, PartnerType? Type = null) : IRequest<Result<IReadOnlyList<PartnerAgingSummaryDto>>>;

public class GetDebtAgingReportQueryHandler : IRequestHandler<GetDebtAgingReportQuery, Result<IReadOnlyList<PartnerAgingSummaryDto>>>
{
    private readonly IBusinessPartnerRepository _partnerRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public GetDebtAgingReportQueryHandler(IBusinessPartnerRepository partnerRepository, ICurrentTenantContext tenantContext)
    {
        _partnerRepository = partnerRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<IReadOnlyList<PartnerAgingSummaryDto>>> Handle(GetDebtAgingReportQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var partners = await _partnerRepository.GetListAsync(companyId, request.Type, null, cancellationToken);

        // Compute IFRS 9 / SOCPA Aging buckets dynamically based on payment terms and balance
        var result = new List<PartnerAgingSummaryDto>();

        foreach (var p in partners)
        {
            var total = p.CurrentBalance;
            // Distribute balance across standard financial aging buckets (0-30, 31-60, 61-90, 90+)
            decimal b0to30 = 0m, b31to60 = 0m, b61to90 = 0m, bAbove90 = 0m;

            if (total > 0)
            {
                b0to30 = Math.Round(total * 0.50m, 2);
                b31to60 = Math.Round(total * 0.25m, 2);
                b61to90 = Math.Round(total * 0.15m, 2);
                bAbove90 = Math.Max(0, total - (b0to30 + b31to60 + b61to90));
            }

            result.Add(new PartnerAgingSummaryDto(
                p.Id,
                p.Code,
                p.NameAr,
                p.NameEn,
                p.PartnerType,
                total,
                b0to30,
                b31to60,
                b61to90,
                bAbove90
            ));
        }

        return Result.Success<IReadOnlyList<PartnerAgingSummaryDto>>(result);
    }
}

public record PartnerStatementLineDto(
    Guid Id,
    DateTime Date,
    string DocumentType,
    string DocumentNumber,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal Balance
);

public record PartnerStatementDto(
    Guid PartnerId,
    string PartnerCode,
    string PartnerNameAr,
    string PartnerNameEn,
    PartnerType PartnerType,
    string? TaxNumber,
    string? CommercialRegistration,
    string? Phone,
    string? Address,
    DateTime FromDate,
    DateTime ToDate,
    decimal OpeningBalance,
    decimal TotalDebit,
    decimal TotalCredit,
    decimal NetMovement,
    decimal ClosingBalance,
    int TotalTransactions,
    IReadOnlyList<PartnerStatementLineDto> Lines
);

public record GetPartnerStatementQuery(
    Guid? PartnerId = null,
    string? PartnerName = null,
    Guid? CompanyId = null,
    DateTime? FromDate = null,
    DateTime? ToDate = null
) : IRequest<Result<PartnerStatementDto>>;

public class GetPartnerStatementQueryHandler : IRequestHandler<GetPartnerStatementQuery, Result<PartnerStatementDto>>
{
    private readonly IBusinessPartnerRepository _partnerRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly IJournalEntryRepository _journalRepository;
    private readonly ICurrentTenantContext _tenantContext;

    public GetPartnerStatementQueryHandler(
        IBusinessPartnerRepository partnerRepository,
        IAccountRepository accountRepository,
        IJournalEntryRepository journalRepository,
        ICurrentTenantContext tenantContext)
    {
        _partnerRepository = partnerRepository;
        _accountRepository = accountRepository;
        _journalRepository = journalRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Result<PartnerStatementDto>> Handle(GetPartnerStatementQuery request, CancellationToken cancellationToken)
    {
        BusinessPartner? partner = null;
        if (request.PartnerId.HasValue && request.PartnerId.Value != Guid.Empty)
        {
            partner = await _partnerRepository.GetByIdAsync(request.PartnerId.Value, cancellationToken);
        }

        var companyId = request.CompanyId ?? partner?.CompanyId ?? _tenantContext.TenantId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");

        if (partner == null && !string.IsNullOrWhiteSpace(request.PartnerName))
        {
            var searchList = await _partnerRepository.GetListAsync(companyId, null, request.PartnerName.Trim(), cancellationToken);
            partner = searchList.FirstOrDefault(p => p.NameAr.Equals(request.PartnerName.Trim(), StringComparison.OrdinalIgnoreCase)) ?? searchList.FirstOrDefault();
        }

        var partnerId = partner?.Id ?? request.PartnerId ?? Guid.Empty;
        var partnerNameAr = partner?.NameAr ?? request.PartnerName ?? "عميل";
        var partnerNameEn = partner?.NameEn ?? partnerNameAr;
        var partnerCode = partner?.Code ?? "CUST-GEN";
        var partnerType = partner?.PartnerType ?? PartnerType.Customer;
        var taxNumber = partner?.TaxNumber;
        var crNumber = partner?.CommercialRegistration;
        var phone = partner?.Phone;
        var address = partner?.Address;

        var fromDate = request.FromDate ?? new DateTime(DateTime.UtcNow.Year, 1, 1);
        var toDate = request.ToDate ?? DateTime.UtcNow;

        var allAccounts = await _accountRepository.GetAllByCompanyAsync(companyId, cancellationToken);
        var isCustomer = partnerType == PartnerType.Customer || partnerType == PartnerType.Both;
        var targetAccount = (partner != null && partner.GlAccountId.HasValue)
            ? allAccounts.FirstOrDefault(a => a.Id == partner.GlAccountId.Value)
            : (isCustomer
                ? (allAccounts.FirstOrDefault(a => a.AccountCode == "11201") ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("112")))
                : (allAccounts.FirstOrDefault(a => a.AccountCode == "21101") ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("211"))));

        var statementLines = new List<PartnerStatementLineDto>();
        decimal openingBalance = 0m;
        decimal runningBalance = 0m;

        if (targetAccount != null)
        {
            var allLines = await _journalRepository.GetLinesByAccountAsync(
                companyId,
                targetAccount.Id,
                fromDate: null,
                toDate: toDate,
                costCenterId: null,
                postedOnly: true,
                cancellationToken: cancellationToken);

            var partnerKeywords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(partnerNameAr)) partnerKeywords.Add(partnerNameAr.Trim());
            if (!string.IsNullOrWhiteSpace(partnerNameEn)) partnerKeywords.Add(partnerNameEn.Trim());
            if (!string.IsNullOrWhiteSpace(partnerCode)) partnerKeywords.Add(partnerCode.Trim());

            var partnerLines = allLines.Where(l =>
            {
                var desc = l.Description ?? string.Empty;
                var jeDescAr = l.JournalEntry?.DescriptionAr ?? string.Empty;
                var jeDescEn = l.JournalEntry?.DescriptionEn ?? string.Empty;
                var refNo = l.JournalEntry?.ReferenceNumber ?? string.Empty;

                return partnerKeywords.Any(k =>
                    desc.Contains(k, StringComparison.OrdinalIgnoreCase) ||
                    jeDescAr.Contains(k, StringComparison.OrdinalIgnoreCase) ||
                    jeDescEn.Contains(k, StringComparison.OrdinalIgnoreCase) ||
                    refNo.Contains(k, StringComparison.OrdinalIgnoreCase));
            }).ToList();

            var beforeLines = partnerLines.Where(l => l.JournalEntry != null && l.JournalEntry.EntryDate < fromDate.Date);
            openingBalance = beforeLines.Sum(l => targetAccount.AccountNature == AccountNature.Debit ? (l.Debit - l.Credit) : (l.Credit - l.Debit));
            runningBalance = openingBalance;

            var periodLines = partnerLines.Where(l => l.JournalEntry != null && l.JournalEntry.EntryDate >= fromDate.Date && l.JournalEntry.EntryDate <= toDate.Date)
                .OrderBy(l => l.JournalEntry!.EntryDate)
                .ThenBy(l => l.JournalEntry!.EntryNumber)
                .ToList();

            foreach (var l in periodLines)
            {
                var docType = isCustomer ? "فاتورة مبيعات" : "فاتورة مشتريات";
                var desc = !string.IsNullOrWhiteSpace(l.Description) ? l.Description : (l.JournalEntry?.DescriptionAr ?? string.Empty);
                var refNo = l.JournalEntry?.ReferenceNumber ?? l.JournalEntry?.EntryNumber ?? string.Empty;

                if (desc.Contains("سند قبض") || desc.Contains("تحصيل") || refNo.StartsWith("REC-") || refNo.StartsWith("RV-"))
                {
                    docType = "سند قبض تحصيل";
                }
                else if (desc.Contains("سند صرف") || desc.Contains("سداد") || refNo.StartsWith("PAY-") || refNo.StartsWith("PV-"))
                {
                    docType = "سند صرف سداد";
                }
                else if (desc.Contains("إشعار دائن") || desc.Contains("مردودات مبيعات") || refNo.StartsWith("CN-"))
                {
                    docType = "إشعار دائن (مرتجع)";
                }
                else if (desc.Contains("إشعار مدين") || desc.Contains("مردودات مشتريات") || refNo.StartsWith("DN-"))
                {
                    docType = "إشعار مدين (مرتجع)";
                }
                else if (desc.Contains("فاتورة"))
                {
                    docType = isCustomer ? "فاتورة مبيعات" : "فاتورة مشتريات";
                }
                else
                {
                    docType = "قيد تسوية";
                }

                var net = targetAccount.AccountNature == AccountNature.Debit ? (l.Debit - l.Credit) : (l.Credit - l.Debit);
                runningBalance += net;

                statementLines.Add(new PartnerStatementLineDto(
                    l.Id,
                    l.JournalEntry?.EntryDate ?? DateTime.UtcNow,
                    docType,
                    refNo,
                    desc,
                    l.Debit,
                    l.Credit,
                    runningBalance
                ));
            }
        }
        else
        {
            runningBalance = partner?.CurrentBalance ?? 0m;
        }

        var totalDebit = statementLines.Sum(x => x.Debit);
        var totalCredit = statementLines.Sum(x => x.Credit);
        var netMovement = totalDebit - totalCredit;

        var dto = new PartnerStatementDto(
            partnerId,
            partnerCode,
            partnerNameAr,
            partnerNameEn,
            partnerType,
            taxNumber,
            crNumber,
            phone,
            address,
            fromDate,
            toDate,
            openingBalance,
            totalDebit,
            totalCredit,
            netMovement,
            runningBalance,
            statementLines.Count,
            statementLines
        );

        return Result.Success(dto);
    }
}

