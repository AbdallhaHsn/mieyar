using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Employees;

public record UpdateEmployeeCommand(
    Guid Id,
    string FirstNameAr,
    string LastNameAr,
    string? FirstNameEn,
    string? LastNameEn,
    string JobTitleAr,
    string? JobTitleEn,
    Guid? DepartmentId,
    string? DepartmentName,
    Guid? CostCenterId,
    Guid? BranchId,
    string? MobileNumber,
    string? Email,
    decimal BasicSalary,
    decimal HousingAllowance,
    decimal TransportationAllowance,
    decimal OtherAllowances,
    string BankCode,
    string BankName,
    string Iban,
    EmployeeStatus Status
) : IRequest<Result<EmployeeDto>>;

public class UpdateEmployeeCommandHandler : IRequestHandler<UpdateEmployeeCommand, Result<EmployeeDto>>
{
    private readonly IEmployeeRepository _employeeRepo;

    public UpdateEmployeeCommandHandler(IEmployeeRepository employeeRepo)
    {
        _employeeRepo = employeeRepo;
    }

    public async Task<Result<EmployeeDto>> Handle(UpdateEmployeeCommand request, CancellationToken cancellationToken)
    {
        var employee = await _employeeRepo.GetByIdAsync(request.Id, cancellationToken);
        if (employee == null)
        {
            return Result.Failure<EmployeeDto>(Error.NotFound("Employee.NotFound", $"الموظف المحدد غير موجود."));
        }

        var fNameEn = string.IsNullOrWhiteSpace(request.FirstNameEn) ? request.FirstNameAr.Trim() : request.FirstNameEn.Trim();
        var lNameEn = string.IsNullOrWhiteSpace(request.LastNameEn) ? request.LastNameAr.Trim() : request.LastNameEn.Trim();
        var jobEn = string.IsNullOrWhiteSpace(request.JobTitleEn) ? request.JobTitleAr.Trim() : request.JobTitleEn.Trim();

        employee.UpdateProfile(
            request.FirstNameAr,
            request.LastNameAr,
            fNameEn,
            lNameEn,
            request.JobTitleAr,
            jobEn,
            request.DepartmentId,
            request.DepartmentName,
            request.CostCenterId,
            request.BranchId,
            request.MobileNumber,
            request.Email,
            "SystemAdmin"
        );

        employee.UpdateSalaryAndBank(
            request.BasicSalary,
            request.HousingAllowance,
            request.TransportationAllowance,
            request.OtherAllowances,
            request.BankCode,
            request.BankName,
            request.Iban,
            "SystemAdmin"
        );

        employee.SetStatus(request.Status, "SystemAdmin");

        await _employeeRepo.UpdateAsync(employee, cancellationToken);
        await _employeeRepo.SaveChangesAsync(cancellationToken);

        var (empGosi, compGosi) = employee.CalculateMonthlyGosi();

        var dto = new EmployeeDto(
            employee.Id,
            employee.CompanyId,
            employee.EmployeeNumber,
            employee.FirstNameAr,
            employee.LastNameAr,
            employee.FullNameAr,
            employee.FirstNameEn,
            employee.LastNameEn,
            employee.FullNameEn,
            employee.NationalIdOrIqama,
            employee.Nationality,
            employee.IsSaudi,
            employee.Gender,
            employee.DateOfBirth,
            employee.MobileNumber,
            employee.Email,
            employee.DepartmentId,
            employee.DepartmentName,
            employee.JobTitleAr,
            employee.JobTitleEn,
            employee.CostCenterId,
            employee.BranchId,
            employee.HireDate,
            employee.ContractType,
            employee.ContractStartDate,
            employee.ContractEndDate,
            employee.Status,
            employee.BankCode,
            employee.BankName,
            employee.Iban,
            employee.BasicSalary,
            employee.HousingAllowance,
            employee.TransportationAllowance,
            employee.OtherAllowances,
            employee.GrossSalary,
            empGosi,
            compGosi
        );

        return Result.Success(dto);
    }
}
