using AlRobban.Modules.HumanResources.Application.DTOs;
using AlRobban.Modules.HumanResources.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.HumanResources.Application.Queries;

public record GetDepartmentsQuery(Guid CompanyId) : IRequest<Result<List<DepartmentDto>>>;

public class GetDepartmentsQueryHandler : IRequestHandler<GetDepartmentsQuery, Result<List<DepartmentDto>>>
{
    private readonly IDepartmentRepository _deptRepo;

    public GetDepartmentsQueryHandler(IDepartmentRepository deptRepo)
    {
        _deptRepo = deptRepo;
    }

    public async Task<Result<List<DepartmentDto>>> Handle(GetDepartmentsQuery request, CancellationToken cancellationToken)
    {
        var depts = await _deptRepo.GetListAsync(request.CompanyId, cancellationToken);
        var dtos = depts.Select(d => new DepartmentDto(
            d.Id,
            d.CompanyId,
            d.Code,
            d.NameAr,
            d.NameEn,
            d.ManagerName,
            d.CostCenterId,
            d.IsActive
        )).ToList();

        return Result.Success(dtos);
    }
}
