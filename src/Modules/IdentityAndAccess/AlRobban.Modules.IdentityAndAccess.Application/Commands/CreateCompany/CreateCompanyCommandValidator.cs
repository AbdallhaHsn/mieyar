using FluentValidation;

namespace AlRobban.Modules.IdentityAndAccess.Application.Commands.CreateCompany;

public class CreateCompanyCommandValidator : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyCommandValidator()
    {
        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("كود الشركة إلزامي / Company code is required.")
            .MaximumLength(20).WithMessage("كود الشركة يجب ألا يتجاوز 20 حرفاً.");

        RuleFor(x => x.NameAr)
            .NotEmpty().WithMessage("الاسم العربي للشركة إلزامي / Arabic company name is required.")
            .MaximumLength(200);

        RuleFor(x => x.NameEn)
            .NotEmpty().WithMessage("الاسم الإنجليزي للشركة إلزامي / English company name is required.")
            .MaximumLength(200);

        RuleFor(x => x.VatNumber)
            .NotEmpty().WithMessage("الرقم الضريبي إلزامي / VAT number is required.")
            .Length(15).WithMessage("الرقم الضريبي يجب أن يتكون من 15 رقماً بالضبط وفق متطلبات هيئة الزكاة / VAT number must be exactly 15 digits.")
            .Matches(@"^3\d{13}3$").WithMessage("الرقم الضريبي السعودي يجب أن يبدأ بالرقم 3 وينتهي بالرقم 3 / Saudi VAT number must start and end with 3.");

        RuleFor(x => x.CommercialRegistration)
            .NotEmpty().WithMessage("رقم السجل التجاري إلزامي / Commercial registration number is required.")
            .MaximumLength(50);

        RuleFor(x => x.CurrencyCode)
            .NotEmpty().WithMessage("رمز العملة إلزامي / Currency code is required.")
            .Length(3).WithMessage("رمز العملة يجب أن يكون 3 أحرف مثل SAR أو USD.");

        RuleFor(x => x.Address).NotNull().WithMessage("العنوان الوطني إلزامي.");
        RuleFor(x => x.Address.StreetName).NotEmpty().WithMessage("اسم الشارع إلزامي لفواتير زكاة ودخل.");
        RuleFor(x => x.Address.BuildingNumber).NotEmpty().WithMessage("رقم المبنى إلزامي.");
        RuleFor(x => x.Address.CityName).NotEmpty().WithMessage("المدينة إلزامية.");
        RuleFor(x => x.Address.PostalZone).NotEmpty().WithMessage("الرمز البريدي إلزامي.");
    }
}
