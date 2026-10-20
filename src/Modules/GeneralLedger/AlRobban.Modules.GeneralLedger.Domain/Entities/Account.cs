using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.ValueObjects;
using AlRobban.Shared.Kernel.Primitives;

namespace AlRobban.Modules.GeneralLedger.Domain.Entities;

public class Account : AggregateRoot<Guid>, IMustHaveTenant, IAuditableEntity, ISoftDeletable
{
    public Guid TenantId { get; set; }
    public Guid CompanyId { get; private set; }
    public string AccountCode { get; private set; } = string.Empty;
    public string NameAr { get; private set; } = string.Empty;
    public string NameEn { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public Guid? ParentAccountId { get; private set; }
    public Account? ParentAccount { get; private set; }
    public List<Account> SubAccounts { get; private set; } = new();

    public int Level { get; private set; } = 1;
    public AccountType AccountType { get; private set; }
    public AccountNature AccountNature { get; private set; }
    public FinancialStatement FinancialStatement { get; private set; }
    public bool IsPostable { get; private set; } // True if account accepts journal vouchers, False if group header
    public bool IsActive { get; private set; } = true;
    public string CurrencyCode { get; private set; } = "SAR";
    public decimal CurrentBalance { get; private set; } = 0m;

    // Professional IFRS / SOCPA Guidance
    public AccountingStandardGuidance? Guidance { get; private set; }

    // Audit and Soft Delete
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? LastModifiedAtUtc { get; set; }
    public string? LastModifiedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public string? DeletedBy { get; set; }

    private Account() { }

    public static Account CreateRoot(
        Guid tenantId,
        Guid companyId,
        string accountCode,
        string nameAr,
        string nameEn,
        AccountType accountType,
        AccountNature accountNature,
        FinancialStatement financialStatement,
        AccountingStandardGuidance? guidance = null,
        string? description = null)
    {
        return new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            AccountCode = accountCode.Trim(),
            NameAr = nameAr.Trim(),
            NameEn = nameEn.Trim(),
            AccountType = accountType,
            AccountNature = accountNature,
            FinancialStatement = financialStatement,
            Level = 1,
            IsPostable = false, // Root accounts are summary groups
            IsActive = true,
            Guidance = guidance,
            Description = description
        };
    }

    public static Account CreateSubAccount(
        Guid tenantId,
        Guid companyId,
        Account parentAccount,
        string accountCode,
        string nameAr,
        string nameEn,
        bool isPostable,
        AccountingStandardGuidance? guidance = null,
        string? description = null,
        AccountNature? overrideNature = null)
    {
        if (parentAccount == null)
            throw new ArgumentNullException(nameof(parentAccount));

        return new Account
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            CompanyId = companyId,
            ParentAccountId = parentAccount.Id,
            AccountCode = accountCode.Trim(),
            NameAr = nameAr.Trim(),
            NameEn = nameEn.Trim(),
            Level = parentAccount.Level + 1,
            AccountType = parentAccount.AccountType,
            AccountNature = overrideNature ?? parentAccount.AccountNature,
            FinancialStatement = parentAccount.FinancialStatement,
            IsPostable = isPostable,
            IsActive = true,
            Guidance = guidance ?? parentAccount.Guidance,
            Description = description
        };
    }

    public void UpdateDetails(string nameAr, string nameEn, string? description, bool isActive)
    {
        NameAr = nameAr.Trim();
        NameEn = nameEn.Trim();
        Description = description;
        IsActive = isActive;
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void SetGuidance(AccountingStandardGuidance guidance)
    {
        Guidance = guidance;
        LastModifiedAtUtc = DateTime.UtcNow;
    }

    public void UpdateBalance(decimal amount, AccountNature transactionSide)
    {
        // If transaction side matches account nature, balance increases; otherwise decreases
        if (transactionSide == AccountNature)
        {
            CurrentBalance += amount;
        }
        else
        {
            CurrentBalance -= amount;
        }
        LastModifiedAtUtc = DateTime.UtcNow;
    }
}
