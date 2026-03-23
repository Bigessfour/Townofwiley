import { expect, test } from '../../fixtures/town.fixture';

interface ChatRequestPayload {
  message?: string;
  history?: Array<{
    role?: string;
    text?: string;
  }>;
}

test.describe('homepage chat', () => {
  test('renders programmatic chatbot replies in the conversation panel', async ({ homePage }) => {
    await homePage.enableProgrammaticChat();

    const requestBodies: ChatRequestPayload[] = [];
    let releaseFirstResponse = () => {};
    const firstResponseGate = new Promise<void>((resolve) => {
      releaseFirstResponse = resolve;
    });

    await homePage.page.route('**/mock-chatbot', async (route) => {
      const body = route.request().postDataJSON() as ChatRequestPayload;
      requestBodies.push(body);
      const message = body.message?.trim() ?? '';

      const responseByMessage: Record<
        string,
        { response: string; sources?: Array<{ title: string; url: string }> }
      > = {
        'When is the next City Council meeting?': {
          response:
            'The City Council Regular Meeting is held every 2nd Monday of the month at 6:00 PM at Wiley Town Hall.',
          sources: [{ title: 'Calendar', url: '#calendar' }],
        },
        'How do I contact Town Hall?': {
          response:
            'Call Town Hall at (719) 829-4974 or use the contact section on the homepage for clerk and records help.',
          sources: [{ title: 'Town contacts', url: '#contact' }],
        },
      };

      const payload = responseByMessage[message] ?? {
        response: 'Ask about meetings, services, records, or contacts.',
      };

      if (message === 'When is the next City Council meeting?') {
        await firstResponseGate;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          body: JSON.stringify(payload),
        }),
      });
    });

    await homePage.goto();

    await expect(homePage.assistantShell).toBeVisible();
    await expect(homePage.assistantStatus).toContainText('Programmatic chat is online.');

    await homePage.sendAssistantQuestion('When is the next City Council meeting?');
    await expect(homePage.assistantSendButton).toBeDisabled();
    await expect(homePage.assistantThreadStatus).toContainText('Waiting for Wiley...');

    releaseFirstResponse();

    const meetingReply = homePage.assistantMessages.filter({
      hasText: 'The City Council Regular Meeting is held every 2nd Monday',
    });

    await expect(
      homePage.assistantMessages.filter({ hasText: 'When is the next City Council meeting?' }),
    ).toHaveCount(1);
    await expect(meetingReply).toHaveCount(1);
    await expect(
      meetingReply.locator('.assistant-links a').filter({ hasText: 'Calendar' }),
    ).toHaveCount(1);
    expect(requestBodies[0]).toEqual({
      message: 'When is the next City Council meeting?',
      history: [],
    });
    await expect(homePage.assistantSendButton).toBeEnabled();
    await expect(homePage.assistantThreadStatus).toContainText('Responses appear here');

    await homePage.chooseAssistantPrompt('How do I contact Town Hall?');

    const contactReply = homePage.assistantMessages.filter({
      hasText: 'Call Town Hall at (719) 829-4974',
    });

    await expect(
      homePage.assistantMessages.filter({ hasText: 'How do I contact Town Hall?' }),
    ).toHaveCount(1);
    await expect(contactReply).toHaveCount(1);
    await expect(
      contactReply.locator('.assistant-links a').filter({ hasText: 'Town contacts' }),
    ).toHaveCount(1);
    expect(requestBodies[1]).toEqual({
      message: 'How do I contact Town Hall?',
      history: [
        {
          role: 'human',
          text: 'When is the next City Council meeting?',
        },
        {
          role: 'ai',
          text: 'The City Council Regular Meeting is held every 2nd Monday of the month at 6:00 PM at Wiley Town Hall.',
        },
      ],
    });
  });

  test('shows the fallback message when the chatbot returns malformed data', async ({
    homePage,
  }) => {
    await homePage.enableProgrammaticChat();

    const requestBodies: ChatRequestPayload[] = [];

    await homePage.page.route('**/mock-chatbot', async (route) => {
      requestBodies.push(route.request().postDataJSON() as ChatRequestPayload);

      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: '<html>malformed chatbot payload</html>',
      });
    });

    await homePage.goto();

    await homePage.sendAssistantQuestion('Who is the mayor?');

    await expect(
      homePage.assistantMessages.filter({ hasText: 'The assistant is temporarily unavailable.' }),
    ).toHaveCount(1);
    await expect(homePage.assistantLinks.filter({ hasText: 'Contact Town Hall' })).toHaveCount(1);
    await expect(homePage.assistantInput).toBeEnabled();
    expect(requestBodies).toEqual([
      {
        message: 'Who is the mayor?',
        history: [],
      },
    ]);
  });
});
