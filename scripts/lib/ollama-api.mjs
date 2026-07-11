import { sanitizeModelOutput } from './ollama-text.mjs';

const DEFAULT_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';

/**
 * @param {{
 *   model: string;
 *   prompt: string;
 *   system?: string;
 *   temperature?: number;
 *   numPredict?: number;
 *   numCtx?: number;
 * }} options
 * @returns {Promise<string>}
 */
export async function ollamaGenerate(options) {
  const {
    model,
    prompt,
    system,
    temperature = 0.2,
    numPredict = 2048,
    numCtx = Number(process.env.OLLAMA_NUM_CTX ?? 8192),
  } = options;

  const response = await fetch(`${DEFAULT_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system,
      stream: false,
      options: {
        temperature,
        num_predict: numPredict,
        num_ctx: numCtx,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama generate failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const payload = await response.json();
  const raw = typeof payload.response === 'string' ? payload.response : '';
  return sanitizeModelOutput(raw);
}
