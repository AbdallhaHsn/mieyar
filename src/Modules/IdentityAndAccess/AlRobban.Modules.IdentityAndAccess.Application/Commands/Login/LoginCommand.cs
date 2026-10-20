using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;
using FluentValidation;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.Login;

public record LoginCommand(
    string UserNameOrEmail,
    string Password) : ICommand<AuthResponseDto>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.UserNameOrEmail)
            .NotEmpty().WithMessage("اسم المستخدم أو البريد الإلكتروني إلزامي.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("كلمة المرور إلزامية.");
    }
}

public class LoginCommandHandler : ICommandHandler<LoginCommand, AuthResponseDto>
{
    private readonly IUserRepository _userRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public LoginCommandHandler(
        IUserRepository userRepository,
        ICompanyRepository companyRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _companyRepository = companyRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<Result<AuthResponseDto>> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByUserNameOrEmailAsync(request.UserNameOrEmail, cancellationToken);
        if (user == null)
        {
            return Result.Failure<AuthResponseDto>(Error.Failure(
                "Auth.InvalidCredentials",
                "اسم المستخدم أو كلمة المرور غير صحيحة."));
        }

        if (!user.IsActive)
        {
            return Result.Failure<AuthResponseDto>(Error.Failure(
                "Auth.AccountDisabled",
                "تم تعطيل هذا الحساب. يرجى مراجعة إدارة المنصة."));
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return Result.Failure<AuthResponseDto>(Error.Failure(
                "Auth.InvalidCredentials",
                "اسم المستخدم أو كلمة المرور غير صحيحة."));
        }

        // If user belongs to a tenant company, load company details
        Company? company = null;
        if (user.TenantId.HasValue)
        {
            company = await _companyRepository.GetByIdAsync(user.TenantId.Value, cancellationToken);
            if (company == null || !company.IsActive)
            {
                return Result.Failure<AuthResponseDto>(Error.Failure(
                    "Auth.CompanySuspended",
                    "حساب الشركة التابع لها هذا المستخدم موقف أو غير مفعل."));
            }
        }

        user.RecordLogin();
        await _userRepository.SaveChangesAsync(cancellationToken);

        var authResponse = _jwtTokenService.GenerateToken(user, company);
        return Result.Success(authResponse);
    }
}
