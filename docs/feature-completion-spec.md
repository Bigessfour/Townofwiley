# Feature Completion Specifications

This document details the specifications for completing the incomplete features in the Town of Wiley website: Payments, Docs Hub, and Permits/Business Directory. These specs ensure full resident flows, bilingual support (English/Spanish), accessibility (WCAG AA), and integration with existing Angular architecture (standalone components, signals, OnPush).

## Payments Module

### Overview
Integrate Paystar API for utility bill payments, including form submission, error handling, and receipt generation. Ensure secure proxy usage to avoid exposing API keys.

### Requirements
- **User Flow**: Resident selects bill type → Enters payment details (card, amount) → Submits → Receives confirmation/receipt (bilingual).
- **API Integration**:
  - Use existing proxy in `src/app/payments/paystar-proxy.ts` to call Paystar API.
  - Endpoints: `/charge` for payment, `/receipt` for confirmation.
  - Handle responses: Success (201), Invalid card (400), Server error (500).
- **State Management**: Use signals for form state, loading, error messages (bilingual).
- **Validation**: Client-side (e.g., card number Luhn check), server-side via API.
- **Security**: No client-side API keys; all via proxy. Sanitize inputs.
- **Accessibility**: ARIA labels for form fields, error announcements.
- **Bilingual**: Dynamic labels/translations using i18n pipes or services.
- **Edge Cases**: Offline mode (queue payment), network errors, partial payments.

### Technical Specs
- Component: `src/app/payments/payment-form.component.ts` (standalone, OnPush).
- Service: `src/app/payments/paystar-connection.service.ts` (inject HttpClient for proxy calls).
- Template: Native control flow (@if loading, @for errors).
- Tests: Unit (service mocks), E2E (full flow with mocks).

## Docs Hub

### Overview
Dynamic document upload and categorization hub using AppSync for backend storage and querying.

### Requirements
- **User Flow**: Browse categories → Upload file (with metadata) → Categorize (records/meetings/finance) → View/search docs (bilingual labels).
- **AppSync Integration**:
  - Mutations: `createDocument` (file, category, lang).
  - Queries: `listDocuments` (filter by category, search text).
  - Schema updates if needed in `schema.graphql`.
- **Upload Handling**: File size <10MB, types: PDF, DOC, IMG. Use FormData for multipart.
- **Categorization**: Dropdown with bilingual options; dynamic based on user role if extended.
- **Search/Filter**: Reactive forms for search, signals for results.
- **Security**: Auth via Cognito; validate uploads server-side.
- **Accessibility**: File input labels, progress indicators.
- **Bilingual**: Category labels, upload prompts in current lang.

### Technical Specs
- Component: `src/app/document-hub/document-hub.component.ts` (standalone).
- Upload Component: `src/app/document-upload/document-upload.component.ts`.
- Service: `src/app/document-hub/docs.service.ts` (Apollo Client for AppSync).
- Template: @for documents, semantic lists.
- Tests: Unit (upload logic), E2E (upload and search).

## Permits/Business Directory

### Overview
Scaffold pages for permit requests and business directory with search/filter.

### Requirements
- **Permits Flow**: Static info page directing to town clerk contact (email/phone from CMS). No form/submission yet.
- **Business Directory**: List businesses → Search by name/type/location → Filter (category, rating).
- **Integration**: Use existing CMS for storage/retrieval; links tie to resident services.
- **Search**: Simple text search (debounced), filters as signals.
- **Security**: No submissions, so low risk; validate search inputs.
- **Accessibility**: Semantic links, keyboard nav for list.
- **Bilingual**: All text, placeholders.

### Technical Specs
- Permits: `src/app/permits/permits.component.ts` (form + submit service).
- Directory: `src/app/business-directory/business-directory.component.ts` (list + search).
- Shared: Link from `src/app/resident-services/resident-services.component.ts`.
- Template: Native flow, [class] for styles.
- Tests: E2E for form submit/validation.

## Offline Resilience
- Cache form state in localStorage/IndexedDB using signals.
- Queue actions (e.g., uploads, payments) for sync on reconnect.
- User notifications via bilingual toasts for offline status.
- Integrate Angular Service Worker for PWA caching if not present.

## Security Enhancements
- Proxies: Validate origins (CORS), use helmet for headers, log without sensitive data.
- AppSync: IAM policies for mutations (e.g., authenticated + category access); whitelist file types/content.
- Uploads: Server-side validation (virus scan, metadata checks); no executables.
- Payments: PCI notes—tokenize via Paystar; audit logs for transactions.
- General: Rate limiting on submissions; input sanitization everywhere.

## Performance Targets
- AppSync: Batched queries/resolvers; limits (e.g., first: 20); Apollo caching.
- UI: Debounce searches (300ms); client-side compression for uploads; CDK Virtual Scroll for lists.
- Metrics: <2s Time to Interactive; bundle analysis via Angular tools; mobile optimization (e.g., responsive images).

## General Notes
- Performance: Lazy load modules, limit queries (pagination for lists).
- Error Handling: Global handler for API failures.
- Deployment: Test on Amplify staging.
- Metrics: Ensure <3s load times, 100% test pass.