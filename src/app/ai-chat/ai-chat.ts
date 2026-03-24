import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getChatbotRuntimeConfig } from '../chatbot-config';

interface AssistantLink {
  label: string;
  href: string;
}

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  links?: AssistantLink[];
  omitFromHistory?: boolean;
}

interface BotHistoryMessage {
  role: 'human' | 'ai';
  text: string;
}

interface BotChatResponse {
  response: string;
  error?: string;
  sources?: {
    title?: string;
    url?: string;
    href?: string;
  }[];
}

@Component({
  selector: 'app-ai-chat',
  imports: [],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.scss',
})
export class AiChat {
  private readonly http = inject(HttpClient);
  private readonly chatbotConfig = getChatbotRuntimeConfig();
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly isSending = signal(false);
  protected readonly draft = signal('');
  protected readonly starterPrompts = [
    'When is the next City Council meeting?',
    'How do I contact Town Hall?',
    'Who is the mayor?',
    'Where do I find records and agendas?',
  ];
  protected readonly isConfigured =
    this.chatbotConfig.mode === 'api' && Boolean(this.chatbotConfig.apiEndpoint);

  protected readonly messages = signal<ChatMessage[]>([this.createWelcomeMessage()]);

  protected updateDraft(value: string): void {
    this.draft.set(value);
  }

  protected askPrompt(prompt: string): void {
    this.draft.set(prompt);
    void this.sendMessage();
  }

  protected async sendMessage(): Promise<void> {
    const question = this.draft().trim();

    if (!question || this.isSending()) {
      return;
    }

    const history = this.buildHistory();

    this.messages.update((messages) => {
      return [
        ...messages,
        {
          role: 'user',
          content: question,
        },
      ];
    });
    this.scrollMessagesToLatest();

    this.draft.set('');

    if (!this.isConfigured) {
      this.appendAssistantMessage(
        'Ask Wiley is temporarily unavailable right now. Please try again later or contact Town Hall directly.',
        [{ label: 'Contact Town Hall', href: '/contact' }],
        true,
      );
      return;
    }

    this.isSending.set(true);

    try {
      const rawResponse = await firstValueFrom(
        this.http.post(
          this.chatbotConfig.apiEndpoint,
          {
            message: question,
            history,
          },
          { responseType: 'text' },
        ),
      );
      const response = this.parseBotResponse(rawResponse);

      if (response.error && !response.response) {
        throw new Error(response.error);
      }

      this.appendAssistantMessage(
        response.response?.trim() ||
          'The assistant did not return any text. Please try rephrasing your question.',
        this.mapSourceLinks(response.sources),
      );
    } catch {
      this.appendAssistantMessage(
        'The assistant is temporarily unavailable. Please try again in a moment or contact Town Hall directly.',
        [{ label: 'Town contacts', href: '/contact' }],
        true,
      );
    } finally {
      this.isSending.set(false);
    }
  }

  private createWelcomeMessage(): ChatMessage {
    if (this.isConfigured) {
      return {
        role: 'assistant',
        content:
          'Ask about meetings, officials, records, services, or contacts. This assistant now talks to the Town of Wiley Easy-Peasy bot through a secure server-side proxy, so the API key does not live in the browser.',
        links: [
          { label: 'Calendar', href: '/meetings' },
          { label: 'Contact', href: '/contact' },
          { label: 'Records', href: '/records' },
        ],
        omitFromHistory: true,
      };
    }

    return {
      role: 'assistant',
      content:
        'Ask Wiley is temporarily unavailable. Please use the Town Hall contact links if you need help right away.',
      links: [{ label: 'Contact Town Hall', href: '/contact' }],
      omitFromHistory: true,
    };
  }

  private appendAssistantMessage(
    content: string,
    links?: AssistantLink[],
    omitFromHistory = false,
  ): void {
    this.messages.update((messages) => {
      return [
        ...messages,
        {
          role: 'assistant',
          content,
          links,
          omitFromHistory,
        },
      ];
    });
    this.scrollMessagesToLatest();
  }

  private buildHistory(): BotHistoryMessage[] {
    return this.messages()
      .filter((message) => !message.omitFromHistory)
      .map<BotHistoryMessage>((message) => {
        return {
          role: message.role === 'user' ? 'human' : 'ai',
          text: message.content,
        };
      })
      .slice(-12);
  }

  private mapSourceLinks(sources?: BotChatResponse['sources']): AssistantLink[] | undefined {
    if (!sources?.length) {
      return undefined;
    }

    const links = new Map<string, AssistantLink>();

    for (const source of sources) {
      const href = source.url ?? source.href;

      if (!href) {
        continue;
      }

      links.set(href, {
        label: source.title?.trim() || 'Source',
        href,
      });
    }

    return [...links.values()].slice(0, 3);
  }

  private parseBotResponse(rawResponse: string): BotChatResponse {
    const payload = this.parseJsonRecord(rawResponse);

    if (!payload && rawResponse.trim()) {
      return {
        response: '',
        error: 'Malformed chatbot response.',
      };
    }

    const unwrappedPayload = this.unwrapProxyPayload(payload);
    const response = this.extractText(unwrappedPayload);
    const rawError = unwrappedPayload['error'];
    const error =
      typeof rawError === 'string'
        ? rawError.trim()
        : !response && rawResponse.trim()
          ? 'Malformed chatbot response.'
          : undefined;

    return {
      response,
      error,
      sources: this.extractSources(unwrappedPayload),
    };
  }

  private parseJsonRecord(value: string): Record<string, unknown> | undefined {
    const trimmedValue = value.trim().replace(/^\uFEFF/, '');

    if (!trimmedValue) {
      return undefined;
    }

    try {
      const parsedValue: unknown = JSON.parse(trimmedValue);

      return this.isRecord(parsedValue) ? parsedValue : undefined;
    } catch {
      return undefined;
    }
  }

  private unwrapProxyPayload(payload?: Record<string, unknown>): Record<string, unknown> {
    if (!payload) {
      return {};
    }

    const wrappedBody = payload['body'];

    if (typeof wrappedBody !== 'string') {
      return payload;
    }

    const parsedBody = this.parseJsonRecord(wrappedBody);

    return parsedBody ?? payload;
  }

  private extractText(payload: Record<string, unknown>): string {
    const directResponse = payload['response'];

    if (typeof directResponse === 'string') {
      return directResponse.trim();
    }

    const text = payload['text'];

    if (typeof text === 'string') {
      return text.trim();
    }

    const bot = payload['bot'];

    if (this.isRecord(bot) && typeof bot['text'] === 'string') {
      return bot['text'].trim();
    }

    return '';
  }

  private extractSources(payload: Record<string, unknown>): BotChatResponse['sources'] | undefined {
    const sources = payload['sources'];

    return Array.isArray(sources) ? (sources as BotChatResponse['sources']) : undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private scrollMessagesToLatest(): void {
    queueMicrotask(() => {
      const container = this.messagesContainer()?.nativeElement;

      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
    });
  }
}
