using AlRobban.Modules.GeneralLedger.Application.Commands.JournalEntries;
using AlRobban.Modules.GeneralLedger.Application.Commands.Vouchers;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Domain.Enums;
using AlRobban.Modules.GeneralLedger.Domain.Repositories;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.InvoicingAndZatca.Application.Commands;

public record PayInvoiceRequest(
    decimal Amount,
    DateTime? PaymentDate = null,
    string PaymentMethod = "Bank",
    Guid? PaymentAccountId = null,
    string? ReferenceNumber = null,
    string? Notes = null);

public record PayInvoiceCommand(
    Guid InvoiceId,
    PayInvoiceRequest Request,
    string RecordedBy = "User") : IRequest<Result<InvoiceDto>>;

public class PayInvoiceCommandHandler : IRequestHandler<PayInvoiceCommand, Result<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IAccountRepository _accountRepo;
    private readonly IBusinessPartnerRepository? _partnerRepo;
    private readonly IMediator _mediator;

    public PayInvoiceCommandHandler(
        IInvoiceRepository invoiceRepo,
        IAccountRepository accountRepo,
        IMediator mediator,
        IBusinessPartnerRepository? partnerRepo = null)
    {
        _invoiceRepo = invoiceRepo;
        _accountRepo = accountRepo;
        _mediator = mediator;
        _partnerRepo = partnerRepo;
    }

    public async Task<Result<InvoiceDto>> Handle(PayInvoiceCommand command, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(command.InvoiceId, cancellationToken);
        if (invoice == null)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.NotFound", "الفاتورة غير موجودة"));
        }

        if (invoice.Status == InvoiceStatus.Draft)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.NotIssued", "لا يمكن سداد فاتورة ما زالت في حالة مسودة. يجب اعتمادها أولاً"));
        }

        if (invoice.Status == InvoiceStatus.Cancelled)
        {
            return Result.Failure<InvoiceDto>(new Error("Invoice.Cancelled", "لا يمكن سداد فاتورة ملغاة"));
        }

        var amount = Math.Round(command.Request.Amount, 2);
        if (amount <= 0)
        {
            return Result.Failure<InvoiceDto>(new Error("Payment.InvalidAmount", "مبلغ السداد يجب أن يكون أكبر من صفر"));
        }

        // Calculate any credit notes already issued against this invoice
        var allCompanyInvoices = await _invoiceRepo.GetListAsync(invoice.CompanyId, null, TransactionType.CreditNote, null, null, null, null, cancellationToken);
        var returnedAmount = allCompanyInvoices
            .Where(cn => (cn.ReferenceInvoiceId.HasValue && cn.ReferenceInvoiceId.Value == invoice.Id) || (!string.IsNullOrEmpty(cn.ReferenceInvoiceNumber) && string.Equals(cn.ReferenceInvoiceNumber, invoice.InvoiceNumber, StringComparison.OrdinalIgnoreCase)))
            .Where(cn => cn.Status != InvoiceStatus.Cancelled)
            .DistinctBy(cn => cn.Id)
            .Sum(cn => cn.TotalAmount);

        var netRemaining = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount - returnedAmount);

        if (amount > netRemaining)
        {
            return Result.Failure<InvoiceDto>(new Error("Payment.ExceedsRemaining", $"مبلغ السداد ({amount:N2} ر.س) يتجاوز صافي المبلغ المتبقي المطلوب بعد خصم المرتجع ({netRemaining:N2} ر.س)"));
        }

        // 1. Record Payment in Invoice aggregate
        invoice.RecordPayment(amount);

        // 2. Adjust Customer's Outstanding Balance in Business Partners
        if (invoice.CustomerId.HasValue && _partnerRepo != null)
        {
            try
            {
                var customer = await _partnerRepo.GetByIdAsync(invoice.CustomerId.Value, cancellationToken);
                if (customer != null)
                {
                    customer.AdjustBalance(amount, isIncrease: false);
                    await _partnerRepo.SaveChangesAsync(cancellationToken);
                }
            }
            catch
            {
                // Non-blocking fallback
            }
        }

        // 3. Post Receipt Journal Entry (Dr. Cash/Bank, Cr. Accounts Receivable)
        try
        {
            var allAccounts = await _accountRepo.GetAllByCompanyAsync(invoice.CompanyId, cancellationToken);

            var arAccount = allAccounts.FirstOrDefault(a => a.AccountCode == "11201" && a.IsPostable)
                         ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("112") && a.IsPostable);

            var paymentAccount = command.Request.PaymentAccountId.HasValue
                ? allAccounts.FirstOrDefault(a => a.Id == command.Request.PaymentAccountId.Value)
                : null;

            if (paymentAccount == null)
            {
                var isCash = command.Request.PaymentMethod?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true;
                paymentAccount = isCash
                    ? (allAccounts.FirstOrDefault(a => a.AccountCode == "11101" && a.IsPostable) ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111") && a.IsPostable))
                    : (allAccounts.FirstOrDefault(a => a.AccountCode == "11102" && a.IsPostable) ?? allAccounts.FirstOrDefault(a => a.AccountCode.StartsWith("111") && a.IsPostable));
            }

            if (arAccount != null && paymentAccount != null)
            {
                var paymentDate = command.Request.PaymentDate ?? DateTime.UtcNow;
                var paymentMethod = command.Request.PaymentMethod?.Equals("Cash", StringComparison.OrdinalIgnoreCase) == true
                    ? PaymentMethod.Cash
                    : PaymentMethod.BankTransfer;

                var voucherLines = new List<CreateVoucherLineRequest>
                {
                    new CreateVoucherLineRequest(
                        AccountId: arAccount.Id,
                        Amount: amount,
                        Description: $"تحصيل دفعة من فاتورة مبيعات رقم {invoice.InvoiceNumber} - العميل: {invoice.CustomerName}",
                        CostCenterId: null)
                };

                var voucherCmd = new CreateVoucherCommand(
                    CompanyId: invoice.CompanyId,
                    Type: VoucherType.Receipt,
                    VoucherDate: paymentDate,
                    PaymentMethod: paymentMethod,
                    CashOrBankAccountId: paymentAccount.Id,
                    BeneficiaryOrPayerName: !string.IsNullOrWhiteSpace(invoice.CustomerName) ? invoice.CustomerName : "عميل مبيعات",
                    Description: $"سند قبض تحصيل فاتورة مبيعات رقم {invoice.InvoiceNumber}",
                    ReferenceNumber: !string.IsNullOrWhiteSpace(command.Request.ReferenceNumber) ? command.Request.ReferenceNumber : invoice.InvoiceNumber,
                    FiscalPeriodId: null,
                    Lines: voucherLines,
                    AutoPost: true);

                await _mediator.Send(voucherCmd, cancellationToken);
            }
        }
        catch
        {
            // Non-blocking fallback
        }

        await _invoiceRepo.SaveChangesAsync(cancellationToken);
        return Result.Success(CreateInvoiceCommandHandler.MapToDto(invoice, returnedAmount));
    }
}
