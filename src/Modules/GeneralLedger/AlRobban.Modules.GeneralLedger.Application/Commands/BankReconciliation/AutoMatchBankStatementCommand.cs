using System.Globalization;
using AlRobban.Modules.GeneralLedger.Application.DTOs;
using AlRobban.Modules.GeneralLedger.Application.Queries.BankReconciliation;
using AlRobban.Shared.Kernel.Primitives;
using MediatR;

namespace AlRobban.Modules.GeneralLedger.Application.Commands.BankReconciliationCommands;

public record AutoMatchBankStatementCommand(ImportBankStatementRequest Request) : IRequest<Result<AutoMatchResultDto>>;

public class AutoMatchBankStatementCommandHandler : IRequestHandler<AutoMatchBankStatementCommand, Result<AutoMatchResultDto>>
{
    private readonly IMediator _mediator;

    public AutoMatchBankStatementCommandHandler(IMediator mediator)
    {
        _mediator = mediator;
    }

    public async Task<Result<AutoMatchResultDto>> Handle(AutoMatchBankStatementCommand command, CancellationToken cancellationToken)
    {
        var req = command.Request;
        if (string.IsNullOrWhiteSpace(req.RawCsvOrText))
        {
            return Result.Failure<AutoMatchResultDto>(new Error("BankStatement.Empty", "النص أو ملف الكشف البنكي فارغ"));
        }

        var statementDate = req.StatementDate ?? DateTime.UtcNow.Date;
        var endingBalance = req.StatementEndingBalance ?? 0m;

        // 1. Get current workspace transactions
        var wsQuery = new GetBankReconciliationWorkspaceQuery(
            req.CompanyId,
            req.BankAccountId,
            statementDate,
            endingBalance);

        var wsResult = await _mediator.Send(wsQuery, cancellationToken);
        if (wsResult.IsFailure)
        {
            return Result.Failure<AutoMatchResultDto>(wsResult.Error);
        }

        var systemTransactions = wsResult.Value.Transactions.ToList();
        if (!systemTransactions.Any())
        {
            return Result.Failure<AutoMatchResultDto>(new Error("BankStatement.NoTransactions", "لا توجد حركات دفترية في النظام لهذا الحساب لمطابقتها"));
        }

        // 2. Parse the CSV / Tab-separated statement
        var parsedRows = ParseStatement(req.RawCsvOrText);
        if (!parsedRows.Any())
        {
            return Result.Failure<AutoMatchResultDto>(new Error("BankStatement.InvalidFormat", "تعذر قراءة أسطر الكشف البنكي، يرجى التأكد من التنسيق (تاريخ، مرجع، بيان، مدين، دائن)"));
        }

        // 3. Auto-Matching Algorithm
        var matchedLineIds = new HashSet<Guid>();
        var remainingSystemTransactions = systemTransactions.ToList();
        decimal totalMatchedAmount = 0m;

        foreach (var row in parsedRows)
        {
            // Try matching by exact Reference first
            BankReconciliationTransactionDto? bestMatch = null;

            if (!string.IsNullOrWhiteSpace(row.ReferenceNumber))
            {
                bestMatch = remainingSystemTransactions.FirstOrDefault(t =>
                    !matchedLineIds.Contains(t.JournalEntryLineId) &&
                    !string.IsNullOrWhiteSpace(t.ReferenceNumber) &&
                    string.Equals(t.ReferenceNumber.Trim(), row.ReferenceNumber.Trim(), StringComparison.OrdinalIgnoreCase) &&
                    (Math.Abs(t.Debit - row.Debit) < 0.01m && Math.Abs(t.Credit - row.Credit) < 0.01m));
            }

            // If no match by reference, match by Amount and Date proximity (+- 7 days)
            if (bestMatch == null)
            {
                bestMatch = remainingSystemTransactions.FirstOrDefault(t =>
                    !matchedLineIds.Contains(t.JournalEntryLineId) &&
                    ((row.Debit > 0 && Math.Abs(t.Debit - row.Debit) < 0.01m) ||
                     (row.Credit > 0 && Math.Abs(t.Credit - row.Credit) < 0.01m) ||
                     (row.Amount != 0 && Math.Abs(t.NetAmount - row.Amount) < 0.01m)) &&
                    Math.Abs((t.TransactionDate.Date - row.TransactionDate.Date).TotalDays) <= 7);
            }

            if (bestMatch != null)
            {
                matchedLineIds.Add(bestMatch.JournalEntryLineId);
                remainingSystemTransactions.Remove(bestMatch);
                totalMatchedAmount += (bestMatch.Debit > 0 ? bestMatch.Debit : bestMatch.Credit);
            }
        }

        // 4. Update transactions list with matched flag
        var updatedTransactions = systemTransactions.Select(t =>
        {
            var isMatched = matchedLineIds.Contains(t.JournalEntryLineId) || t.IsMatched;
            return t with { IsMatched = isMatched };
        }).ToList();

        var message = $"تم مطابقة {matchedLineIds.Count} حركة بنكية بنجاح من أصل {parsedRows.Count} حركة في الكشف البنكي بمبلغ إجمالي {totalMatchedAmount:N2} ريال.";

        return Result.Success(new AutoMatchResultDto(
            parsedRows.Count,
            matchedLineIds.Count,
            parsedRows.Count - matchedLineIds.Count,
            totalMatchedAmount,
            matchedLineIds.ToList(),
            updatedTransactions,
            message));
    }

    private List<ImportedStatementRowDto> ParseStatement(string rawText)
    {
        var result = new List<ImportedStatementRowDto>();
        var lines = rawText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;

            // Split by tab, comma, or semicolon
            string[] cols;
            if (trimmed.Contains('\t'))
                cols = trimmed.Split('\t');
            else if (trimmed.Contains(';'))
                cols = trimmed.Split(';');
            else
                cols = trimmed.Split(',');

            if (cols.Length < 3) continue;

            // Attempt to parse Date from 1st or 2nd column
            DateTime date = DateTime.UtcNow.Date;
            bool dateParsed = false;
            string dateStr = cols[0].Trim().Replace("\"", "");
            if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ||
                DateTime.TryParse(dateStr, out d))
            {
                date = d;
                dateParsed = true;
            }

            if (!dateParsed) continue; // Skip header row or non-data lines

            string refNum = cols.Length > 1 ? cols[1].Trim().Replace("\"", "") : "";
            string desc = cols.Length > 2 ? cols[2].Trim().Replace("\"", "") : "";

            decimal debit = 0;
            decimal credit = 0;
            decimal amount = 0;

            if (cols.Length >= 5)
            {
                // Format: Date, Ref, Desc, Debit, Credit
                decimal.TryParse(cols[3].Trim().Replace("\"", "").Replace(" ", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out debit);
                decimal.TryParse(cols[4].Trim().Replace("\"", "").Replace(" ", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out credit);
                amount = debit - credit;
            }
            else if (cols.Length == 4)
            {
                // Format: Date, Ref/Desc, Amount
                if (decimal.TryParse(cols[3].Trim().Replace("\"", "").Replace(" ", ""), NumberStyles.Any, CultureInfo.InvariantCulture, out var amt))
                {
                    amount = amt;
                    if (amt > 0) debit = amt;
                    else credit = Math.Abs(amt);
                }
            }

            result.Add(new ImportedStatementRowDto(date, refNum, desc, debit, credit, amount));
        }

        return result;
    }
}
