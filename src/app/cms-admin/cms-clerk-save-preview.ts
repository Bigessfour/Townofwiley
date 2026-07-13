import type { ClerkFormFieldDefinition } from './cms-clerk-task-form-fields';

export interface ClerkSavePreviewLine {
  label: string;
  value: string;
  changed: boolean;
}

function formatPreviewValue(
  field: ClerkFormFieldDefinition,
  raw: string | boolean | undefined,
): string | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (field.type === 'checkbox') {
    return raw === true ? 'Yes — show on website' : 'No — hidden from website';
  }
  if (typeof raw === 'boolean') {
    return raw ? 'Yes' : 'No';
  }
  const text = String(raw).trim();
  if (!text) {
    return null;
  }
  if (field.type === 'select' && field.options?.length) {
    const match = field.options.find((option) => option.value === text);
    if (match?.label) {
      return match.label;
    }
  }
  if (field.type === 'textarea' && text.length > 160) {
    return `${text.slice(0, 157)}…`;
  }
  return text;
}

export function buildClerkSavePreviewLines(
  fields: readonly ClerkFormFieldDefinition[],
  current: Readonly<Record<string, string | boolean>>,
  baseline: Readonly<Record<string, string | boolean>> | null,
  editing: boolean,
): ClerkSavePreviewLine[] {
  const lines: ClerkSavePreviewLine[] = [];

  for (const field of fields) {
    const value = formatPreviewValue(field, current[field.name]);
    if (!value) {
      continue;
    }
    const baseRaw = baseline?.[field.name];
    const changed =
      !editing || baseline == null
        ? true
        : formatPreviewValue(field, baseRaw) !== formatPreviewValue(field, current[field.name]);
    if (editing && baseline != null && !changed) {
      continue;
    }
    lines.push({
      label: field.label,
      value,
      changed,
    });
  }

  return lines;
}