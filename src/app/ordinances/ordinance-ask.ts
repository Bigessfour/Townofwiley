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
  const label = citation.authority === 'ordinance-2024-2' ? 'Ordinance 2024-2' : 'Wiley Municipal Code';
  return citation.section ? `${label}, Section ${citation.section}` : label;
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
