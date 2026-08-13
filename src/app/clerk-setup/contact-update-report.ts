import type { ContactUpdateRecord } from './contact-update-review.service';

export interface ContactUpdateReportLabels {
  title: string;
  generatedLabel: string;
  recordCountLabel: string;
  fields: {
    date: string;
    fullName: string;
    serviceAddress: string;
    poBox: string;
    accountNumber: string;
    phone: string;
    email: string;
    preferredContact: string;
    consent: string;
    notes: string;
    source: string;
    language: string;
  };
}

const EMPTY = '—';

function display(value: string | boolean | undefined): string {
  if (value === true) {
    return 'Yes';
  }
  if (value === false) {
    return 'No';
  }
  const text = (value ?? '').trim();
  return text || EMPTY;
}

function formatDate(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp || EMPTY;
  }
}

export function buildContactUpdatePrintDocument(
  updates: ContactUpdateRecord[],
  labels: ContactUpdateReportLabels,
): string {
  const generatedAt = new Date().toLocaleString();
  const rows = updates
    .map((update, index) => {
      const fieldRows = [
        [labels.fields.date, formatDate(update.timestamp)],
        [labels.fields.fullName, display(update.fullName)],
        [labels.fields.serviceAddress, display(update.serviceAddress)],
        [labels.fields.poBox, display(update.poBox)],
        [labels.fields.accountNumber, display(update.accountNumber)],
        [labels.fields.phone, display(update.phone)],
        [labels.fields.email, display(update.email)],
        [labels.fields.preferredContact, display(update.preferredContactMethod)],
        [labels.fields.consent, display(update.consentToContact)],
        [labels.fields.notes, display(update.notes)],
        [labels.fields.source, display(update.source)],
        [labels.fields.language, display(update.locale)],
      ]
        .map(
          ([label, value]) =>
            `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
        )
        .join('');

      return `
        <section class="record">
          <h2>Submission ${index + 1}</h2>
          <table>
            <tbody>${fieldRows}</tbody>
          </table>
        </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(labels.title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #0f172a; }
      h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
      .meta { margin: 0 0 1.25rem; color: #475569; font-size: 0.95rem; }
      .record { break-inside: avoid; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #cbd5e1; }
      .record h2 { font-size: 1rem; margin: 0 0 0.5rem; }
      table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
      th { text-align: left; width: 34%; padding: 0.25rem 0.5rem 0.25rem 0; vertical-align: top; font-weight: 600; }
      td { padding: 0.25rem 0; vertical-align: top; }
      @media print {
        body { margin: 0.75in; }
        .record { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(labels.title)}</h1>
    <p class="meta">${escapeHtml(labels.generatedLabel)}: ${escapeHtml(generatedAt)}<br />
    ${escapeHtml(labels.recordCountLabel)}: ${updates.length}</p>
    ${rows || `<p>${escapeHtml(EMPTY)}</p>`}
  </body>
</html>`;
}

export function printContactUpdateReport(
  updates: ContactUpdateRecord[],
  labels: ContactUpdateReportLabels,
): void {
  if (typeof window === 'undefined' || !updates.length) {
    return;
  }

  const html = buildContactUpdatePrintDocument(updates, labels);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) {
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.addEventListener('load', () => {
    printWindow.print();
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
