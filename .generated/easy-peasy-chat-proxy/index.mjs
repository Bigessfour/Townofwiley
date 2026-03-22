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
    const responsePayload = responseText ? JSON.parse(responseText) : {};

    if (!upstreamResponse.ok) {
      return jsonResponse(upstreamResponse.status, {
        error:
          typeof responsePayload.error === 'string'
            ? responsePayload.error
            : 'Easy-Peasy returned an error.',
      });
    }

    return jsonResponse(200, {
      response:
        typeof responsePayload.response === 'string'
          ? responsePayload.response
          : typeof responsePayload.bot?.text === 'string'
            ? responsePayload.bot.text
            : typeof responsePayload.text === 'string'
              ? responsePayload.text
              : '',
      sources: Array.isArray(responsePayload.sources) ? responsePayload.sources : [],
    });
  } catch {
    return jsonResponse(502, {
      error: 'Unable to reach Easy-Peasy right now.',
    });
  }
}
