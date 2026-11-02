using AlRobban.Modules.HumanResources.Application.Commands.Employees;
using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Application.Queries;
using AlRobban.Modules.HumanResources.Domain.Entities;
using AlRobban.Modules.HumanResources.Domain.Enums;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/hr/employees")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IEmployeeRepository _employeeRepo;
    private readonly ICurrentTenantContext _tenantContext;

    public EmployeesController(
        IMediator mediator,
        IEmployeeRepository employeeRepo,
        ICurrentTenantContext tenantContext)
    {
        _mediator = mediator;
        _employeeRepo = employeeRepo;
        _tenantContext = tenantContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetEmployees([FromQuery] Guid companyId, [FromQuery] bool? activeOnly, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId.GetValueOrDefault();
        if (tenantId != Guid.Empty && !_tenantContext.IsSuperAdmin)
        {
            // Tenant users can only ever read their own company's employees
            companyId = tenantId;
        }
        else if (companyId == Guid.Empty)
        {
            companyId = tenantId != Guid.Empty
                ? tenantId
                : Guid.Parse("11111111-1111-1111-1111-111111111111");
        }

        var result = await _mediator.Send(new GetEmployeesQuery(companyId, activeOnly), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEmployeeById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetEmployeeByIdQuery(id), cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? CreatedAtAction(nameof(GetEmployeeById), new { id = result.Value.Id }, result.Value) : BadRequest(result.Error);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeCommand command, CancellationToken cancellationToken)
    {
        if (id != command.Id)
        {
            command = command with { Id = id };
        }

        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpPost("{id:guid}/calculate-eosb")]
    public async Task<IActionResult> CalculateEosb(Guid id, [FromBody] EosbCalculationRequest request, CancellationToken cancellationToken)
    {
        var command = new CalculateEosbCommand(id, request.CalculationDate ?? DateTime.UtcNow, request.Reason);
        var result = await _mediator.Send(command, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    private async Task SeedInitialEmployeesAsync(Guid companyId, CancellationToken cancellationToken)
    {
        var tenantId = _tenantContext.TenantId.GetValueOrDefault() != Guid.Empty
            ? _tenantContext.TenantId.Value
            : companyId;

        // 1. Saudi Senior Accountant
        var emp1 = Employee.Create(
            tenantId,
            companyId,
            employeeNumber: "EMP-0001",
            firstNameAr: "عبدالله",
            lastNameAr: "الغامدي",
            firstNameEn: "Abdullah",
            lastNameEn: "Al-Ghamdi",
            nationalIdOrIqama: "1098765432",
            nationality: "سعودي",
            isSaudi: true,
            jobTitleAr: "رئيس قسم الحسابات العامة",
            jobTitleEn: "Chief General Accountant",
            hireDate: DateTime.UtcNow.AddYears(-3).AddMonths(-2),
            basicSalary: 12000m,
            housingAllowance: 3000m,
            transportationAllowance: 1200m,
            otherAllowances: 800m,
            bankCode: "RJHI",
            bankName: "مصرف الراجحي",
            iban: "SA0380000000608010167519",
            departmentName: "الإدارة المالية",
            mobileNumber: "0501234567",
            email: "a.ghamdi@alrobban.sa"
        );

        // 2. Expatriate Software Engineer
        var emp2 = Employee.Create(
            tenantId,
            companyId,
            employeeNumber: "EMP-0002",
            firstNameAr: "محمد",
            lastNameAr: "المنصوري",
            firstNameEn: "Mohammed",
            lastNameEn: "Al-Mansouri",
            nationalIdOrIqama: "2345678901",
            nationality: "مقيم",
            isSaudi: false,
            jobTitleAr: "مهندس برمجيات أول",
            jobTitleEn: "Senior Software Engineer",
            hireDate: DateTime.UtcNow.AddYears(-2).AddMonths(-5),
            basicSalary: 9500m,
            housingAllowance: 2375m,
            transportationAllowance: 1000m,
            otherAllowances: 500m,
            bankCode: "NCB",
            bankName: "البنك الأهلي السعودي (SNB)",
            iban: "SA4410000001234567890123",
            departmentName: "تقنية المعلومات",
            mobileNumber: "0559876543",
            email: "m.mansouri@alrobban.sa"
        );

        // 3. Saudi HR & Administration Specialist
        var emp3 = Employee.Create(
            tenantId,
            companyId,
            employeeNumber: "EMP-0003",
            firstNameAr: "سارة",
            lastNameAr: "العتيبي",
            firstNameEn: "Sarah",
            lastNameEn: "Al-Otaibi",
            nationalIdOrIqama: "1087654321",
            nationality: "سعودي",
            isSaudi: true,
            jobTitleAr: "أخصائية موارد بشرية ورواتب",
            jobTitleEn: "HR & Payroll Specialist",
            hireDate: DateTime.UtcNow.AddYears(-1).AddMonths(-8),
            basicSalary: 8000m,
            housingAllowance: 2000m,
            transportationAllowance: 800m,
            otherAllowances: 400m,
            bankCode: "INMA",
            bankName: "مصرف الإنماء",
            iban: "SA5505000068201234567890",
            departmentName: "الموارد البشرية والشؤون الإدارية",
            mobileNumber: "0543210987",
            email: "s.otaibi@alrobban.sa",
            gender: Gender.Female
        );

        await _employeeRepo.AddAsync(emp1, cancellationToken);
        await _employeeRepo.AddAsync(emp2, cancellationToken);
        await _employeeRepo.AddAsync(emp3, cancellationToken);
        await _employeeRepo.SaveChangesAsync(cancellationToken);
    }
}

public record EosbCalculationRequest(
    DateTime? CalculationDate,
    EndOfServiceReason Reason
);
