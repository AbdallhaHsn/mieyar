using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Payroll;

public record WpsExportResult(
    string FileName,
    string ContentType,
    string FileContent,
    int RecordCount,
    decimal TotalAmount
);

public record GenerateWpsFileCommand(
    Guid PayrollPeriodId,
    string? EstablishmentMudadId = null,
    string? EstablishmentName = null,
    string? EmployerIban = null,
    string? EmployerBankCode = null
) : IRequest<Result<WpsExportResult>>;

public class GenerateWpsFileCommandHandler : IRequestHandler<GenerateWpsFileCommand, Result<WpsExportResult>>
{
    private readonly IPayrollPeriodRepository _payrollRepo;

    public GenerateWpsFileCommandHandler(IPayrollPeriodRepository payrollRepo)
    {
        _payrollRepo = payrollRepo;
    }

    public async Task<Result<WpsExportResult>> Handle(GenerateWpsFileCommand request, CancellationToken cancellationToken)
    {
        var period = await _payrollRepo.GetByIdWithLinesAsync(request.PayrollPeriodId, cancellationToken);
        if (period == null)
        {
            return Result.Failure<WpsExportResult>(Error.NotFound("Payroll.NotFound", "مسير الرواتب غير موجود."));
        }

        if (!period.Lines.Any())
        {
            return Result.Failure<WpsExportResult>(Error.Validation("Payroll.Empty", "لا توجد سجلات رواتب لتوليد ملف حماية الأجور."));
        }

        var fileName = $"WPS_{period.PayrollNumber}_{DateTime.UtcNow:yyyyMMddHHmmss}.sif";
        var content = period.GenerateWpsFileContent(
            request.EstablishmentMudadId ?? "7001234567",
            request.EstablishmentName ?? "شركة الربان للحلول المحاسبية المتقدمة",
            request.EmployerIban ?? "SA0380000000000000000000",
            request.EmployerBankCode ?? "RJHI"
        );

        period.RecordWpsExport(fileName);
        await _payrollRepo.UpdateAsync(period, cancellationToken);
        await _payrollRepo.SaveChangesAsync(cancellationToken);

        return Result.Success(new WpsExportResult(
            fileName,
            "text/plain",
            content,
            period.EmployeeCount,
            period.TotalNetSalary
        ));
    }
}
