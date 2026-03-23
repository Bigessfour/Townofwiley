import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { getChatbotRuntimeConfig } from '../chatbot-config';
import { SiteLanguage, SiteLanguageService } from '../site-language';

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

interface AiChatCopy {
  kicker: string;
  title: string;
  intro: string;
  onlineStatus: string;
  offlineStatus: string;
  questionLabel: string;
  helper: string;
  placeholder: string;
  send: string;
  sending: string;
  promptsLabel: string;
  promptsAriaLabel: string;
  conversationKicker: string;
  conversationTitle: string;
  conversationWaiting: string;
  conversationReady: string;
  userRole: string;
  assistantRole: string;
  starterPrompts: string[];
  configuredWelcome: string;
  offlineWelcome: string;
  missingProgrammaticMessage: string;
  retryMessage: string;
  malformedMessage: string;
  emptyResponseMessage: string;
  townContactLink: string;
  openDirectChatLink: string;
  sourceLabel: string;
  calendarLink: string;
  contactLink: string;
  recordsLink: string;
}

const AI_CHAT_COPY: Record<SiteLanguage, AiChatCopy> = {
  en: {
    kicker: 'Scoped Site Assistant',
    title: 'Ask Wiley',
    intro:
      'This assistant uses the Town of Wiley Easy-Peasy bot through a secure proxy, so the API key stays off the public site.',
    onlineStatus: 'Programmatic chat is online.',
    offlineStatus: 'Programmatic chat is offline in this environment.',
    questionLabel: 'Type a question for Ask Wiley',
    helper:
      'Enter a question below or tap one of the example prompts. The reply appears directly underneath in the conversation panel.',
    placeholder: 'Ask a Town of Wiley question',
    send: 'Send',
    sending: 'Sending...',
    promptsLabel: 'Try one of these questions',
    promptsAriaLabel: 'Suggested questions',
    conversationKicker: 'Conversation',
    conversationTitle: 'Latest response',
    conversationWaiting: 'Waiting for Wiley...',
    conversationReady: 'Responses appear here',
    userRole: 'You',
    assistantRole: 'Wiley assistant',
    starterPrompts: [
      'When is the next City Council meeting?',
      'How do I contact Town Hall?',
      'Who is the mayor?',
      'Where do I find records and agendas?',
    ],
    configuredWelcome:
      'Ask about meetings, officials, records, services, or contacts. This assistant now talks to the Town of Wiley Easy-Peasy bot through a secure server-side proxy, so the API key does not live in the browser.',
    offlineWelcome:
      'Programmatic chat is currently offline in this environment. Deploy the Easy-Peasy proxy and set EASYPEASY_API_ENDPOINT to turn it on.',
    missingProgrammaticMessage:
      'Programmatic chat is not connected yet. Set EASYPEASY_API_ENDPOINT in deployment config after the proxy is deployed.',
    retryMessage:
      'The assistant is temporarily unavailable. Please try again in a moment or contact Town Hall directly.',
    malformedMessage: 'Malformed chatbot response.',
    emptyResponseMessage:
      'The assistant did not return any text. Please try rephrasing your question.',
    townContactLink: 'Contact Town Hall',
    openDirectChatLink: 'Open the assistant directly',
    sourceLabel: 'Source',
    calendarLink: 'Calendar',
    contactLink: 'Contact',
    recordsLink: 'Records',
  },
  es: {
    kicker: 'Asistente del sitio',
    title: 'Pregunta a Wiley',
    intro:
      'Este asistente usa el bot Easy-Peasy del Pueblo de Wiley mediante un proxy seguro, por lo que la clave de API no vive en el sitio publico.',
    onlineStatus: 'El chat programatico esta en linea.',
    offlineStatus: 'El chat programatico esta fuera de linea en este entorno.',
    questionLabel: 'Escriba una pregunta para Pregunta a Wiley',
    helper:
      'Escriba una pregunta abajo o toque uno de los ejemplos. La respuesta aparece directamente debajo en el panel de conversacion.',
    placeholder: 'Haga una pregunta sobre el Pueblo de Wiley',
    send: 'Enviar',
    sending: 'Enviando...',
    promptsLabel: 'Pruebe una de estas preguntas',
    promptsAriaLabel: 'Preguntas sugeridas',
    conversationKicker: 'Conversacion',
    conversationTitle: 'Respuesta mas reciente',
    conversationWaiting: 'Esperando a Wiley...',
    conversationReady: 'Las respuestas aparecen aqui',
    userRole: 'Usted',
    assistantRole: 'Asistente de Wiley',
    starterPrompts: [
      '¿Cuando es la proxima reunion del concejo municipal?',
      '¿Como contacto al ayuntamiento?',
      '¿Quien es el alcalde?',
      '¿Donde encuentro registros y agendas?',
    ],
    configuredWelcome:
      'Pregunte sobre reuniones, funcionarios, registros, servicios o contactos. Este asistente ahora habla con el bot Easy-Peasy del Pueblo de Wiley mediante un proxy seguro del lado del servidor, por lo que la clave de API no vive en el navegador.',
    offlineWelcome:
      'El chat programatico esta fuera de linea en este entorno. Despliegue el proxy de Easy-Peasy y configure EASYPEASY_API_ENDPOINT para activarlo.',
    missingProgrammaticMessage:
      'El chat programatico todavia no esta conectado. Configure EASYPEASY_API_ENDPOINT en la configuracion de despliegue despues de publicar el proxy.',
    retryMessage:
      'El asistente no esta disponible temporalmente. Intente de nuevo en un momento o contacte directamente al ayuntamiento.',
    malformedMessage: 'La respuesta del chatbot llego con un formato no valido.',
    emptyResponseMessage: 'El asistente no devolvio texto. Intente reformular su pregunta.',
    townContactLink: 'Contactar al ayuntamiento',
    openDirectChatLink: 'Abrir el asistente directamente',
    sourceLabel: 'Fuente',
    calendarLink: 'Calendario',
    contactLink: 'Contacto',
    recordsLink: 'Registros',
  },
};

