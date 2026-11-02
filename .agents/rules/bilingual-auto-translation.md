# Bilingual Single-Entry Auto-Translation Rule (قاعدة الترجمة التلقائية والإدخال الأحادي)

Whenever implementing, extending, or maintaining screens, dialogs, forms, or data entry flows with dual-language fields (Arabic and English) in Al-Roban:

1. **Single Entry First:**
   - The user inputs the name once (typically in Arabic).
   - The English counterpart is automatically translated and populated in real time using `AccountingTranslatorService`.

2. **Bi-Directional Capability:**
   - If user inputs the English name first, translate and populate Arabic automatically.

3. **Re-translation & Manual Tweaking:**
   - Always allow manual edits without locking the input.
   - Provide an instant re-translation button or clickable globe icon `pi-globe` / `pi-sync` so users can re-sync whenever needed.

4. **Service Reference:**
   - Path: `client/src/app/core/services/accounting-translator.service.ts`
   - Class: `AccountingTranslatorService` (or alias `TranslationService`).
