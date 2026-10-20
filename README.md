# نظام الربان المحاسبي المتكامل (Al-Roban ERP & E-Invoicing)

منصة محاسبية متكاملة مبنية وفق معمارية **المونوليث المعياري (Modular Monolith)** لدعم الشركات والمؤسسات، مع التوافق التام مع متطلبات **هيئة الزكاة والضريبة والجمارك (ZATCA - المرحلة الثانية / الربط والتكامل)**.

---

## 🏗️ المعمارية الهندسية للنظام (Architecture Overview)

النظام مصمم كـ **Modular Monolith** يقسم النظام إلى وحدات عمل مستقلة داخلياً وقابلة للتحول إلى Microservices مستقبلاً عند الحاجة، مع مشاركة نواة موحدة (Shared Kernel):

```
Al-Roban/
├── AlRobban.sln                      # ملف الحل البرمجي لـ .NET 8
├── global.json                       # تحديد إصدار .NET 8 SDK
├── Directory.Build.props             # إعدادات البناء الموحدة للمشاريع
├── docker-compose.yml                # حاويات قواعد البيانات والطوابير والتخزين
├── scripts/
│   └── setup-env.ps1                 # سكربت فحص وتجهيز البيئة
├── src/
│   ├── Bootstrapper/
│   │   └── AlRobban.WebAPI/          # نقطة الدخول والمستضيف (Host, Serilog, OpenTelemetry, SignalR)
│   ├── Shared/
│   │   ├── AlRobban.Shared.Kernel/   # الكيانات الأساسية (Entity, AggregateRoot, Result, Auditing)
│   │   ├── AlRobban.Shared.Application/ # CQRS (MediatR, FluentValidation, Pipeline Behaviors)
│   │   └── AlRobban.Shared.Infrastructure/ # EF Core, Dapper, SESSION_CONTEXT, ZATCA Crypto
│   └── Modules/
│       ├── GeneralLedger/            # وحدة الحسابات العامة (شجرة الحسابات، قيود اليومية، ميزان المراجعة)
│       │   ├── Domain / Application / Infrastructure / Endpoints
│       ├── InvoicingAndZatca/        # وحدة الفوترة والربط مع زكاة (UBL 2.1 XML, QR, ECDSA secp256k1)
│       │   ├── Domain / Application / Infrastructure / Endpoints
│       ├── DocumentManagement/       # إدارة المستندات وقراءة الفواتير (OCR & AI)
│       │   ├── Application / Infrastructure
│       └── IdentityAndAccess/        # إدارة الهوية والمستخدمين والشركات والفروع
│           ├── Domain / Application / Infrastructure
├── tests/
│   ├── AlRobban.UnitTests/           # اختبارات الوحدة السريعة (xUnit)
│   ├── AlRobban.IntegrationTests/    # اختبارات التكامل الحقيقية (Testcontainers)
│   └── AlRobban.PerformanceBenchmarks/ # اختبارات الأداء العالي (BenchmarkDotNet)
└── client/                           # الواجهة الأمامية الحديثة (Angular Standalone + PrimeNG + AG Grid)
```

---

## 🛠️ حزمة الأدوات والتقنيات المجهزة (Tech Stack Configured)

### 1. الواجهة الخلفية وقواعد البيانات (Backend & Database)
* **ASP.NET Core (.NET 8 LTS)**: معمارية Modular Monolith عالية الأداء.
* **Entity Framework Core 8**: دعم الـ Interceptors للأرشفة والتتبع والـ Auditing والـ Multi-Tenancy.
* **Dapper**: الاستعلامات المحاسبية الثقيلة، ميزان المراجعة (Trial Balance)، ودفاتر الأستاذ لسرعة فائقة.
* **Microsoft SQL Server 2022**: ميزة **Ledger Tables** لعدم قابلية التلاعب بالقيود، و **SESSION_CONTEXT** لعزل بيانات الشركات المستأجرة (Multi-Tenancy).
* **PostgreSQL 16**: خيار بديل مفتوح المصدر مدعوم بالكامل ومجهز في Docker Compose.
* **Redis Cache**: التخزين المؤقت وحماية قاعدة البيانات عبر `Microsoft.Extensions.Caching.StackExchangeRedis`.

### 2. الواجهة الأمامية وتجربة المستخدم (Frontend & UI)
* **Angular 19 Standalone Architecture**: بدون NgModule، تحميل سريع وأداء فائق.
* **PrimeNG 19 & @primeuix/themes (Aura)**: لشجرة الحسابات، النوافذ التفاعلية، والتصميم الراقي.
* **Angular Material & CDK**: للتكامل ومرونة التفاعل.
* **AG Grid (v33 Community & Angular)**: إدخال القيود المحاسبية وجداول ميزان المراجعة الضخمة بسرعة إكسل وبدون بطء.
* **SignalR Client (`@microsoft/signalr`)**: استلام إشعارات اعتماد الفواتير والترحيل اللحظي.

### 3. التشفير، ZATCA، وإدارة المستندات (Security, Crypto & Invoicing)
* **BouncyCastle (.NET)**: حساب الـ Hashing عبر **SHA-256**، والتوقيع الرقمي **ECDSA secp256k1** المتوافق مع متطلبات هيئة الزكاة والضريبة والجمارك (المرحلة الثانية).
* **توليد كود الاستجابة السريعة (ZATCA TLV Base64 QR Code)**: للمطابقة مع بوابتي الفاتورة الضريبية والمبسطة.
* **QuestPDF**: محرك توليد فواتير **PDF/A-3** مع تضمين ملف XML للفاتورة.
* **OpenIddict & JWT**: عزل وتأمين الوصول للشركات والفروع.

### 4. الطوابير، الأحداث والمراقبة (Queues, Events & Observability)
* **Hangfire**: للمهام المجدولة وإرسال فواتير B2C في الخلفية.
* **MassTransit + RabbitMQ**: معالجة أحداث الترحيل المالي اللحظي.
* **SignalR**: قناة الاتصال اللحظية `NotificationHub` على المسار `/hubs/notifications`.
* **Serilog & OpenTelemetry**: تسجيل العمليات وتتبع الأداء ومراقبة السجلات عبر Traces & Metrics.
* **xUnit & Testcontainers**: اختبارات الوحدة واختبارات التكامل مع تشغيل قواعد البيانات الحقيقية في Docker.
* **BenchmarkDotNet**: قياس أداء محركات الترقيم والتشفير.

---

## 🚀 تشغيل بيئة العمل محلياً (Quick Start)

### 1. تشغيل الخدمات التابعة (Docker Compose)
لتشغيل SQL Server, PostgreSQL, Redis, RabbitMQ, و Jaeger:
```powershell
docker compose up -d
```

### 2. تشغيل الواجهة الخلفية (Backend API)
```powershell
$env:Path = "C:\Program Files\dotnet;$env:Path"
dotnet run --project src/Bootstrapper/AlRobban.WebAPI
```
* **رابط توثيق Swagger**: `http://localhost:5000/swagger` أو `https://localhost:5001/swagger`
* **فحص حالة النظام**: `GET /api/system/status`
* **مركز إشعارات SignalR**: `/hubs/notifications`

### 3. تشغيل الواجهة الأمامية (Angular Client)
```powershell
cd client
npm start
```
* التطبيق سيعمل على: `http://localhost:4200`
