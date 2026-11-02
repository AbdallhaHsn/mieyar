using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.UpdateCompanyStatus;

public record UpdateCompanyStatusCommand(Guid CompanyId, bool IsActive) : ICommand<bool>;

public class UpdateCompanyStatusCommandHandler : ICommandHandler<UpdateCompanyStatusCommand, bool>
{
    private readonly ICompanyRepository _companyRepository;

    public UpdateCompanyStatusCommandHandler(ICompanyRepository companyRepository)
    {
        _companyRepository = companyRepository;
    }

    public async Task<Result<bool>> Handle(UpdateCompanyStatusCommand request, CancellationToken cancellationToken)
    {
        var company = await _companyRepository.GetByIdAsync(request.CompanyId, cancellationToken);
        if (company == null)
        {
            return Result.Failure<bool>(Error.NotFound("Company.NotFound", "الشركة غير موجودة / Company not found."));
        }

        if (request.IsActive)
        {
            company.Activate();
        }
        else
        {
            company.Deactivate();
        }

        await _companyRepository.SaveChangesAsync(cancellationToken);
        return Result.Success(company.IsActive);
    }
}
