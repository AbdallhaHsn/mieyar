# Al-Roban Global Development Rules & Architectural Standards

## 1. Bilingual Single-Entry Auto-Translation Standard (معيار الإدخال الأحادي والترجمة التلقائية)
- **Mandate:** In all present and future modules, forms, modals, tables, and dialogs across the Al-Roban ERP system that require Arabic and English entity names (e.g. Items, Products, Business Partners, Customers, Vendors, Accounts, Cost Centers, Branches, Fixed Assets, Currencies, Fiscal Years, etc.), users **MUST NOT** be forced to type names twice.
- **Single-Entry Behavior:**
  1. **Primary Input:** Typing in the Arabic name field automatically translates and populates the English name in real-time.
  2. **Bi-Directional Support:** Typing in the English field can auto-populate the Arabic name if empty.
  3. **Non-destructive Overrides:** The user may manually adjust either field at any time; manual edits are respected and preserved.
  4. **Instant Re-translation Action:** Each English counterpart field or group should have a one-click re-translation trigger (e.g., clickable globe icon or `ترجمة فورية` badge) to recalculate the translation instantly.
  5. **Core Service:** Always use and inject `AccountingTranslatorService` (or `TranslationService`) located in `src/app/core/services/accounting-translator.service.ts`.
  6. **Zero-Latency Offline Guarantee:** The translator uses an extensive specialized local dictionary (accounting, commercial, inventory, retail, technology, hardware, contracting, and units) with phonetic Latin transliteration fallback so no raw Arabic characters ever leak into English fields and with 0ms network latency.

## 2. Compact & Scrollbar-Free UI Design
- All modals and dense data entry screens must have clean spacing, no unnecessary horizontal scrolling (`overflow-x: hidden`), and responsive layouts.
- Always use curated design tokens, icons (`PrimeIcons`), and clear visual hierarchy.

## 3. Mandatory SweetAlert2 Standard (معيار التنبيهات ورسائل التأكيد الاحترافية)
- **Mandate:** Native browser dialogs (`window.alert()`, `window.confirm()`, and `window.prompt()`) are **STRICTLY FORBIDDEN** across all components and services in the system.
- **Requirement:** Always import and use `Swal` (`sweetalert2`) for:
  1. **Success messages:** e.g., saving, updating, closing shifts, and posting records (`icon: 'success'`).
  2. **Confirmations & Deletions:** e.g., deleting branches/warehouses, posting vouchers, releasing guarantees (`icon: 'warning'` or `'question'`, `showCancelButton: true`).
  3. **Input Validation & Warnings:** e.g., missing required fields, cash drawer discrepancy warnings (`icon: 'warning'`).
  4. **Errors:** e.g., API failure descriptions (`icon: 'error'`).
- Always format titles, text, and action buttons cleanly in Arabic/English matching the active language context with professional colors (e.g. `#059669` for confirm success, `#dc2626` for delete, `#0284c7` for primary action, `#64748b` for cancel).
