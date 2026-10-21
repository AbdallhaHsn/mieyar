using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Queries.BankReconciliation;

public record GetBankReconciliationHistoryQuery(
    Guid? CompanyId = null,
    Guid? BankAccountId = null) : IRequest<Result<List<BankReconciliationResultDto>>>;

public class GetBankReconciliationHistoryQueryHandler : IRequestHandler<GetBankReconciliationHistoryQuery, Result<List<BankReconciliationResultDto>>>
{
    private readonly IBankReconciliationRepository _recRepo;

    public GetBankReconciliationHistoryQueryHandler(IBankReconciliationRepository recRepo)
    {
        _recRepo = recRepo;
    }

    public async Task<Result<List<BankReconciliationResultDto>>> Handle(GetBankReconciliationHistoryQuery request, CancellationToken cancellationToken)
    {
        var companyId = request.CompanyId ?? Guid.Parse("11111111-2222-3333-4444-555555555555");
        var list = await _recRepo.GetHistoryAsync(companyId, request.BankAccountId, cancellationToken);

        var result = list.Select(r => new BankReconciliationResultDto(
            ReconciliationId: r.Id,
            ReconciliationNumber: r.ReconciliationNumber,
            BankAccountId: r.BankAccountId,
            BankAccountCode: r.BankAccount?.AccountCode ?? "",
            BankAccountNameAr: r.BankAccount?.NameAr ?? "",
            StatementDate: r.StatementDate,
            StatementEndingBalance: r.StatementEndingBalance,
            BookBalance: r.BookBalance,
            ClearedDeposits: r.ClearedDeposits,
            ClearedWithdrawals: r.ClearedWithdrawals,
            Difference: r.Difference,
            Status: r.Status,
            StatusNameAr: r.Status == BankReconciliationStatus.Completed ? "معتمدة ومطابقة" : "مسودة قيد المطابقة",
            ReconciledAtUtc: r.ReconciledAtUtc,
            ReconciledBy: r.ReconciledBy,
            Notes: r.Notes)).ToList();

        return Result.Success(result);
    }
}
