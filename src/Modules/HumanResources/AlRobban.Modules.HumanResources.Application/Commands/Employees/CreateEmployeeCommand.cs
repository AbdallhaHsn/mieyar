using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Commands.Employees;

public record CreateEmployeeCommand(
    Guid CompanyId,
    string? EmployeeNumber,
    string FirstNameAr,
    string LastNameAr,
    string? FirstNameEn,
    string? LastNameEn,
    string NationalIdOrIqama,
    string Nationality,
    bool IsSaudi,
    string JobTitleAr,
    string? JobTitleEn,
    DateTime HireDate,
    decimal BasicSalary,
    decimal HousingAllowance,
    decimal TransportationAllowance,
    decimal OtherAllowances,
    string BankCode,
    string BankName,
    string Iban,
    Guid? DepartmentId = null,
    string? DepartmentName = null,
    Guid? CostCenterId = null,
    Guid? BranchId = null,
    ContractType ContractType = ContractType.Limited,
    DateTime? ContractStartDate = null,
    DateTime? ContractEndDate = null,
    string? MobileNumber = null,
    string? Email = null,
    Gender Gender = Gender.Male,
    DateTime? DateOfBirth = null
) : IRequest<Result<EmployeeDto>>;

public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, Result<EmployeeDto>>
{
    private readonly IEmployeeRepository _employeeRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public CreateEmployeeCommandHandler(
        IEmployeeRepository employeeRepo,
        ICurrentTenantContext tenantContext)
    {
        _employeeRepo = employeeRepo;
        _tenantContext = tenantContext;
    }

    public async Task<Result<EmployeeDto>> Handle(CreateEmployeeCommand request, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId.GetValueOrDefault();
        if (tenantId == Guid.Empty)
        {
            tenantId = request.CompanyId != Guid.Empty ? request.CompanyId : Guid.Parse("11111111-1111-1111-1111-111111111111");
        }

        var empNumber = request.EmployeeNumber;
        if (string.IsNullOrWhiteSpace(empNumber))
        {
            var existingList = await _employeeRepo.GetListAsync(request.CompanyId, null, cancellationToken);
            empNumber = $"EMP-{(existingList.Count + 1):D4}";
        }

        var existingWithNumber = await _employeeRepo.GetByNumberAsync(request.CompanyId, empNumber, cancellationToken);
        if (existingWithNumber != null)
        {
            return Result.Failure<EmployeeDto>(Error.Conflict("Employee.DuplicateNumber", $"رقم الموظف '{empNumber}' مسجل مسبقاً."));
        }

        var fNameEn = string.IsNullOrWhiteSpace(request.FirstNameEn) ? request.FirstNameAr.Trim() : request.FirstNameEn.Trim();
        var lNameEn = string.IsNullOrWhiteSpace(request.LastNameEn) ? request.LastNameAr.Trim() : request.LastNameEn.Trim();
        var jobEn = string.IsNullOrWhiteSpace(request.JobTitleEn) ? request.JobTitleAr.Trim() : request.JobTitleEn.Trim();

        var employee = Employee.Create(
            tenantId: tenantId,
            companyId: request.CompanyId,
            employeeNumber: empNumber,
            firstNameAr: request.FirstNameAr,
            lastNameAr: request.LastNameAr,
            firstNameEn: fNameEn,
            lastNameEn: lNameEn,
            nationalIdOrIqama: request.NationalIdOrIqama,
            nationality: request.Nationality,
            isSaudi: request.IsSaudi,
            jobTitleAr: request.JobTitleAr,
            jobTitleEn: jobEn,
            hireDate: request.HireDate,
            basicSalary: request.BasicSalary,
            housingAllowance: request.HousingAllowance,
            transportationAllowance: request.TransportationAllowance,
            otherAllowances: request.OtherAllowances,
            bankCode: request.BankCode,
            bankName: request.BankName,
            iban: request.Iban,
            departmentId: request.DepartmentId,
            departmentName: request.DepartmentName,
            costCenterId: request.CostCenterId,
            branchId: request.BranchId,
            contractType: request.ContractType,
            contractStartDate: request.ContractStartDate,
            contractEndDate: request.ContractEndDate,
            mobileNumber: request.MobileNumber,
            email: request.Email,
            gender: request.Gender,
            dateOfBirth: request.DateOfBirth,
            createdBy: "SystemAdmin"
        );

        await _employeeRepo.AddAsync(employee, cancellationToken);
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
