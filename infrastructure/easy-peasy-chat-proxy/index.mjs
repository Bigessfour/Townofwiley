const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  };
}

function safeParseJson(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim().replace(/^\uFEFF/, '');

  if (!trimmedValue) {
    return undefined;
  }

  try {
    return JSON.parse(trimmedValue);
  } catch {
    return undefined;
  }
}

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function extractResponseText(payload, rawText) {
  if (isRecord(payload)) {
    if (typeof payload.response === 'string' && payload.response.trim()) {
      return payload.response.trim();
    }

    if (typeof payload.text === 'string' && payload.text.trim()) {
      return payload.text.trim();
    }

    if (isRecord(payload.bot) && typeof payload.bot.text === 'string' && payload.bot.text.trim()) {
      return payload.bot.text.trim();
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }
  }

  return typeof rawText === 'string' ? rawText.trim() : '';
}

function extractSources(payload) {
  if (!isRecord(payload)) {
    return [];
  }

  if (Array.isArray(payload.sources)) {
    return payload.sources;
  }

  if (isRecord(payload.bot) && Array.isArray(payload.bot.sources)) {
    return payload.bot.sources;
  }

  return [];
}

function getHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((message) => {
      return (
        message &&
        (message.role === 'human' || message.role === 'ai') &&
        typeof message.text === 'string' &&
        message.text.trim()
      );
    })
    .slice(-12)
    .map((message) => {
      return {
        role: message.role,
        type: message.role,
        text: message.text.trim(),
      };
    });
}

export async function handler(event) {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.requestContext?.http?.method === 'GET') {
    return jsonResponse(200, {
      ok: true,
      provider: 'easyPeasy',
      mode: 'api-proxy',
    });
  }

  if (event.requestContext?.http?.method !== 'POST') {
    return jsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  const apiKey = process.env.EASYPEASY_API_KEY?.trim();
  const publicUrl = process.env.EASYPEASY_BOT_PUBLIC_URL?.trim();

  if (!apiKey || !publicUrl) {
    return jsonResponse(500, {
      error: 'Easy-Peasy proxy is missing required configuration.',
    });
  }

  let requestBody;

  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch {
    return jsonResponse(400, {
      error: 'Request body must be valid JSON.',
    });
  }

  const message = typeof requestBody.message === 'string' ? requestBody.message.trim() : '';

  if (!message) {
    return jsonResponse(400, {
      error: 'A non-empty message is required.',
    });
  }

  try {
    const upstreamResponse = await fetch(
      `https://bots.easy-peasy.ai/bot/${encodeURIComponent(publicUrl)}/api`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          message,
          history: getHistory(requestBody.history),
        }),
      },
    );

    const responseText = await upstreamResponse.text();
    const responsePayload = safeParseJson(responseText);

    if (!upstreamResponse.ok) {
      return jsonResponse(upstreamResponse.status, {
        error:
          isRecord(responsePayload) && typeof responsePayload.error === 'string'
            ? responsePayload.error
            : typeof responseText === 'string' && responseText.trim()
              ? responseText.trim().slice(0, 400)
              : 'Easy-Peasy returned an error.',
      });
    }

    const response = extractResponseText(responsePayload, responseText);

    if (!response) {
      return jsonResponse(502, {
        error: 'Easy-Peasy returned a malformed response.',
      });
    }

    return jsonResponse(200, {
      response,
      sources: extractSources(responsePayload),
    });
  } catch {
    return jsonResponse(502, {
      error: 'Unable to reach Easy-Peasy right now.',
    });
  }
}
