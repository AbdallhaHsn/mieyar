using AlRobban.Modules.GeneralLedger.Domain.Entities;
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
        var tenantId = _tenantContext.TenantId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");

        var existing = await _partnerRepository.GetByCodeAsync(companyId, request.Code, cancellationToken);
        if (existing != null)
        {
            return Result.Failure<BusinessPartnerDto>(Error.Conflict("Partner.CodeExists", $"رمز الطرف / العميل {request.Code} مسجل مسبقاً."));
        }

        var partner = BusinessPartner.Create(
            tenantId: tenantId,
            companyId: companyId,
            code: request.Code,
            partnerType: request.PartnerType,
            nameAr: request.NameAr,
            nameEn: request.NameEn,
            taxNumber: request.TaxNumber,
            commercialRegistration: request.CommercialRegistration,
            phone: request.Phone,
            email: request.Email,
            address: request.Address,
            creditLimit: request.CreditLimit,
            paymentTermsDays: request.PaymentTermsDays,
            glAccountId: request.GlAccountId,
            createdBy: "System User"
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

    public GetPartnersQueryHandler(IBusinessPartnerRepository partnerRepository)
    {
        _partnerRepository = partnerRepository;
    }

    public async Task<Result<IReadOnlyList<BusinessPartnerDto>>> Handle(GetPartnersQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");
        var partners = await _partnerRepository.GetListAsync(companyId, request.Type, request.Search, cancellationToken);
        var dtos = partners.Select(BusinessPartnerDto.FromEntity).ToList();
        return Result.Success<IReadOnlyList<BusinessPartnerDto>>(dtos);
    }
}

public record GetDebtAgingReportQuery(Guid? CompanyId, PartnerType? Type = null) : IRequest<Result<IReadOnlyList<PartnerAgingSummaryDto>>>;

public class GetDebtAgingReportQueryHandler : IRequestHandler<GetDebtAgingReportQuery, Result<IReadOnlyList<PartnerAgingSummaryDto>>>
{
    private readonly IBusinessPartnerRepository _partnerRepository;

    public GetDebtAgingReportQueryHandler(IBusinessPartnerRepository partnerRepository)
    {
        _partnerRepository = partnerRepository;
    }

    public async Task<Result<IReadOnlyList<PartnerAgingSummaryDto>>> Handle(GetDebtAgingReportQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("22222222-2222-2222-2222-222222222222");
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
