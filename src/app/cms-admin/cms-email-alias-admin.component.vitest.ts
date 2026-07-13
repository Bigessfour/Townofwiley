import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffAuthService } from '../auth/staff-auth.service';
import { CmsGenericModelAdminService } from '../cms-generic-model-admin.service';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { CmsEmailAliasAdminComponent, type EmailAliasRow } from './cms-email-alias-admin.component';

type Harness = CmsEmailAliasAdminComponent & {
  openCreateDialog: () => void;
  openEditDialog: (row: EmailAliasRow) => void;
  saveAlias: () => Promise<void>;
  deleteAlias: (row: EmailAliasRow) => Promise<void>;
  dialogOpen: () => boolean;
  editingId: () => string | null;
  aliasForm: CmsEmailAliasAdminComponent['aliasForm'];
};

describe('CmsEmailAliasAdminComponent', () => {
  const listRecords = vi.fn();
  const createRecord = vi.fn();
  const updateRecord = vi.fn();
  const deleteRecord = vi.fn();
  const forceLiveRefresh = vi.fn();
  const mockMessages = { add: vi.fn() };
  const mockStaffAuth = {
    refreshSession: vi.fn().mockResolvedValue(undefined),
    isStaff: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    listRecords.mockReset().mockResolvedValue([
      {
        id: 'alias-1',
        aliasAddress: 'clerk@townofwiley.gov',
        destinationAddress: 'deb@example.com',
        active: true,
      },
    ]);
    createRecord.mockReset().mockResolvedValue('alias-new');
    updateRecord.mockReset().mockResolvedValue('alias-1');
    deleteRecord.mockReset().mockResolvedValue('alias-1');
    forceLiveRefresh.mockReset().mockResolvedValue(undefined);
    mockMessages.add.mockReset();
    mockStaffAuth.isStaff.mockReturnValue(true);
    vi.stubGlobal('confirm', vi.fn(() => true));

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CmsGenericModelAdminService,
          useValue: { listRecords, createRecord, updateRecord, deleteRecord },
        },
        { provide: StaffAuthService, useValue: mockStaffAuth },
        { provide: MessageService, useValue: mockMessages },
        { provide: LocalizedCmsContentStore, useValue: { forceLiveRefresh } },
      ],
    });
  });

  function createHarness(): Harness {
    const component = TestBed.runInInjectionContext(
      () => new CmsEmailAliasAdminComponent(),
    ) as Harness;
    component.ngOnInit();
    return component;
  }

  async function settle(): Promise<void> {
    for (let tick = 0; tick < 10; tick += 1) {
      await Promise.resolve();
    }
  }

  it('loads aliases on init when staff is signed in', async () => {
    createHarness();
    await settle();
    expect(listRecords).toHaveBeenCalledWith('EmailAlias', 100);
  });

  it('openCreateDialog opens dialog in create mode', () => {
    const component = createHarness();
    component.openCreateDialog();
    expect(component.dialogOpen()).toBe(true);
    expect(component.editingId()).toBeNull();
  });

  it('saveAlias creates a new forwarding rule', async () => {
    const component = createHarness();
    component.openCreateDialog();
    component.aliasForm.patchValue({
      aliasAddress: 'clerk@townofwiley.gov',
      destinationAddress: 'deb@example.com',
      active: true,
    });

    await component.saveAlias();
    await settle();

    expect(createRecord).toHaveBeenCalledWith(
      'EmailAlias',
      expect.objectContaining({
        aliasAddress: 'clerk@townofwiley.gov',
        destinationAddress: 'deb@example.com',
        active: true,
      }),
    );
    expect(forceLiveRefresh).toHaveBeenCalled();
    expect(mockMessages.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Forwarding rule saved',
        detail: expect.stringContaining('AWS reads this automatically'),
      }),
    );
  });

  it('saveAlias normalizes shorthand Town local-part before create', async () => {
    const component = createHarness();
    component.openCreateDialog();
    component.aliasForm.patchValue({
      aliasAddress: 'steve.mckitrick',
      destinationAddress: 'BigEssFour@gmail.com',
      active: true,
    });

    await component.saveAlias();
    await settle();

    expect(createRecord).toHaveBeenCalledWith(
      'EmailAlias',
      expect.objectContaining({
        aliasAddress: 'steve.mckitrick@townofwiley.gov',
        destinationAddress: 'bigessfour@gmail.com',
        active: true,
      }),
    );
  });

  it('saveAlias updates an existing forwarding rule', async () => {
    const component = createHarness();
    component.openEditDialog({
      id: 'alias-1',
      aliasAddress: 'clerk@townofwiley.gov',
      destinationAddress: 'old@example.com',
      active: true,
    });
    component.aliasForm.patchValue({ destinationAddress: 'new@example.com' });

    await component.saveAlias();
    await settle();

    expect(updateRecord).toHaveBeenCalledWith(
      'EmailAlias',
      expect.objectContaining({
        id: 'alias-1',
        destinationAddress: 'new@example.com',
      }),
    );
    expect(forceLiveRefresh).toHaveBeenCalled();
  });

  it('deleteAlias removes a rule after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    const component = createHarness();

    await component.deleteAlias({
      id: 'alias-1',
      aliasAddress: 'clerk@townofwiley.gov',
      destinationAddress: 'deb@example.com',
      active: true,
    });
    await settle();

    expect(deleteRecord).toHaveBeenCalledWith('EmailAlias', 'alias-1');
    expect(forceLiveRefresh).toHaveBeenCalled();
    expect(mockMessages.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Forwarding rule deleted' }),
    );
    vi.unstubAllGlobals();
  });
});
