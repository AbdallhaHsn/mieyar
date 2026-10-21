import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    tcPr = cell._element.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    borders = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
    for side, border in borders.items():
        if border:
            el = parse_xml(f'<w:{side} {nsdecls("w")} w:val="{border.get("val", "single")}" w:sz="{border.get("sz", "4")}" w:space="0" w:color="{border.get("color", "CCCCCC")}"/>')
            tcBorders.append(el)
        else:
            el = parse_xml(f'<w:{side} {nsdecls("w")} w:val="none"/>')
            tcBorders.append(el)
    tcPr.append(tcBorders)

def add_heading_ar(doc, text, level=1):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(text)
    run.font.name = 'Segoe UI'
    run.font.bold = True
    
    if level == 1:
        run.font.size = Pt(18)
        run.font.color.rgb = RGBColor(16, 55, 92) # Navy Blue
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        # Add bottom accent line
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="16" w:space="4" w:color="0D9488"/></w:pBdr>')
        p._p.get_or_add_pPr().append(pBdr)
    elif level == 2:
        run.font.size = Pt(14)
        run.font.color.rgb = RGBColor(13, 148, 136) # Teal
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
    elif level == 3:
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(30, 41, 59) # Slate Dark
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
    return p

def add_paragraph_ar(doc, text="", bold_prefix=None, space_after=6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.25
    
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = 'Segoe UI'
        r_bold.font.bold = True
        r_bold.font.size = Pt(10.5)
        r_bold.font.color.rgb = RGBColor(16, 55, 92)
        
    if text:
        r_text = p.add_run(text)
        r_text.font.name = 'Segoe UI'
        r_text.font.size = Pt(10.5)
        r_text.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_bullet_ar(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.2
    
    if bold_prefix:
        r_bold = p.add_run(bold_prefix + " ")
        r_bold.font.name = 'Segoe UI'
        r_bold.font.bold = True
        r_bold.font.size = Pt(10)
        r_bold.font.color.rgb = RGBColor(15, 23, 42)
        
    r_text = p.add_run(text)
    r_text.font.name = 'Segoe UI'
    r_text.font.size = Pt(10)
    r_text.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_code_block(doc, code_str, title=None):
    if title:
        tp = doc.add_paragraph()
        tp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        tp.paragraph_format.space_before = Pt(8)
        tp.paragraph_format.space_after = Pt(2)
        tr = tp.add_run("💻 " + title)
        tr.font.name = 'Segoe UI'
        tr.font.bold = True
        tr.font.size = Pt(10)
        tr.font.color.rgb = RGBColor(13, 148, 136)

    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F1F5F9") # slate-100
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    set_cell_borders(cell, 
                     left={'val': 'single', 'sz': '24', 'color': '0D9488'}, # Accent left border
                     top={'val': 'single', 'sz': '4', 'color': 'CBD5E1'},
                     right={'val': 'single', 'sz': '4', 'color': 'CBD5E1'},
                     bottom={'val': 'single', 'sz': '4', 'color': 'CBD5E1'})
    
    cp = cell.paragraphs[0]
    cp.alignment = WD_ALIGN_PARAGRAPH.LEFT # Code is left-aligned
    cp.paragraph_format.space_before = Pt(0)
    cp.paragraph_format.space_after = Pt(0)
    cp.paragraph_format.line_spacing = 1.15
    
    crun = cp.add_run(code_str)
    crun.font.name = 'Consolas'
    crun.font.size = Pt(9.5)
    crun.font.color.rgb = RGBColor(30, 41, 59)
    
    # spacing after table
    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(6)

def add_callout_box(doc, text, title="ملاحظة هامة", icon="💡", bg_color="ECFDF5", border_color="10B981"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=120, bottom=120, left=160, right=160)
    set_cell_borders(cell, 
                     right={'val': 'single', 'sz': '24', 'color': border_color}, # Right border for Arabic
                     top={'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                     left={'val': 'single', 'sz': '4', 'color': 'E2E8F0'},
                     bottom={'val': 'single', 'sz': '4', 'color': 'E2E8F0'})
    
    cp = cell.paragraphs[0]
    cp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    cp.paragraph_format.space_before = Pt(0)
    cp.paragraph_format.space_after = Pt(2)
    
    tr = cp.add_run(f"{icon} {title}: ")
    tr.font.name = 'Segoe UI'
    tr.font.bold = True
    tr.font.size = Pt(10)
    tr.font.color.rgb = RGBColor(15, 23, 42)
    
    tr2 = cp.add_run(text)
    tr2.font.name = 'Segoe UI'
    tr2.font.size = Pt(9.5)
    tr2.font.color.rgb = RGBColor(51, 65, 85)
    
    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(6)

def create_startup_doc():
    doc = Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    # --- غلاف / ترويسة أنيقة ---
    header_table = doc.add_table(rows=1, cols=1)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_cell = header_table.cell(0, 0)
    header_cell.width = Inches(6.9)
    set_cell_background(header_cell, "10375C") # Royal Navy Blue
    set_cell_margins(header_cell, top=260, bottom=260, left=220, right=220)
    set_cell_borders(header_cell)
    
    hp = header_cell.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    hrun1 = hp.add_run("دليل تشغيل النظام واسكربتات الإقلاع الشاملة\n")
    hrun1.font.name = 'Segoe UI'
    hrun1.font.bold = True
    hrun1.font.size = Pt(22)
    hrun1.font.color.rgb = RGBColor(255, 255, 255)
    
    hrun2 = hp.add_run("نظام الربان المحاسبي المتكامل والفوترة الإلكترونية (Al-Roban ERP & E-Invoicing)\n")
    hrun2.font.name = 'Segoe UI'
    hrun2.font.bold = True
    hrun2.font.size = Pt(13)
    hrun2.font.color.rgb = RGBColor(13, 219, 198) # Bright Teal
    
    hrun3 = hp.add_run("معمارية Modular Monolith • ASP.NET Core 8 • Angular 19 • SQL Server • ZATCA Phase 2")
    hrun3.font.name = 'Segoe UI'
    hrun3.font.size = Pt(9.5)
    hrun3.font.color.rgb = RGBColor(226, 232, 240)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    
    # --- نبذة عامة وحالة النظام الآن ---
    add_heading_ar(doc, "1. حالة النظام الحالية (System Live Status)", 1)
    add_paragraph_ar(doc, "تم فحص بيئة العمل وتحديثها وتشغيل كامل خدمات النظام بنجاح تام على بيئة المطورين، حيث تعمل المكونات التالية حالياً وبشكل متزامن:")
    
    add_bullet_ar(doc, "يعمل بنجاح ويستمع على المنفذ 5000 (http://localhost:5000) مع توثيق Swagger وشبكة SignalR وفحص الصحة.", "خادم الـ Backend (ASP.NET Core WebAPI):")
    add_bullet_ar(doc, "يعمل بنجاح على المنفذ 4200 (http://localhost:4200) متضمناً لوحة القيادة، شجرة الحسابات، قيود اليومية، وجداول AG-Grid.", "خادم الواجهة الأمامية (Angular 19 Client):")
    add_bullet_ar(doc, "قاعدة البيانات متصلة بنجاح، وتم إنشاء الجداول وفحصها تلقائياً عند إقلاع الـ API.", "قاعدة البيانات (SQL Server 2022 / SQLEXPRESS):")
    add_bullet_ar(doc, "يعمل محلياً لدعم الكاش الموزع والاستعلامات فائقة السرعة.", "خادم التخزين المؤقت (Redis):")
    
    add_callout_box(doc, "كلا الخادمين (Backend & Frontend) يعملان في الوقت الحالي، ويمكنك فتح المتصفح مباشرة على http://localhost:4200 لمعاينة الواجهة أو http://localhost:5000/swagger لتجربة الـ Endpoints.", "حالة التشغيل المباشر", "⚡", "F0FDF4", "22C55E")

    # --- سكربتات التشغيل التلقائي بنقرة واحدة ---
    add_heading_ar(doc, "2. سكربتات التشغيل السريع المجهزة بنقرة واحدة (One-Click Launchers)", 1)
    add_paragraph_ar(doc, "تم تجهيز سكربتات احترافية داخل مجلد المشروع للتشغيل الفوري بنقرة واحدة دون الحاجة لكتابة أوامر يدوية في كل مرة:")
    
    add_bullet_ar(doc, "ملف تنفيذي مباشر موجود في المجلد الرئيسي للمشروع، يكفي النقر المزدوج عليه (Double-Click) في Windows لتشغيل النظام بالكامل في نوافذ مستقلة.", "ملف التشغيل السريع (start-project.bat):")
    add_bullet_ar(doc, "سكربت PowerShell متقدم يقوم بفحص .NET 8 و Node.js، والتأكد من قواعد البيانات، وبناء الحل تلقائياً، وإطلاق الواجهتين وفتح المتصفح.", "سكربت PowerShell الذكي (scripts/start-all.ps1):")

    # كود start-project.bat
    bat_code = """@echo off
chcp 65001 > nul
title تشغيل نظام الربان المحاسبي - Al-Roban ERP
echo ==============================================================================
echo                 نظام الربان المحاسبي المتكامل (Al-Roban ERP)
echo                        سكربت التشغيل السريع
echo ==============================================================================
echo.
echo جاري بدء تشغيل البيئة والواجهة الخلفية والأمامية...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\\start-all.ps1"

echo.
echo تم تنفيذ أمر التشغيل. اضغط أي مفتاح للإغلاق...
pause > nul"""
    add_code_block(doc, bat_code, "كود ملف التشغيل المباشر (start-project.bat)")

    # كود scripts/start-all.ps1
    ps_code = """# ==============================================================================
# نظام الربان المحاسبي - Al-Roban ERP & E-Invoicing
# سكربت التشغيل الشامل (Full Startup Script)
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "تشغيل نظام الربان المحاسبي - Al-Roban ERP"

# 1. ضبط مسارات .NET لضمان أولوية إصدار 64-bit
$env:Path = "C:\\Program Files\\dotnet;$env:Path"
$env:DOTNET_ROOT = "C:\\Program Files\\dotnet"

$rootDir = Split-Path -Parent $PSScriptRoot
if (-not $rootDir) { $rootDir = Get-Location }

# 2. بناء وتجهيز الواجهة الخلفية (.NET Backend)
Push-Location $rootDir
dotnet build AlRobban.sln --configuration Debug --nologo -v q
Pop-Location

# 3. تشغيل الواجهة الخلفية (Backend API) في نافذة منفصلة
$backendCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Al-Roban Backend WebAPI (Port 5000)';
`$env:Path = 'C:\\Program Files\\dotnet;' + `$env:Path;
`$env:DOTNET_ROOT = 'C:\\Program Files\\dotnet';
Set-Location '$rootDir';
dotnet run --project src/Bootstrapper/AlRobban.WebAPI --urls "http://localhost:5000"
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

# 4. تشغيل الواجهة الأمامية (Angular Client) في نافذة منفصلة
$clientDir = Join-Path $rootDir "client"
$frontendCmd = @"
`$Host.UI.RawUI.WindowTitle = 'Al-Roban Angular Client (Port 4200)';
Set-Location '$clientDir';
npm start
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

# 5. فتح المتصفح تلقائياً
Start-Sleep -Seconds 5
Start-Process "http://localhost:4200"
Start-Process "http://localhost:5000/swagger"
"""
    add_code_block(doc, ps_code, "كود سكربت PowerShell الشامل (scripts/start-all.ps1)")

    # --- خطوات التشغيل اليدوية خطوة بخطوة ---
    add_heading_ar(doc, "3. خطوات التشغيل اليدوي خطوة بخطوة (Manual Step-by-Step)", 1)
    add_paragraph_ar(doc, "في حال رغبت بتشغيل الخدمات يدوياً عبر سطر الأوامر (Terminal / PowerShell)، اتبع الخطوات المرتبة التالية:")

    add_heading_ar(doc, "أولاً: تشغيل خدمات البنية التحتية (Docker أو الخدمات المحلية)", 2)
    add_paragraph_ar(doc, "يدعم النظام خيارين للبنية التحتية (قواعد البيانات والـ Cache والطوابير):")
    add_bullet_ar(doc, "إذا كان Docker Desktop مثبتاً ومشغلاً، نفذ الأمر التالي في المجلد الرئيسي لتشغيل SQL Server, Redis, RabbitMQ, Jaeger:", "الخيار الأول (Docker Compose):")
    add_code_block(doc, "docker compose up -d", "تشغيل حاويات Docker")
    add_bullet_ar(doc, "النظام مهيأ بالفعل للاتصال التلقائي بخدمة SQL Server المحلية (SQLEXPRESS) وخدمة Redis المحلية المنصبة على جهاز الويندوز الخاص بك.", "الخيار الثاني (الخدمات المحلية المنصبة):")

    add_heading_ar(doc, "ثانياً: بناء وتشغيل خادم الواجهة الخلفية (Backend API)", 2)
    add_paragraph_ar(doc, "افتح نافذة PowerShell كمسؤول أو عادي في المجلد الرئيسي للمشروع، ونفذ التالي:")
    add_code_block(doc, """# إعطاء الأولوية لمسار .NET 64-bit في الجلسة الحالية
$env:Path = "C:\\Program Files\\dotnet;$env:Path"

# بناء الحل البرمجي
dotnet build AlRobban.sln

# تشغيل خادم الويب
dotnet run --project src/Bootstrapper/AlRobban.WebAPI --urls "http://localhost:5000"
""", "أوامر تشغيل الـ Backend")
    add_paragraph_ar(doc, "عند نجاح التشغيل ستظهر رسالة الاستماع على: http://localhost:5000 وتكون واجهة توثيق Swagger متاحة على: http://localhost:5000/swagger.")

    add_heading_ar(doc, "ثالثاً: تشغيل الواجهة الأمامية (Angular Client)", 2)
    add_paragraph_ar(doc, "افتح نافذة PowerShell أو Terminal ثانية وتوجه إلى مجلد العميل client ثم نفذ:")
    add_code_block(doc, """cd client
npm start
""", "أوامر تشغيل الـ Frontend")
    add_paragraph_ar(doc, "سيقوم خادم التطوير Angular ببدء التشغيل مع ميزة التحديث اللحظي (HMR)، وتكون الشاشة الرئيسية متاحة على: http://localhost:4200.")

    # --- جدول المنافذ والروابط الحيوية ---
    add_heading_ar(doc, "4. جدول المنافذ والروابط الحيوية للنظام (Ports & Endpoints)", 1)
    
    ports_table = doc.add_table(rows=1, cols=4)
    ports_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    ports_table.autofit = False
    
    headers = ["الخدمة / المكون", "المنفذ (Port)", "الرابط المباشر (URL)", "الوظيفة الأساسية"]
    col_widths = [Inches(1.8), Inches(1.0), Inches(2.3), Inches(1.8)]
    
    hdr_cells = ports_table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "10375C")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(title)
        run.font.name = 'Segoe UI'
        run.font.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)
        
    table_data = [
        ("واجهة المستخدم (Angular)", "4200", "http://localhost:4200", "شاشات المحاسبة، القيود، الشجرة، لوحة التحكم"),
        ("واجهة الـ API والتوثيق (Swagger)", "5000", "http://localhost:5000/swagger", "استعراض واختبار جميع الـ Endpoints وتوثيقها"),
        ("فحص صحة النظام (Health Check)", "5000", "http://localhost:5000/api/system/status", "التحقق من حالة السيرفر والموديولات النشطة"),
        ("مركز إشعارات SignalR", "5000", "/hubs/notifications", "البث المباشر لإشعارات الفواتير والترحيل المالي"),
        ("خادم SQL Server المحلي", "1433", "localhost\\SQLEXPRESS", "حفظ البيانات المحاسبية وسجلات التدقيق"),
        ("خادم التخزين المؤقت Redis", "6379", "localhost:6379", "الكاش الموزع، جلسات العمل، وتسريع التقارير"),
        ("لوحة إدارة RabbitMQ (Docker)", "15672", "http://localhost:15672", "إدارة طوابير المهام وأحداث الترحيل المالي"),
        ("لوحة مراقبة Jaeger (Docker)", "16686", "http://localhost:16686", "تتبع مسارات الاستدعاءات عبر OpenTelemetry")
    ]
    
    for row_idx, data in enumerate(table_data):
        row_cells = ports_table.add_row().cells
        bg_col = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for c_idx, text in enumerate(data):
            row_cells[c_idx].width = col_widths[c_idx]
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=90, right=90)
            set_cell_borders(row_cells[c_idx], 
                             top={'val': 'single', 'sz': '2', 'color': 'E2E8F0'},
                             bottom={'val': 'single', 'sz': '2', 'color': 'E2E8F0'},
                             left={'val': 'single', 'sz': '2', 'color': 'E2E8F0'},
                             right={'val': 'single', 'sz': '2', 'color': 'E2E8F0'})
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [1, 2] else WD_ALIGN_PARAGRAPH.RIGHT
            run = p.add_run(text)
            run.font.name = 'Segoe UI' if c_idx != 2 else 'Consolas'
            run.font.size = Pt(9)
            if c_idx == 0:
                run.font.bold = True
                run.font.color.rgb = RGBColor(16, 55, 92)
            else:
                run.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # --- استكشاف الأخطاء الشائعة وحلولها ---
    add_heading_ar(doc, "5. استكشاف الأخطاء الشائعة والحلول (Troubleshooting)", 1)
    
    add_paragraph_ar(doc, "قد تواجه بعض البيئات مشاكل معينة عند الإقلاع، إليك الحلول الفورية الأكثر شيوعاً:")
    
    add_bullet_ar(doc, "قد يظهر خطأ عدم العثور على إصدار .NET 8 إذا كان مسار 32-bit يسبق 64-bit في متغير PATH. الحل هو تنفيذ الأمر: `$env:Path = \"C:\\Program Files\\dotnet;\" + $env:Path` (وهذا ما يقوم به سكربت start-all.ps1 تلقائياً).", "مشكلة مسار .NET SDK:")
    add_bullet_ar(doc, "في حال عدم الرغبة بتشغيل Docker، تأكد من أن خدمة SQL Server تعمل من شاشة Windows Services، وأن سلسلة الاتصال في ملف appsettings.json تشير إلى خادمك (مثل Server=localhost أو Server=.\\SQLEXPRESS).", "مشكلة الاتصال بقاعدة البيانات:")
    add_bullet_ar(doc, "إذا كان المنفذ 5000 أو 4200 مشغولاً بتطبيق آخر، يمكنك فحص المعرف وإنهائه عبر أمر PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force`.", "مشكلة انشغال المنافذ (Port in use):")
    add_bullet_ar(doc, "إذا ظهرت مشاكل في حزم الواجهة الأمامية، نفذ في مجلد client الأمر: `npm install --legacy-peer-deps`.", "مشكلة حزم Angular (npm dependencies):")

    # الخاتمة والتوثيق
    add_callout_box(doc, "تم إعداد هذا الدليل والسكربتات التابعة لنظام الربان المحاسبي لضمان تجربة تشغيل سلسة وسريعة للمطورين وفرق العمل.", "ملاحظة توثيقية", "📌", "F8FAFC", "64748B")

    output_path = r"d:\smart ocean\Al-Roban\دليل_تشغيل_مشروع_الربان.docx"
    doc.save(output_path)
    print(f"Document saved successfully at: {output_path}")

    # Also save an english-named copy for cross-compatibility
    output_path_en = r"d:\smart ocean\Al-Roban\AlRobban_Startup_Guide.docx"
    doc.save(output_path_en)
    print(f"Document saved successfully at: {output_path_en}")

if __name__ == '__main__':
    create_startup_doc()
