import type { AuthSession } from 'aws-amplify/auth';
import type { StaffAuthService } from '../auth/staff-auth.service';
import { CMS_MODEL_LIST_FIELDS } from './cms-model-admin-fields';

/** Amplify GraphQL auth mode for staff CMS writes (never apiKey or iam in the browser). */
export type CmsStaffAuthMode = 'userPool';

export type CmsAdminModel = keyof typeof CMS_MODEL_LIST_FIELDS;

export type CmsAdminOperation = 'list' | 'create' | 'update' | 'delete';

export const STAFF_SIGN_IN_MESSAGE =
  'Sign in at /admin/login with a Town staff account before changing website content.';

const STAFF_SCHEMA_MESSAGE =
  'Staff access to this content type is not configured on the server. Contact IT to enable Staff group permissions for this model in AppSync.';

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

function readGraphqlErrors(value: unknown): string[] {
  if (typeof value !== 'object' || value === null || !('errors' in value)) {
    return [];
  }

  const errors = (value as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors
    .map((entry) => {
      if (typeof entry === 'object' && entry !== null && 'message' in entry) {
        return String((entry as { message?: unknown }).message ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

/** Pull a human-readable message from Amplify GraphQL / Auth failures. */
export function extractGraphqlFailureMessage(error: unknown): string {
  const fromErrors = readGraphqlErrors(error);
  if (fromErrors.length > 0) {
    return fromErrors.join(' ');
  }

  if (error instanceof Error) {
    const parts = [error.message?.trim(), readErrorCauseMessage(error.cause)].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' — ');
    }
    const name = error.name?.trim();
    if (name && name !== 'Error') {
      return name;
    }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) {
      return message;
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized === '{}' || serialized === 'null' || serialized === '[]') {
      return '';
    }
    return serialized;
  } catch {
    return '';
  }
}

function readErrorCauseMessage(cause: unknown): string {
  if (!cause) {
    return '';
  }
  if (cause instanceof Error) {
    return cause.message?.trim() ?? '';
  }
  if (typeof cause === 'string') {
    return cause.trim();
  }
  return '';
}

function isStaffAuthFailure(normalized: string): boolean {
  return (
    normalized.includes('not authorized') ||
    normalized.includes('unauthorized') ||
    normalized.includes('unauthenticated') ||
    normalized.includes('novalidauthtokens') ||
    normalized.includes('no valid auth tokens') ||
    normalized.includes('federated jwt') ||
    normalized.includes('no current user') ||
    normalized.includes('user needs to be authenticated') ||
    normalized.includes('sign in')
  );
}

function isSchemaMissingField(normalized: string): boolean {
  return (
    normalized.includes("field 'listsitecopies'") ||
    normalized.includes('listsitecopies') && normalized.includes("doesn't exist") ||
    normalized.includes('listsitecopies') && normalized.includes('undefined') ||
    normalized.includes('unknown field') && normalized.includes('listsitecopies')
  );
}

export function toClerkFriendlyGraphqlError(
  error: unknown,
  operation: CmsAdminOperation,
  model: string,
): string {
  const raw = extractGraphqlFailureMessage(error);
  const normalized = raw.toLowerCase();

  if (isStaffAuthFailure(normalized)) {
    return STAFF_SIGN_IN_MESSAGE;
  }

  if (isSchemaMissingField(normalized)) {
    return STAFF_SCHEMA_MESSAGE;
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return `Could not reach the content database while trying to ${operation} ${model}. Check your connection and try again.`;
  }

  if (raw.trim()) {
    return raw.trim();
  }

  return `Could not ${operation} ${model}. Try signing in again at /admin/login.`;
}
