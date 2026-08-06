import { describe, expect, it, vi } from 'vitest';
import {
  openAgendaPdfInNewTab,
  resolveAgendaUrlsByEventId,
  showAgendaUnavailableToast,
} from './meeting-agenda-actions';

describe('meeting-agenda-actions', () => {
  it('resolves agenda URLs and skips failures', async () => {
    const urls = await resolveAgendaUrlsByEventId(
      {
        a: { documentId: 'doc-a', storageHref: 's3://a.pdf' },
        b: { documentId: 'doc-b', storageHref: 's3://b.pdf' },
      },
      async (href) => {
        if (href.includes('b.pdf')) {
          throw new Error('missing');
        }
        return `https://cdn.example/${href}`;
      },
    );
    expect(urls).toEqual({ a: 'https://cdn.example/s3://a.pdf' });
  });

  it('shows an info toast when agenda is unavailable', () => {
    const add = vi.fn();
    showAgendaUnavailableToast({ add } as never, {
      summary: 'Agenda',
      detail: 'Not ready yet',
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'info', summary: 'Agenda', detail: 'Not ready yet' }),
    );
  });

  it('opens agenda PDFs in a new tab', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    openAgendaPdfInNewTab('https://example.com/agenda.pdf');
    expect(open).toHaveBeenCalledWith(
      'https://example.com/agenda.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    open.mockRestore();
  });
});
