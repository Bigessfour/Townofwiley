import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getChatbotRuntimeConfig } from '../chatbot-config';

interface AssistantLink {
  label: string;
  href: string;
}

interface AssistantEntry {
  title: string;
  summary: string;
  keywords: string[];
  links: AssistantLink[];
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
  sources?: Array<{
    title?: string;
    url?: string;
    href?: string;
  }>;
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
        'Programmatic chat is not connected yet. Set EASYPEASY_API_ENDPOINT in deployment config after the proxy is deployed.',
        [{ label: 'Contact Town Hall', href: '#contact' }],
        true,
      );
      return;
    }

    this.isSending.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<BotChatResponse>(this.chatbotConfig.apiEndpoint, {
          message: question,
          history,
        }),
      );

      this.appendAssistantMessage(
        response.response?.trim() ||
          'The assistant did not return any text. Please try rephrasing your question.',
        this.mapSourceLinks(response.sources),
      );
    } catch {
      this.appendAssistantMessage(
        'The assistant is temporarily unavailable. Please try again in a moment or contact Town Hall directly.',
        [{ label: 'Town contacts', href: '#contact' }],
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
          { label: 'Calendar', href: '#calendar' },
          { label: 'Contact', href: '#contact' },
          { label: 'Records', href: '#records' },
        ],
        omitFromHistory: true,
      };
    }

    return {
      role: 'assistant',
      content:
        'Programmatic chat is currently offline in this environment. Deploy the Easy-Peasy proxy and set EASYPEASY_API_ENDPOINT to turn it on.',
      links: [{ label: 'Contact Town Hall', href: '#contact' }],
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
