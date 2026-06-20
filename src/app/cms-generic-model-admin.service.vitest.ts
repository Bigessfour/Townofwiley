import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffAuthService } from './auth/staff-auth.service';
import { CmsGenericModelAdminService } from './cms-generic-model-admin.service';
import { LoggingService } from './logging.service';

const amplifyGraphqlMock = vi.hoisted(() => vi.fn());

vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: amplifyGraphqlMock,
  }),
}));

describe('CmsGenericModelAdminService (Amplify GraphQL)', () => {
  let service: CmsGenericModelAdminService;
  let staffAuth: {
    refreshSession: ReturnType<typeof vi.fn>;
    isStaff: ReturnType<typeof vi.fn>;
    playwrightStaffBypassActive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    amplifyGraphqlMock.mockReset();
    staffAuth = {
      refreshSession: vi.fn().mockResolvedValue(undefined),
      isStaff: vi.fn().mockReturnValue(true),
      playwrightStaffBypassActive: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        CmsGenericModelAdminService,
        { provide: StaffAuthService, useValue: staffAuth },
        { provide: LoggingService, useValue: { log: vi.fn() } },
      ],
    });

    service = TestBed.inject(CmsGenericModelAdminService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('createRecord uses userPool auth and strips unknown input fields', async () => {
    amplifyGraphqlMock.mockResolvedValue({
      data: { createAnnouncement: { id: 'notice-1' } },
    });

    const id = await service.createRecord('Announcement', {
      title: ' Water notice ',
      detail: 'Main Street closure',
      active: true,
      hackerField: 'ignored',
    });

    expect(id).toBe('notice-1');
    expect(amplifyGraphqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'userPool',
        variables: {
          input: {
            title: 'Water notice',
            detail: 'Main Street closure',
            active: true,
          },
        },
      }),
    );
    expect(amplifyGraphqlMock.mock.calls[0]?.[0]?.variables?.input).not.toHaveProperty(
      'hackerField',
    );
  });

  it('deleteRecord calls deleteAnnouncement with userPool auth', async () => {
    amplifyGraphqlMock.mockResolvedValue({
      data: { deleteAnnouncement: { id: 'notice-1' } },
    });

    const id = await service.deleteRecord('Announcement', 'notice-1');

    expect(id).toBe('notice-1');
    expect(amplifyGraphqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'userPool',
        variables: { input: { id: 'notice-1' } },
      }),
    );
  });

  it('listRecords SiteCopy uses userPool auth and listSiteCopies query', async () => {
    amplifyGraphqlMock.mockResolvedValue({
      data: {
        listSiteCopies: {
          items: [{ id: 'copy-1', key: 'topTasksKicker', valueEn: 'How do I…', active: true }],
        },
      },
    });

    const items = await service.listRecords('SiteCopy');

    expect(items).toHaveLength(1);
    expect(items[0]?.['key']).toBe('topTasksKicker');
    expect(amplifyGraphqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'userPool',
      }),
    );
    const call = amplifyGraphqlMock.mock.calls[0]?.[0];
    expect(call?.query).toContain('listSiteCopies');
    expect(call?.query).toContain('valueEn');
    expect(call?.query).toContain('valueEs');
  });

  it('reorderRecords updates displayOrder via userPool mutations', async () => {
    amplifyGraphqlMock
      .mockResolvedValueOnce({
        data: { updateBusiness: { id: 'biz-1' } },
      })
      .mockResolvedValueOnce({
        data: { updateBusiness: { id: 'biz-2' } },
      });

    const ids = await service.reorderRecords('Business', [
      { id: 'biz-1', displayOrder: 0 },
      { id: 'biz-2', displayOrder: 1 },
    ]);

    expect(ids).toEqual(['biz-1', 'biz-2']);
    expect(amplifyGraphqlMock).toHaveBeenCalledTimes(2);
    expect(amplifyGraphqlMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        authMode: 'userPool',
        variables: { input: { id: 'biz-1', displayOrder: 0 } },
      }),
    );
  });
});
