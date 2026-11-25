import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FieldsetModule } from 'primeng/fieldset';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { APP_COPY } from '../app-copy';
import { SiteLanguage, SiteLanguageService } from '../site-language';
import { askOrdinanceQuestion, formatOrdinanceCitation, planOrdinanceReply } from './ordinance-ask';
import { assessOrdinanceQuestion } from './ordinance-question-scope';
import { readOrdinanceRuntimeConfig } from './ordinance-runtime-config';

const QUESTION_MAX_LENGTH = 600;

interface OrdinanceMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

interface OrdinanceChatCopy {
  scopeTag: string;
  scopeNote: string;
  questionLabel: string;
  placeholder: string;
  helper: string;
  tooLong: string;
  send: string;
  clear: string;
  promptsLabel: string;
  prompts: string[];
  welcome: string;
  outOfScope: string;
  lookingUp: string;
  unavailable: string;
  you: string;
  assistant: string;
  conversationLabel: string;
  clerkNote: string;
  clerkLink: string;
}

const CHAT_COPY: Record<SiteLanguage, OrdinanceChatCopy> = {
  en: {
    scopeTag: 'Ordinances only',
    scopeNote:
      'This assistant answers questions about the Wiley Municipal Code and later ordinances that amend it. It will not do homework, write papers, draft messages, or answer general questions.',
    questionLabel: 'Your question about the municipal code',
    placeholder: 'Example: Do I need a license for my dog?',
    helper: 'Ask about a rule, permit, penalty, or section number.',
    tooLong: 'Keep the question under 600 characters.',
    send: 'Ask',
    clear: 'Clear conversation',
    promptsLabel: 'Questions this page is for',
    prompts: [
      'Do I need a license for my dog?',
      'What is the rule for a dog running at large?',
      'Where are the zoning variance rules?',
      'What building regulations does the code adopt?',
    ],
    welcome:
      'Ask about an adopted Wiley ordinance. This assistant answers from the municipal code and declines questions outside it.',
    outOfScope:
      'I only answer questions about the Town of Wiley municipal code and adopted ordinances. I cannot help with homework, general knowledge, coding, or drafting. Try a question about a permit, animal rule, zoning section, or utility regulation.',
    lookingUp: 'Looking up the municipal code.',
    unavailable:
      'The ordinance assistant could not be reached. I will not guess at the section. The Town Clerk can provide the official text.',
    you: 'You',
    assistant: 'Code assistant',
    conversationLabel: 'Conversation',
    clerkNote: 'The adopted ordinance controls if this assistant and the code book ever disagree.',
    clerkLink: 'Contact the Town Clerk',
  },
  es: {
    scopeTag: 'Solo ordenanzas',
    scopeNote:
      'Este asistente responde preguntas sobre el Código Municipal de Wiley y las ordenanzas posteriores que lo modifican. No hace tareas, no redacta textos y no responde preguntas generales.',
    questionLabel: 'Su pregunta sobre el código municipal',
    placeholder: 'Ejemplo: ¿Necesito licencia para mi perro?',
    helper: 'Pregunte sobre una regla, un permiso, una multa o un número de sección.',
    tooLong: 'La pregunta debe tener menos de 600 caracteres.',
    send: 'Preguntar',
    clear: 'Borrar conversación',
    promptsLabel: 'Preguntas para esta página',
    prompts: [
      '¿Necesito licencia para mi perro?',
      '¿Cuál es la regla si un perro anda suelto?',
      '¿Dónde están las reglas de variaciones de zonificación?',
      '¿Qué reglamentos de construcción adopta el código?',
    ],
    welcome:
      'Pregunte sobre una ordenanza adoptada de Wiley. Este asistente responde desde el código municipal y rechaza las preguntas que no son del código.',
    outOfScope:
      'Solo respondo preguntas sobre el código municipal y las ordenanzas adoptadas del Pueblo de Wiley. No puedo ayudar con tareas, cultura general, programación ni redacción. Pruebe una pregunta sobre un permiso, animales, zonificación o servicios públicos.',
    lookingUp: 'Buscando en el código municipal.',
    unavailable:
      'No se pudo contactar al asistente de ordenanzas. No voy a adivinar la sección. La Secretaría del Pueblo puede dar el texto oficial.',
    you: 'Usted',
    assistant: 'Asistente del código',
    conversationLabel: 'Conversación',
    clerkNote: 'La ordenanza adoptada manda si este asistente y el libro del código no coinciden.',
    clerkLink: 'Contactar a la Secretaría',
  },
};

@Component({
  selector: 'app-ordinances-page',
  imports: [
    ButtonModule,
    CardModule,
    FieldsetModule,
    MessageModule,
    RouterLink,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './ordinances-page.html',
  styleUrl: './ordinances-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdinancesPage {
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly draft = signal('');
  protected readonly asking = signal(false);
  protected readonly messages = signal<OrdinanceMessage[]>([]);

  protected readonly pageCopy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly copy = computed(
    () => CHAT_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly questionTooLong = computed(
    () => this.draft().trim().length > QUESTION_MAX_LENGTH,
  );

  protected onQuestionInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return;
    }

    this.draft.set(target.value);
  }

  protected askPrompt(prompt: string): void {
    this.draft.set(prompt);
    this.sendMessage();
  }

  protected sendMessage(): void {
    const text = this.draft().trim();
    const scope = assessOrdinanceQuestion(text);
    const endpoint = readOrdinanceRuntimeConfig().apiEndpoint;
    const plan = planOrdinanceReply(scope, endpoint);
    if (plan === 'ignore' || this.questionTooLong() || this.asking()) {
      return;
    }

    const copy = this.copy();
    if (plan === 'decline' || plan === 'pending') {
      this.messages.update((current) => [
        ...current,
        { role: 'user', content: text },
        {
          role: 'assistant',
          content: plan === 'pending' ? copy.unavailable : copy.outOfScope,
        },
      ]);
      this.draft.set('');
      return;
    }

    const config = readOrdinanceRuntimeConfig();
    this.asking.set(true);
    this.messages.update((current) => [
      ...current,
      { role: 'user', content: text },
      { role: 'assistant', content: copy.lookingUp },
    ]);
    this.draft.set('');
    void askOrdinanceQuestion(config, text)
      .then((result) => {
        this.replacePending(result.answer || copy.unavailable, result.citations.map(formatOrdinanceCitation));
      })
      .catch(() => {
        this.replacePending(copy.unavailable);
      })
      .finally(() => {
        this.asking.set(false);
      });
  }

  private replacePending(content: string, citations: string[] = []): void {
    this.messages.update((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === 'assistant') {
        next[next.length - 1] = { role: 'assistant', content, citations };
      }
      return next;
    });
  }

  protected clearConversation(): void {
    this.messages.set([]);
    this.draft.set('');
  }
}
