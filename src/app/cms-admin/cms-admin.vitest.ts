/** Symbol smoke — shell covered by e2e admin.cms.spec.ts. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CmsAdmin } from './cms-admin';

const adminDir = dirname(fileURLToPath(import.meta.url));

function template(name: string): string {
  return readFileSync(join(adminDir, name), 'utf8');
}

describe('CmsAdmin', () => {
  it('exports the admin shell surface', () => {
    expect(CmsAdmin.name).toBe('CmsAdmin');
  });

  it('keeps See on website, fragments, and staff sign-in as real anchors', () => {
    const shell = template('cms-admin.html');
    expect(shell).toContain('id="start"');
    expect(shell).toContain('id="documents"');
    expect(shell).toContain('routerLink="/admin"');
    expect(shell).toContain('fragment="start"');
    expect(shell).toContain('fragment="documents"');
    expect(shell).toContain('href="/admin/login"');
    expect(shell).toContain('href="/admin/new-staff"');
    expect(shell).toContain('[ariaLabel]="clerkQuickHelp"');

    const hub = template('cms-clerk-task-hub.component.html');
    expect(hub).toContain('[href]="previewUrl(task)"');
    expect(hub).toContain('See on website');
    expect(hub).toContain('[ariaLabel]="clerkQuickHelp"');
    expect(hub).not.toMatch(/<button[^>]*class="cms-task-card__steps"/);

    const guide = template('cms-clerk-task-guide.component.html');
    expect(guide).toContain('fragment="documents"');
    expect(guide).toContain('href="/admin/login"');

    const upload = template('cms-clerk-upload-panel.component.html');
    expect(upload).toContain('href="/admin/login"');

    const meeting = template('cms-meeting-document-upload.component.html');
    expect(meeting).toContain('href="/admin/login"');
    expect(meeting).toContain('[href]="documentsHref"');

    const recent = template('cms-recent-changes.component.html');
    expect(recent).toContain('href="/admin/login"');
  });
});
