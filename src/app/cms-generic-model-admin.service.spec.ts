import { TestBed } from '@angular/core/testing';
import { StaffAuthService } from './auth/staff-auth.service';
import { CmsGenericModelAdminService } from './cms-generic-model-admin.service';
import { LoggingService } from './logging.service';

describe('CmsGenericModelAdminService', () => {
  let service: CmsGenericModelAdminService;
  let staffAuth: {
    refreshSession: ReturnType<typeof vi.fn>;
    isStaff: ReturnType<typeof vi.fn>;
    playwrightStaffBypassActive: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
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
  });

  it('updateRecord requires id', async () => {
    await expect(
      service.updateRecord('Event', { title: 'Council meeting', active: true }),
    ).rejects.toThrow(/Record id is required/);
  });

  it('rejects unsupported models', async () => {
    await expect(service.createRecord('NotARealModel', { id: 'x' })).rejects.toThrow(
      /Unsupported CMS model/,
    );
  });
});
