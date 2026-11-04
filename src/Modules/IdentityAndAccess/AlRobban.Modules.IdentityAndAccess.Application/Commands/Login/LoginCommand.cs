using System.Collections.Concurrent;
using AlRobban.Modules.IdentityAndAccess.Application.Services;
using AlRobban.Modules.IdentityAndAccess.Domain.Entities;
using AlRobban.Modules.IdentityAndAccess.Domain.Repositories;
using AlRobban.Shared.Application.Abstractions;
using AlRobban.Shared.Application.CQRS;
using AlRobban.Shared.Kernel.Primitives;
using FluentValidation;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.Login;

public record LoginCommand(
    string UserNameOrEmail,
    string Password) : ICommand<AuthResponseDto>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator(IRequestLanguageContext? languageContext = null)
    {
        var isArabic = languageContext?.IsArabic ?? true;

        RuleFor(x => x.UserNameOrEmail)
            .NotEmpty().WithMessage(isArabic
                ? "اسم المستخدم أو البريد الإلكتروني إلزامي."
                : "Username or email is required.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage(isArabic
                ? "كلمة المرور إلزامية."
                : "Password is required.");
    }
}

public class LoginCommandHandler : ICommandHandler<LoginCommand, AuthResponseDto>
{
    private static readonly ConcurrentDictionary<string, (int Attempts, DateTime? LockoutUntilUtc)> FailedAttemptsTracker = new();
    private static string? DummyHash;

    private readonly IUserRepository _userRepository;
    private readonly ICompanyRepository _companyRepository;
    private readonly ICompanyRoleRepository _companyRoleRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IRequestLanguageContext _languageContext;

    public LoginCommandHandler(
        IUserRepository userRepository,
        ICompanyRepository companyRepository,
        ICompanyRoleRepository companyRoleRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IRequestLanguageContext languageContext)
    {
        _userRepository = userRepository;
        _companyRepository = companyRepository;
        _companyRoleRepository = companyRoleRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _languageContext = languageContext;
    }

    private string T(string ar, string en) => _languageContext.Translate(ar, en);

    private static string GetDummyHash(IPasswordHasher hasher)
    {
        return DummyHash ??= hasher.HashPassword("DummyPasswordForTimingMitigation_Security123!");
    }

    public async Task<Result<AuthResponseDto>> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        var key = request.UserNameOrEmail.Trim().ToLowerInvariant();

        // 1. Account Lockout Check (Brute-force protection)
        if (FailedAttemptsTracker.TryGetValue(key, out var state) && state.LockoutUntilUtc.HasValue)
        {
            if (DateTime.UtcNow < state.LockoutUntilUtc.Value)
            {
                var remainingMinutes = (int)Math.Max(1, Math.Ceiling((state.LockoutUntilUtc.Value - DateTime.UtcNow).TotalMinutes));
                return Result.Failure<AuthResponseDto>(Error.Failure(
                    "Auth.AccountLocked",
                    T(
                        $"تم قفل الحساب مؤقتاً لتجاوز عدد المحاولات الخاطئة. يرجى المحاولة بعد {remainingMinutes} دقيقة.",
                        $"Account is temporarily locked due to too many failed attempts. Please try again in {remainingMinutes} minute(s)."
                    )));
            }
            else
            {
                FailedAttemptsTracker.TryRemove(key, out _);
            }
        }

        var user = await _userRepository.GetByUserNameOrEmailAsync(request.UserNameOrEmail, cancellationToken);
        if (user == null)
        {
            // Execute dummy verify so the execution time is identical to valid user verification (Timing Attack Mitigation)
            _passwordHasher.VerifyPassword(request.Password, GetDummyHash(_passwordHasher));
            RecordFailedAttempt(key);

            return Result.Failure<AuthResponseDto>(Error.Failure(
                "Auth.InvalidCredentials",
                T(
                    "اسم المستخدم أو كلمة المرور غير صحيحة.",
                    "Invalid username or password."
                )));
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            var isLocked = RecordFailedAttempt(key);
            if (isLocked)
            {
                return Result.Failure<AuthResponseDto>(Error.Failure(
                    "Auth.AccountLocked",
                    T(
                        "تم قفل الحساب مؤقتاً لمدة 15 دقيقة بعد 5 محاولات خاطئة متتالية.",
                        "Account has been temporarily locked for 15 minutes after 5 consecutive failed attempts."
                    )));
            }

            return Result.Failure<AuthResponseDto>(Error.Failure(
                "Auth.InvalidCredentials",
                T(
                    "اسم المستخدم أو كلمة المرور غير صحيحة.",
                    "Invalid username or password."
                )));
        }

        // Login successful: reset failed attempts
        FailedAttemptsTracker.TryRemove(key, out _);

        if (!user.IsActive)
        {
            return Result.Failure<AuthResponseDto>(Error.Failure(
                "Auth.AccountDisabled",
                T(
                    "تم تعطيل هذا الحساب. يرجى مراجعة إدارة المنصة.",
                    "This account has been disabled. Please contact the platform administrator."
                )));
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
                    T(
                        "حساب الشركة التابع لها هذا المستخدم موقف أو غير مفعل.",
                        "The company account associated with this user is suspended or inactive."
                    )));
            }
        }

        CompanyRole? companyRole = null;
        if (user.CompanyRoleId.HasValue)
        {
            companyRole = await _companyRoleRepository.GetByIdAsync(user.CompanyRoleId.Value, cancellationToken);
        }

        user.RecordLogin();
        await _userRepository.SaveChangesAsync(cancellationToken);

        var authResponse = _jwtTokenService.GenerateToken(user, company, companyRole);
        return Result.Success(authResponse);
    }

    private static bool RecordFailedAttempt(string key)
    {
        var updated = FailedAttemptsTracker.AddOrUpdate(
            key,
            _ => (1, null),
            (_, old) =>
            {
                var newCount = old.Attempts + 1;
                var lockout = newCount >= 5 ? DateTime.UtcNow.AddMinutes(15) : (DateTime?)null;
                return (newCount, lockout);
            });

        return updated.Attempts >= 5;
    }
}
