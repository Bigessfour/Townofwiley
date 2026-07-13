import type { ClerkFormFieldDefinition } from './cms-clerk-task-form-fields';

export interface ClerkFormFieldGroupSection {
  type: 'group';
  title: string;
  fields: ClerkFormFieldDefinition[];
}

export interface ClerkFormOptionalSection {
  type: 'optional';
  fields: ClerkFormFieldDefinition[];
}

export type ClerkFormSection = ClerkFormFieldGroupSection | ClerkFormOptionalSection;

export function clerkFormSections(fields: readonly ClerkFormFieldDefinition[]): ClerkFormSection[] {
  const sections: ClerkFormSection[] = [];
  let currentTitle: string | null = null;
  let bucket: ClerkFormFieldDefinition[] = [];
  const optional: ClerkFormFieldDefinition[] = [];

  const flush = (): void => {
    if (bucket.length > 0 && currentTitle) {
      sections.push({ type: 'group', title: currentTitle, fields: [...bucket] });
      bucket = [];
    }
  };

  for (const field of fields) {
    if (field.optional) {
      optional.push(field);
      continue;
    }
    const title = field.group?.trim() || 'Details';
    if (title !== currentTitle) {
      flush();
      currentTitle = title;
    }
    bucket.push(field);
  }
  flush();

  if (optional.length > 0) {
    sections.push({ type: 'optional', fields: optional });
  }

  return sections;
}

export function clerkFormSectionTrack(section: ClerkFormSection): string {
  if (section.type === 'optional') {
    return 'optional';
  }
  return `group:${section.title}`;
}