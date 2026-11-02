using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Queries;

public record GetEmployeesQuery(
    Guid CompanyId,
    bool? ActiveOnly = null
) : IRequest<Result<List<EmployeeDto>>>;

public record GetEmployeeByIdQuery(Guid Id) : IRequest<Result<EmployeeDto>>;

public class GetEmployeesQueryHandler :
    IRequestHandler<GetEmployeesQuery, Result<List<EmployeeDto>>>,
    IRequestHandler<GetEmployeeByIdQuery, Result<EmployeeDto>>
{
    private readonly IEmployeeRepository _employeeRepo;

    public GetEmployeesQueryHandler(IEmployeeRepository employeeRepo)
    {
        _employeeRepo = employeeRepo;
    }

    public async Task<Result<List<EmployeeDto>>> Handle(GetEmployeesQuery request, CancellationToken cancellationToken)
    {
        var employees = await _employeeRepo.GetListAsync(request.CompanyId, request.ActiveOnly, cancellationToken);
        var dtos = employees.Select(e =>
        {
            var (empGosi, compGosi) = e.CalculateMonthlyGosi();
            return new EmployeeDto(
                e.Id,
                e.CompanyId,
                e.EmployeeNumber,
                e.FirstNameAr,
                e.LastNameAr,
                e.FullNameAr,
                e.FirstNameEn,
                e.LastNameEn,
                e.FullNameEn,
                e.NationalIdOrIqama,
                e.Nationality,
                e.IsSaudi,
                e.Gender,
                e.DateOfBirth,
                e.MobileNumber,
                e.Email,
                e.DepartmentId,
                e.DepartmentName,
                e.JobTitleAr,
                e.JobTitleEn,
                e.CostCenterId,
                e.BranchId,
                e.HireDate,
                e.ContractType,
                e.ContractStartDate,
                e.ContractEndDate,
                e.Status,
                e.BankCode,
                e.BankName,
                e.Iban,
                e.BasicSalary,
                e.HousingAllowance,
                e.TransportationAllowance,
                e.OtherAllowances,
                e.GrossSalary,
                empGosi,
                compGosi
            );
        }).ToList();

        return Result.Success(dtos);
    }

    public async Task<Result<EmployeeDto>> Handle(GetEmployeeByIdQuery request, CancellationToken cancellationToken)
    {
        var e = await _employeeRepo.GetByIdAsync(request.Id, cancellationToken);
        if (e == null)
        {
            return Result.Failure<EmployeeDto>(Error.NotFound("Employee.NotFound", "الموظف المحدد غير موجود."));
        }

        var (empGosi, compGosi) = e.CalculateMonthlyGosi();
        var dto = new EmployeeDto(
            e.Id,
            e.CompanyId,
            e.EmployeeNumber,
            e.FirstNameAr,
            e.LastNameAr,
            e.FullNameAr,
            e.FirstNameEn,
            e.LastNameEn,
            e.FullNameEn,
            e.NationalIdOrIqama,
            e.Nationality,
            e.IsSaudi,
            e.Gender,
            e.DateOfBirth,
            e.MobileNumber,
            e.Email,
            e.DepartmentId,
            e.DepartmentName,
            e.JobTitleAr,
            e.JobTitleEn,
            e.CostCenterId,
            e.BranchId,
            e.HireDate,
            e.ContractType,
            e.ContractStartDate,
            e.ContractEndDate,
            e.Status,
            e.BankCode,
            e.BankName,
            e.Iban,
            e.BasicSalary,
            e.HousingAllowance,
            e.TransportationAllowance,
            e.OtherAllowances,
            e.GrossSalary,
            empGosi,
            compGosi
        );

        return Result.Success(dto);
    }
}
