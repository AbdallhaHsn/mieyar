using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Employees;

public record CalculateEosbCommand(
    Guid EmployeeId,
    DateTime CalculationDate,
    EndOfServiceReason Reason
) : IRequest<Result<EosbCalculationResultDto>>;

public class CalculateEosbCommandHandler : IRequestHandler<CalculateEosbCommand, Result<EosbCalculationResultDto>>
{
    private readonly IEmployeeRepository _employeeRepo;

    public CalculateEosbCommandHandler(IEmployeeRepository employeeRepo)
    {
        _employeeRepo = employeeRepo;
    }

    public async Task<Result<EosbCalculationResultDto>> Handle(CalculateEosbCommand request, CancellationToken cancellationToken)
    {
        var employee = await _employeeRepo.GetByIdAsync(request.EmployeeId, cancellationToken);
        if (employee == null)
        {
            return Result.Failure<EosbCalculationResultDto>(Error.NotFound("Employee.NotFound", "الموظف المحدد غير موجود."));
        }

        var amount = employee.CalculateEndOfServiceBenefit(request.CalculationDate, request.Reason);
        var totalDays = Math.Max(0, (request.CalculationDate - employee.HireDate).TotalDays);
        var years = Math.Round((decimal)totalDays / 365.25m, 2);

        var (reasonText, percentage) = request.Reason switch
        {
            EndOfServiceReason.ContractEnd => ("انتهاء مدة العقد المحدد", 100m),
            EndOfServiceReason.CompanyTermination => ("إنهاء العقد من قبل المنشأة (المادة 77)", 100m),
            EndOfServiceReason.ForceMajeure => ("قوة قاهرة / عجز أو وفاة", 100m),
            EndOfServiceReason.ResignationLessThan2Years => ("استقالة - خدمة أقل من سنتين (لا يستحق مكافأة)", 0m),
            EndOfServiceReason.Resignation2To5Years => ("استقالة - خدمة من سنتين إلى 5 سنوات (ثلث المكافأة)", 33.33m),
            EndOfServiceReason.Resignation5To10Years => ("استقالة - خدمة من 5 إلى 10 سنوات (ثلثي المكافأة)", 66.67m),
            EndOfServiceReason.ResignationMoreThan10Years => ("استقالة - خدمة أكثر من 10 سنوات (كامل المكافأة)", 100m),
            _ => ("أخرى", 100m)
        };

        var result = new EosbCalculationResultDto(
            employee.Id,
            employee.FullNameAr,
            employee.HireDate,
            request.CalculationDate,
            years,
            employee.GrossSalary,
            request.Reason,
            reasonText,
            percentage,
            amount
        );

        return Result.Success(result);
    }
}
