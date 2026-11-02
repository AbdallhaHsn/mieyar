using AlRobban.Modules.Projects.Domain.Entities;

namespace AlRobban.Modules.Projects.Domain.Repositories;

public interface ILetterOfGuaranteeRepository
{
    Task<LetterOfGuarantee?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LetterOfGuarantee>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LetterOfGuarantee>> GetListAsync(Guid companyId, CancellationToken cancellationToken = default);
    Task AddAsync(LetterOfGuarantee guarantee, CancellationToken cancellationToken = default);
    Task UpdateAsync(LetterOfGuarantee guarantee, CancellationToken cancellationToken = default);
    Task DeleteAsync(LetterOfGuarantee guarantee, CancellationToken cancellationToken = default);
}
