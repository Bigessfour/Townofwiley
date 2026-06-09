import { TestBed } from '@angular/core/testing';
import { StaffAuthService } from './auth/staff-auth.service';
import { CmsAdminAuthError } from './cms-admin/cms-staff-appsync-auth';
import { CmsGenericModelAdminService } from './cms-generic-model-admin.service';
import { LoggingService } from './logging.service';

const { graphqlMock } = vi.hoisted(() => ({
  graphqlMock: vi.fn(),
}));

vi.mock('aws-amplify/api', () => ({
  generateClient: () => ({
    graphql: graphqlMock,
  }),
}));

describe('CmsGenericModelAdminService', () => {
  let service: CmsGenericModelAdminService;
  let staffAuth: {
    refreshSession: ReturnType<typeof vi.fn>;
    isStaff: ReturnType<typeof vi.fn>;
    playwrightStaffBypassActive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    graphqlMock.mockReset();
    staffAuth = {
      refreshSession: vi.fn().mockResolvedValue(undefined),
      isStaff: vi.fn().mockReturnValue(true),
      playwrightStaffBypassActive: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        CmsGenericModelAdminService,
        {
          provide: StaffAuthService,
          useValue: staffAuth,
        },
        {
          provide: LoggingService,
          useValue: { log: vi.fn() },
        },
      ],
    });

    service = TestBed.inject(CmsGenericModelAdminService);
  });

  it('isAuthenticatedAdmin returns staff session state', async () => {
    staffAuth.isStaff.mockReturnValue(true);
    await expect(service.isAuthenticatedAdmin()).resolves.toBe(true);
    expect(staffAuth.refreshSession).toHaveBeenCalled();
  });

  it('createRecord rejects non-staff before GraphQL', async () => {
    staffAuth.isStaff.mockReturnValue(false);

    await expect(
      service.createRecord('Announcement', { title: 'Test', detail: 'Body', active: true }),
    ).rejects.toThrow(/Sign in at \/admin\/login/);

    expect(graphqlMock).not.toHaveBeenCalled();
  });

  it('createRecord uses userPool auth and strips unknown input fields', async () => {
    graphqlMock.mockResolvedValue({
      data: { createAnnouncement: { id: 'notice-1' } },
    });

    const id = await service.createRecord('Announcement', {
      title: ' Water notice ',
      detail: 'Main Street closure',
      active: true,
      hackerField: 'ignored',
    });

    expect(id).toBe('notice-1');
    expect(graphqlMock).toHaveBeenCalledWith(
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
    expect(graphqlMock.mock.calls[0]?.[0]?.variables?.input).not.toHaveProperty('hackerField');
  });

  it('updateRecord requires id', async () => {
    await expect(
      service.updateRecord('Event', { title: 'Council meeting', active: true }),
    ).rejects.toThrow(/Record id is required/);
  });

  it('deleteRecord calls deleteAnnouncement with userPool auth', async () => {
    graphqlMock.mockResolvedValue({
      data: { deleteAnnouncement: { id: 'notice-1' } },
    });

    const id = await service.deleteRecord('Announcement', 'notice-1');

    expect(id).toBe('notice-1');
    expect(graphqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'userPool',
        variables: { input: { id: 'notice-1' } },
      }),
    );
  });

  it('listRecords throws friendly error when GraphQL fails', async () => {
    graphqlMock.mockRejectedValue(new Error('Not Authorized'));

    await expect(service.listRecords('Announcement')).rejects.toThrow(/Sign in at \/admin\/login/);
  });

  it('listRecords SiteCopy uses userPool auth and listSiteCopies query', async () => {
    graphqlMock.mockResolvedValue({
      data: {
        listSiteCopies: {
          items: [{ id: 'copy-1', key: 'topTasksKicker', valueEn: 'How do I…', active: true }],
        },
      },
    });

    const items = await service.listRecords('SiteCopy');

    expect(items).toHaveLength(1);
    expect(items[0]?.['key']).toBe('topTasksKicker');
    expect(graphqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authMode: 'userPool',
      }),
    );
    const call = graphqlMock.mock.calls[0]?.[0];
    expect(call?.query).toContain('listSiteCopies');
    expect(call?.query).toContain('valueEn');
    expect(call?.query).toContain('valueEs');
  });

  it('listRecords SiteCopy maps GraphQL errors array to staff sign-in message', async () => {
    graphqlMock.mockRejectedValue({ errors: [{ message: 'Not Authorized' }] });

    await expect(service.listRecords('SiteCopy')).rejects.toThrow(/Sign in at \/admin\/login/);
  });

  it('reorderRecords updates displayOrder via userPool mutations', async () => {
    graphqlMock
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
    expect(graphqlMock).toHaveBeenCalledTimes(2);
    expect(graphqlMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        authMode: 'userPool',
        variables: { input: { id: 'biz-1', displayOrder: 0 } },
      }),
    );
  });

  it('rejects unsupported models', async () => {
    await expect(service.createRecord('NotARealModel', { id: 'x' })).rejects.toThrow(
      /Unsupported CMS model/,
    );
  });
});

describe('cms-staff-appsync-auth', () => {
  it('requireAuthenticatedAdmin throws CmsAdminAuthError for non-staff', async () => {
    const { requireAuthenticatedAdmin } = await import('./cms-admin/cms-staff-appsync-auth');
    const auth = {
      refreshSession: vi.fn().mockResolvedValue(undefined),
      isStaff: vi.fn().mockReturnValue(false),
    } as unknown as StaffAuthService;

    await expect(requireAuthenticatedAdmin(auth)).rejects.toBeInstanceOf(CmsAdminAuthError);
  });
});
