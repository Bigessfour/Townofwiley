import type { AuthSession } from 'aws-amplify/auth';
import type { StaffAuthService } from '../auth/staff-auth.service';
import { CMS_MODEL_LIST_FIELDS } from './cms-model-admin-fields';

/** Amplify GraphQL auth mode for staff CMS writes (never apiKey or iam in the browser). */
export type CmsStaffAuthMode = 'userPool';

export type CmsAdminModel = keyof typeof CMS_MODEL_LIST_FIELDS;

export type CmsAdminOperation = 'list' | 'create' | 'update' | 'delete';

const STAFF_SIGN_IN_MESSAGE =
  'Sign in at /admin/login with a Town staff account before changing website content.';

export class CmsAdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CmsAdminAuthError';
  }
}

export class CmsAdminValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CmsAdminValidationError';
  }
}

export function isCmsAdminModel(model: string): model is CmsAdminModel {
  return Object.prototype.hasOwnProperty.call(CMS_MODEL_LIST_FIELDS, model);
}

export function assertCmsAdminModel(model: string): asserts model is CmsAdminModel {
  if (!isCmsAdminModel(model)) {
    throw new CmsAdminValidationError(`Unsupported CMS model: ${model}`);
  }
}

export async function isAuthenticatedAdmin(staffAuth: StaffAuthService): Promise<boolean> {
  await staffAuth.refreshSession();
  return staffAuth.isStaff();
}

export async function requireAuthenticatedAdmin(
  staffAuth: StaffAuthService,
): Promise<CmsStaffAuthMode> {
  await staffAuth.refreshSession();
  if (!staffAuth.isStaff()) {
    throw new CmsAdminAuthError(STAFF_SIGN_IN_MESSAGE);
  }
  return 'userPool';
}

export function resolveStaffGraphqlAuthMode(session: AuthSession): CmsStaffAuthMode | null {
  if (session.tokens?.accessToken) {
    return 'userPool';
  }
  return null;
}

export function toClerkFriendlyGraphqlError(
  error: unknown,
  operation: CmsAdminOperation,
  model: string,
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : '';

  const normalized = raw.toLowerCase();

  if (
    normalized.includes('not authorized') ||
    normalized.includes('unauthorized') ||
    normalized.includes('unauthenticated')
  ) {
    return STAFF_SIGN_IN_MESSAGE;
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return `Could not reach the content database while trying to ${operation} ${model}. Check your connection and try again.`;
  }

  if (raw.trim()) {
    return raw.trim();
  }

  return `Could not ${operation} ${model}. Try signing in again at /admin/login.`;
}
