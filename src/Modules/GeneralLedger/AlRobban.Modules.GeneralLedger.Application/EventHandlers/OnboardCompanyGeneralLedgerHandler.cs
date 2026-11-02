using AlRobban.Modules.GeneralLedger.Domain.Entities;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.GeneralLedger.Domain.Seeding;
using AlRobban.Shared.Application.Events;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.EventHandlers;

/// <summary>
/// Automatically provisions standard General Ledger entities (Chart of Accounts, Settings,
/// Fiscal Year, Cost Centers, and Default Partners) when a new company / tenant is registered.
/// </summary>
public class OnboardCompanyGeneralLedgerHandler : INotificationHandler<CompanyCreatedEvent>
{
    private readonly IAccountRepository _accountRepository;
    private readonly IFinancialSettingsRepository _settingsRepository;
    private readonly IBusinessPartnerRepository _partnerRepository;

    public OnboardCompanyGeneralLedgerHandler(
        IAccountRepository accountRepository,
        IFinancialSettingsRepository settingsRepository,
        IBusinessPartnerRepository partnerRepository)
    {
        _accountRepository = accountRepository;
        _settingsRepository = settingsRepository;
        _partnerRepository = partnerRepository;
    }

    public async Task Handle(CompanyCreatedEvent notification, CancellationToken cancellationToken)
    {
        // 1. Seed Chart of Accounts if empty
        var hasAccounts = await _accountRepository.HasAnyAccountsAsync(notification.CompanyId, cancellationToken);
        if (!hasAccounts)
        {
            var seedAccounts = DefaultChartOfAccountsSeeder.GenerateDefaultAccounts(notification.TenantId, notification.CompanyId);
            await _accountRepository.AddRangeAsync(seedAccounts, cancellationToken);
            await _accountRepository.SaveChangesAsync(cancellationToken);
        }

        // 2. Seed Financial Settings & Statement Settings
        await _settingsRepository.GetOrCreateSettingsAsync(notification.TenantId, notification.CompanyId, cancellationToken);
        await _settingsRepository.GetOrCreateStatementSettingsAsync(notification.TenantId, notification.CompanyId, cancellationToken);

        // 3. Seed Fiscal Year in GL if not exists
        var activeFiscalYear = await _settingsRepository.GetActiveFiscalYearAsync(notification.CompanyId, cancellationToken);
        if (activeFiscalYear == null)
        {
            var currentYear = DateTime.UtcNow.Year;
            var fiscalYear = FiscalYear.Create(
                notification.TenantId,
                notification.CompanyId,
                currentYear,
                $"السنة المالية {currentYear}",
                $"Fiscal Year {currentYear}",
                new DateTime(currentYear, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                new DateTime(currentYear, 12, 31, 23, 59, 59, DateTimeKind.Utc),
                includeClosingPeriod: true);

            await _settingsRepository.AddFiscalYearAsync(fiscalYear, cancellationToken);
            await _settingsRepository.SaveChangesAsync(cancellationToken);
        }

        // 4. Seed Default Cost Center
        var costCenters = await _settingsRepository.GetCostCentersAsync(notification.CompanyId, cancellationToken);
        if (costCenters == null || costCenters.Count == 0)
        {
            var defaultCostCenter = CostCenter.Create(
                notification.TenantId,
                notification.CompanyId,
                "CC-001",
                "الإدارة العامة والتشغيل",
                "General Administration & Operations",
                null,
                "مركز التكلفة الافتراضي لعمليات المنشأة");

            await _settingsRepository.AddCostCenterAsync(defaultCostCenter, cancellationToken);
            await _settingsRepository.SaveChangesAsync(cancellationToken);
        }

        // 5. Seed Default Business Partners (Cash Customer & Cash Supplier)
        var cashCust = await _partnerRepository.GetByCodeAsync(notification.CompanyId, "CUST-CASH", cancellationToken);
        if (cashCust == null)
        {
            var customer = BusinessPartner.Create(
                notification.TenantId,
                notification.CompanyId,
                "CUST-CASH",
                PartnerType.Customer,
                "عميل نقدي عام",
                "General Cash Customer",
                taxNumber: null,
                commercialRegistration: null,
                phone: null,
                email: null,
                address: "المملكة العربية السعودية",
                creditLimit: 0m,
                paymentTermsDays: 0,
                glAccountId: null,
                createdBy: "SystemOnboarding");

            await _partnerRepository.AddAsync(customer, cancellationToken);
        }

        var cashSupp = await _partnerRepository.GetByCodeAsync(notification.CompanyId, "SUPP-CASH", cancellationToken);
        if (cashSupp == null)
        {
            var supplier = BusinessPartner.Create(
                notification.TenantId,
                notification.CompanyId,
                "SUPP-CASH",
                PartnerType.Supplier,
                "مورد نقدي عام",
                "General Cash Supplier",
                taxNumber: null,
                commercialRegistration: null,
                phone: null,
                email: null,
                address: "المملكة العربية السعودية",
                creditLimit: 0m,
                paymentTermsDays: 0,
                glAccountId: null,
                createdBy: "SystemOnboarding");

            await _partnerRepository.AddAsync(supplier, cancellationToken);
        }

        await _partnerRepository.SaveChangesAsync(cancellationToken);
    }
}