@Component({
  selector: 'app-ai-chat',
  imports: [],
  templateUrl: './localized-ai-chat.html',
  styleUrl: './ai-chat.scss',
})
export class LocalizedAiChat {
  private readonly http = inject(HttpClient);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly chatbotConfig = getChatbotRuntimeConfig();
  private readonly messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly isSending = signal(false);
  protected readonly draft = signal('');
  protected readonly copy = computed(
    () => AI_CHAT_COPY[this.siteLanguageService.currentLanguage()],
  );
  protected readonly starterPrompts = computed(() => this.copy().starterPrompts);
  protected readonly isConfigured =
    this.chatbotConfig.mode === 'api' && Boolean(this.chatbotConfig.apiEndpoint);
  protected readonly messages = signal<ChatMessage[]>([this.createWelcomeMessage()]);

  constructor() {
    effect(() => {
      this.copy();

      const messages = this.messages();

      if (messages.length === 1 && messages[0]?.omitFromHistory) {
        this.messages.set([this.createWelcomeMessage()]);
      }
    });
  }

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
        this.copy().missingProgrammaticMessage,
        [{ label: this.copy().townContactLink, href: '#contact' }],
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
        response.response?.trim() || this.copy().emptyResponseMessage,
        this.mapSourceLinks(response.sources),
      );
    } catch {
      this.appendAssistantMessage(this.copy().retryMessage, this.buildUnavailableLinks(), true);
    } finally {
      this.isSending.set(false);
    }
  }

  private createWelcomeMessage(): ChatMessage {
    if (this.isConfigured) {
      return {
        role: 'assistant',
        content: this.copy().configuredWelcome,
        links: [
          { label: this.copy().calendarLink, href: '#calendar' },
          { label: this.copy().contactLink, href: '#contact' },
          { label: this.copy().recordsLink, href: '#records' },
        ],
        omitFromHistory: true,
      };
    }

    return {
      role: 'assistant',
      content: this.copy().offlineWelcome,
      links: [{ label: this.copy().townContactLink, href: '#contact' }],
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

  private buildUnavailableLinks(): AssistantLink[] {
    const links: AssistantLink[] = [{ label: this.copy().townContactLink, href: '#contact' }];

    if (this.chatbotConfig.chatUrl.trim()) {
      links.unshift({
        label: this.copy().openDirectChatLink,
        href: this.chatbotConfig.chatUrl.trim(),
      });
    }

    return links;
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
        label: source.title?.trim() || this.copy().sourceLabel,
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
        error: this.copy().malformedMessage,
      };
    }

    const unwrappedPayload = this.unwrapProxyPayload(payload);
    const response = this.extractText(unwrappedPayload);
    const rawError = unwrappedPayload['error'];
    const error =
      typeof rawError === 'string'
        ? rawError.trim()
        : !response && rawResponse.trim()
          ? this.copy().malformedMessage
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
