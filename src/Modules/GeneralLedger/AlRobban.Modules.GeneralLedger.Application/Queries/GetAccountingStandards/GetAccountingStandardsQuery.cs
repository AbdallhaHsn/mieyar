using AlRobban.Modules.GeneralLedger.Domain.Standards;
using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.GetAccountingStandards;

public record GetAccountingStandardsQuery : IRequest<Result<IReadOnlyList<AccountingStandardGuidance>>>;

public class GetAccountingStandardsQueryHandler : IRequestHandler<GetAccountingStandardsQuery, Result<IReadOnlyList<AccountingStandardGuidance>>>
{
    public Task<Result<IReadOnlyList<AccountingStandardGuidance>>> Handle(GetAccountingStandardsQuery request, CancellationToken cancellationToken)
    {
        var standards = (IReadOnlyList<AccountingStandardGuidance>)IfrsStandardCatalog.GetAll().ToList();
        return Task.FromResult(Result.Success(standards));
    }
}
