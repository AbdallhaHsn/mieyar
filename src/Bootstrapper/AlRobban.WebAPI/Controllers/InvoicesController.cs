using AlRobban.Modules.InvoicingAndZatca.Application.Commands;
using AlRobban.Modules.InvoicingAndZatca.Application.DTOs;
using AlRobban.Modules.InvoicingAndZatca.Application.Queries;
using AlRobban.Modules.InvoicingAndZatca.Application.Services;
using AlRobban.Modules.InvoicingAndZatca.Domain.Enums;
using AlRobban.Modules.InvoicingAndZatca.Domain.Repositories;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AlRobban.WebAPI.Controllers;

[ApiController]
[Route("api/invoices")]
public class InvoicesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IInvoiceRepository _invoiceRepo;
    private readonly IInvoiceCryptoService _cryptoService;

    public InvoicesController(
        IMediator mediator,
        IInvoiceRepository invoiceRepo,
        IInvoiceCryptoService cryptoService)
    {
        _mediator = mediator;
        _invoiceRepo = invoiceRepo;
        _cryptoService = cryptoService;
    }

    /// <summary>
    /// استرجاع قائمة الفواتير الضريبية والإشعارات الدائنة والمدينة مع الفلاتر
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<InvoiceDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? companyId,
        [FromQuery] InvoiceType? invoiceType,
        [FromQuery] TransactionType? transactionType,
        [FromQuery] InvoiceStatus? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] string? searchTerm,
        CancellationToken cancellationToken)
    {
        var query = new GetInvoicesQuery(
            companyId,
            invoiceType,
            transactionType,
            status,
            fromDate,
            toDate,
            searchTerm);

        var result = await _mediator.Send(query, cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// المؤشرات المالية لموديل الفوترة وضريبة القيمة المضافة
    /// </summary>
    [HttpGet("kpis")]
    [ProducesResponseType(typeof(InvoiceKpisDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKpis([FromQuery] Guid? companyId, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetInvoiceKpisQuery(companyId), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// استرجاع تفاصيل فاتورة ضريبية كاملة برقم المعرف
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetInvoiceByIdQuery(id), cancellationToken);
        if (result.IsFailure)
        {
            return NotFound(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// إنشاء فاتورة ضريبية جديدة (مسودة أو إصدار وترحيل فوري)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest request, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new CreateInvoiceCommand(request), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// اعتماد وإصدار الفاتورة وتوليد كود الاستجابة السريعة (ZATCA QR) والختم الرقمي
    /// </summary>
    [HttpPost("{id:guid}/issue")]
    [ProducesResponseType(typeof(IssueInvoiceResultDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Issue([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new IssueInvoiceCommand(id), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// سداد أو تحصيل دفعة من الفاتورة الضريبية وترحيل سند القبض
    /// </summary>
    [HttpPost("{id:guid}/pay")]
    [ProducesResponseType(typeof(InvoiceDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Pay(
        [FromRoute] Guid id,
        [FromBody] PayInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new PayInvoiceCommand(id, request, User.Identity?.Name ?? "User"), cancellationToken);
        if (result.IsFailure)
        {
            return BadRequest(new { result.Error.Code, result.Error.Description });
        }
        return Ok(result.Value);
    }

    /// <summary>
    /// تحميل ملف الفاتورة بصيغة UBL 2.1 XML المطابقة لمتطلبات زكاة المرحلة الثانية
    /// </summary>
    [HttpGet("{id:guid}/xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> DownloadXml([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var invoice = await _invoiceRepo.GetByIdAsync(id, cancellationToken);
        if (invoice == null)
        {
            return NotFound(new { error = "الفاتورة المطلوبة غير موجودة" });
        }

        var zatcaConfig = await _invoiceRepo.GetZatcaConfigAsync(invoice.CompanyId, cancellationToken);
        var sellerName = !string.IsNullOrWhiteSpace(zatcaConfig?.OrganizationName) 
            ? zatcaConfig.OrganizationName 
            : "شركة الربان للحلول الذكية";
        var sellerVat = !string.IsNullOrWhiteSpace(zatcaConfig?.OrganizationVatNumber) 
            ? zatcaConfig.OrganizationVatNumber 
            : "300123456700003";

        var cert = zatcaConfig?.ProductionCsid ?? zatcaConfig?.ComplianceCsid;
        var xml = _cryptoService.GenerateInvoiceXml(invoice, sellerName, sellerVat, invoice.CryptographicStamp, cert);
        var bytes = System.Text.Encoding.UTF8.GetBytes(xml);
        return File(bytes, "application/xml", $"{invoice.InvoiceNumber}.xml");
    }
}

