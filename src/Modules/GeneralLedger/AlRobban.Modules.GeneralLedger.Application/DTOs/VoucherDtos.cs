using AlRobban.Modules.GeneralLedger.Domain.Enums;

namespace AlRobban.Modules.GeneralLedger.Application.DTOs;

public record VoucherLineDto(
    Guid Id,
    int LineNumber,
    Guid AccountId,
    string AccountCode,
    string AccountNameAr,
    string AccountNameEn,
    Guid? CostCenterId,
    string? CostCenterNameAr,
    decimal Amount,
    string? Description);

public record VoucherDto(
    Guid Id,
    Guid CompanyId,
    VoucherType VoucherType,
    string VoucherTypeNameAr,
    string VoucherTypeNameEn,
    string VoucherNumber,
    DateTime VoucherDate,
    Guid FiscalPeriodId,
    string FiscalPeriodNameAr,
    PaymentMethod PaymentMethod,
    string PaymentMethodNameAr,
    string? ReferenceNumber,
    Guid CashOrBankAccountId,
    string CashOrBankAccountCode,
    string CashOrBankAccountNameAr,
    string BeneficiaryOrPayerName,
    string Description,
    decimal Amount,
    string AmountTafqeetAr,
    Guid? JournalEntryId,
    string? JournalEntryNumber,
    VoucherStatus Status,
    string StatusNameAr,
    int LinesCount,
    DateTime? PostedAtUtc,
    string? PostedBy,
    DateTime? CancelledAtUtc,
    string? CancelledBy,
    string? CancellationReason,
    List<VoucherLineDto> Lines);

public record CreateVoucherLineRequest(
    Guid AccountId,
    decimal Amount,
    string? Description,
    Guid? CostCenterId);

public record CreateVoucherRequest(
    Guid CompanyId,
    VoucherType VoucherType,
    DateTime VoucherDate,
    Guid FiscalPeriodId,
    PaymentMethod PaymentMethod,
    Guid CashOrBankAccountId,
    string BeneficiaryOrPayerName,
    string Description,
    string? ReferenceNumber,
    List<CreateVoucherLineRequest> Lines);

public record PostVoucherRequest(string? PostedBy);

public record CancelVoucherRequest(string Reason, string? CancelledBy);

public record VoucherKpisDto(
    int TotalVouchers,
    int ReceiptCount,
    int PaymentCount,
    int PostedCount,
    int DraftCount,
    decimal TotalReceiptsAmount,
    decimal TotalPaymentsAmount,
    decimal NetCashFlow);

public record VoucherListResponse(
    List<VoucherDto> Items,
    VoucherKpisDto Kpis);
