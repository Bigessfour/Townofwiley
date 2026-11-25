import { OrdinanceRuntimeConfig } from './ordinance-runtime-config';
import { OrdinanceQuestionScope } from './ordinance-question-scope';

export interface OrdinanceCitation {
  section: string;
  authority: string;
  score?: number;
}

export interface OrdinanceAnswer {
  answer: string;
  citations: OrdinanceCitation[];
  matched: boolean;
}

export type OrdinanceReplyPlan = 'ignore' | 'decline' | 'pending' | 'ask';

export function planOrdinanceReply(
  scope: OrdinanceQuestionScope,
  endpoint: string,
): OrdinanceReplyPlan {
  if (scope === 'empty') {
    return 'ignore';
  }
  if (scope === 'out-of-scope') {
    return 'decline';
  }
  return endpoint.trim() ? 'ask' : 'pending';
}

export function formatOrdinanceCitation(citation: OrdinanceCitation): string {
  const authority = citation.authority.trim();
  const section = citation.section.trim();
  if (authority === 'code') {
    return section ? `Wiley Municipal Code, Section ${section}` : 'Wiley Municipal Code';
  }
  if (authority === 'code-index') {
    return section ? `Wiley Municipal Code index, ${section}` : 'Wiley Municipal Code index';
  }
  if (authority === 'code-disposition') {
    return 'Wiley Municipal Code disposition table';
  }
  const numbered = /^(ordinance|resolution)-(\d{4}-\d+[a-z]?)(?:-(.+))?$/i.exec(authority);
  if (numbered) {
    const kind = numbered[1].toLowerCase() === 'resolution' ? 'Resolution' : 'Ordinance';
    const number = numbered[2];
    const suffix = numbered[3]?.replace(/-/g, ' ');
    const base = suffix ? `${kind} ${number} (${suffix})` : `${kind} ${number}`;
    if (!section || section === number) {
      return base;
    }
    if (/^\d/.test(section)) {
      return `${base}, Section ${section}`;
    }
    return base;
  }
  if (authority.startsWith('ordinance-') || authority.startsWith('resolution-')) {
    return section || authority;
  }
  return section ? `${authority}, Section ${section}` : authority;
}

export async function askOrdinanceQuestion(
  config: OrdinanceRuntimeConfig,
  question: string,
): Promise<OrdinanceAnswer> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }
  const response = await fetch(config.apiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    throw new Error(`Ordinance assistant returned ${response.status}`);
  }
  const payload = (await response.json()) as Partial<OrdinanceAnswer>;
  const citations = Array.isArray(payload.citations) ? payload.citations : [];
  return {
    answer: typeof payload.answer === 'string' ? payload.answer : '',
    matched: payload.matched === true,
    citations: citations.filter(
      (citation): citation is OrdinanceCitation =>
        !!citation && typeof citation.section === 'string' && typeof citation.authority === 'string',
    ),
  };
}
