using AlRobban.Modules.Manufacturing.Domain.Entities;
using AlRobban.Modules.Manufacturing.Domain.Enums;

namespace AlRobban.Modules.Manufacturing.Domain.Repositories;

public interface IBillOfMaterialsRepository
{
    Task<BillOfMaterials?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<BillOfMaterials?> GetByCodeAsync(Guid companyId, string code, CancellationToken cancellationToken = default);
    Task<List<BillOfMaterials>> GetListAsync(Guid companyId, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task AddAsync(BillOfMaterials bom, CancellationToken cancellationToken = default);
    void Update(BillOfMaterials bom);
    void Remove(BillOfMaterials bom);
}

public interface IWorkOrderRepository
{
    Task<WorkOrder?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<WorkOrder?> GetByNumberAsync(Guid companyId, string workOrderNumber, CancellationToken cancellationToken = default);
    Task<List<WorkOrder>> GetListAsync(Guid companyId, WorkOrderStatus? status = null, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task AddAsync(WorkOrder workOrder, CancellationToken cancellationToken = default);
    void Update(WorkOrder workOrder);
    void Remove(WorkOrder workOrder);
    Task<string> GenerateNextNumberAsync(Guid companyId, CancellationToken cancellationToken = default);
}

public interface IWorkstationRepository
{
    Task<Workstation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Workstation>> GetListAsync(Guid companyId, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task AddAsync(Workstation workstation, CancellationToken cancellationToken = default);
    void Update(Workstation workstation);
    void Remove(Workstation workstation);
}

public interface IRawMaterialRepository
{
    Task<RawMaterial?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<RawMaterial>> GetListAsync(Guid companyId, RawMaterialCategory? category = null, string? searchTerm = null, CancellationToken cancellationToken = default);
    Task AddAsync(RawMaterial item, CancellationToken cancellationToken = default);
    void Update(RawMaterial item);
    void Remove(RawMaterial item);
}
