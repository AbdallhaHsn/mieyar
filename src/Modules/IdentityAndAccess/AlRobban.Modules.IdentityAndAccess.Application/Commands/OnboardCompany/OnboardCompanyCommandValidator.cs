using FluentValidation;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.OnboardCompany;

public class OnboardCompanyCommandValidator : AbstractValidator<OnboardCompanyCommand>
{
    public OnboardCompanyCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("كود الشركة إلزامي / Company code is required.")
            .MaximumLength(20);

        RuleFor(x => x.NameAr).NotEmpty().WithMessage("الاسم العربي للشركة إلزامي.");
        RuleFor(x => x.NameEn).NotEmpty().WithMessage("الاسم الإنجليزي للشركة إلزامي.");

        RuleFor(x => x.VatNumber)
            .NotEmpty().WithMessage("الرقم الضريبي إلزامي.")
            .Length(15).WithMessage("الرقم الضريبي يجب أن يتكون من 15 رقماً.")
            .Matches(@"^3\d{13}3$").WithMessage("الرقم الضريبي السعودي يجب أن يبدأ وينتهي بالرقم 3.");

        RuleFor(x => x.CommercialRegistration).NotEmpty().WithMessage("رقم السجل التجاري إلزامي.");

        // Admin User validation
        RuleFor(x => x.AdminUser).NotNull().WithMessage("بيانات المدير المسؤول إلزامية.");
        RuleFor(x => x.AdminUser.UserName)
            .NotEmpty().WithMessage("اسم المستخدم لمدير الشركة إلزامي.")
            .MinimumLength(3).WithMessage("اسم المستخدم يجب ألا يقل عن 3 أحرف.");

        RuleFor(x => x.AdminUser.Email)
            .NotEmpty().WithMessage("البريد الإلكتروني إلزامي.")
            .EmailAddress().WithMessage("صيغة البريد الإلكتروني غير صحيحة.");

        RuleFor(x => x.AdminUser.Password)
            .NotEmpty().WithMessage("كلمة المرور إلزامية.")
            .MinimumLength(6).WithMessage("كلمة المرور يجب ألا تقل عن 6 خانات.");

        RuleFor(x => x.AdminUser.FullNameAr).NotEmpty().WithMessage("اسم المدير بالعربية إلزامي.");
        RuleFor(x => x.AdminUser.FullNameEn).NotEmpty().WithMessage("اسم المدير بالإنجليزية إلزامي.");
    }
}
