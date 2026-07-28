import { Injectable, computed, signal } from '@angular/core';
import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  signIn,
  signInWithRedirect,
  signOut,
  type SignInInput,
} from 'aws-amplify/auth';
import { cognitoConfig } from '../amplify-config';
import { isUserAlreadyAuthenticatedError } from './staff-auth-error';

interface RuntimeE2eConfig {
  staffAuth?: boolean;
  skipHostedSignInRedirect?: boolean;
}

interface AppRuntimeConfig {
  e2e?: RuntimeE2eConfig;
}

export interface StaffSignInInput {
  username: string;
  password: string;
}

export interface StaffPasswordResetConfirmInput {
  username: string;
  confirmationCode: string;
  newPassword: string;
}

export type StaffSignInStep = 'complete' | 'newPasswordRequired';

@Injectable({ providedIn: 'root' })
export class StaffAuthService {
  private readonly staffGroup = cognitoConfig.staffGroup;
  private readonly sessionReady = signal(false);
  private readonly authenticated = signal(false);
  private readonly staffMember = signal(false);
  private readonly staffGroupsState = signal<string[]>([]);
  private readonly userEmail = signal<string | null>(null);
  private readonly accessTokenValue = signal<string | null>(null);
  private readonly idTokenValue = signal<string | null>(null);
  private hostedSignInCompletion: Promise<void> | null = null;

  readonly isSessionReady = computed(() => this.sessionReady());
  readonly isAuthenticated = computed(() => this.authenticated());
  readonly isStaff = computed(() => this.staffMember());
  readonly staffGroups = computed(() => this.staffGroupsState());
  readonly email = computed(() => this.userEmail());
  readonly accessToken = computed(() => this.accessTokenValue());
  readonly idToken = computed(() => this.idTokenValue());

  /**
   * Bearer token for staff API calls. Prefers the JWT that actually carries
   * `cognito:groups` Staff (often the ID token when access lacks groups).
   */
  readonly apiBearerToken = computed(() => {
    const access = this.accessTokenValue();
    const id = this.idTokenValue();
    if (access && this.jwtHasStaffGroup(access)) {
      return access;
    }
    if (id && this.jwtHasStaffGroup(id)) {
      return id;
    }
    // Staff membership may come from Amplify token payloads even when the
    // access JWT string omits cognito:groups — send the ID token in that case.
    if (this.staffMember() && id) {
      return id;
    }
    return access ?? id;
  });

  /** Playwright e2e sets runtime e2e.staffAuth without a real Cognito JWT. */
  playwrightStaffBypassActive(): boolean {
    return this.isE2eStaffBypass();
  }

  async refreshSession(options?: { forceRefresh?: boolean }): Promise<void> {
    if (this.isE2eStaffBypass()) {
      this.accessTokenValue.set('e2e-staff-token');
      this.idTokenValue.set('e2e-staff-token');
      this.authenticated.set(true);
      this.staffMember.set(true);
      this.staffGroupsState.set(['Staff']);
      this.userEmail.set('e2e-staff@townofwiley.gov');
      this.sessionReady.set(true);
      return;
    }

    if (this.isE2eStaffAuthDisabled()) {
      this.clearSessionState();
      this.sessionReady.set(true);
      return;
    }

    try {
      const session = await fetchAuthSession({
        forceRefresh: options?.forceRefresh ?? false,
      });
      const accessToken = session.tokens?.accessToken?.toString() ?? null;
      const idToken = session.tokens?.idToken?.toString() ?? null;
      const groups = this.resolveStaffGroups(session.tokens);
      const isStaff = groups.includes(this.staffGroup);

      this.accessTokenValue.set(accessToken);
      this.idTokenValue.set(idToken);
      this.authenticated.set(Boolean(accessToken || idToken));
      this.staffMember.set(isStaff);
      this.staffGroupsState.set(groups);

      if (this.authenticated()) {
        try {
          const user = await getCurrentUser();
          this.userEmail.set(user.signInDetails?.loginId ?? user.username ?? null);
        } catch {
          this.userEmail.set(null);
        }
      } else {
        this.userEmail.set(null);
      }
    } catch {
      this.clearSessionState();
    } finally {
      this.sessionReady.set(true);
    }
  }

  private clearSessionState(): void {
    this.accessTokenValue.set(null);
    this.idTokenValue.set(null);
    this.authenticated.set(false);
    this.staffMember.set(false);
    this.staffGroupsState.set([]);
    this.userEmail.set(null);
  }

  /** Redirects to Cognito Hosted UI for staff sign-in. */
  async beginStaffHostedSignIn(): Promise<void> {
    if (this.isE2eStaffBypass() || this.shouldSkipHostedSignInRedirect()) {
      return;
    }

    await this.refreshSession();
    if (this.isStaff()) {
      return;
    }

    if (this.isAuthenticated()) {
      await signOut({ global: true });
      await this.refreshSession();
    }

    try {
      await signInWithRedirect();
    } catch (error) {
      if (!isUserAlreadyAuthenticatedError(error)) {
        throw error;
      }
      await this.refreshSession();
      if (this.isStaff()) {
        return;
      }
      await signOut({ global: true });
      await this.refreshSession();
      await signInWithRedirect();
    }
  }

  /** After OAuth callback, load session and verify Staff group membership. */
  async completeHostedSignIn(): Promise<void> {
    if (this.hostedSignInCompletion) {
      return this.hostedSignInCompletion;
    }

    this.hostedSignInCompletion = this.completeHostedSignInInternal();
    try {
      await this.hostedSignInCompletion;
    } finally {
      this.hostedSignInCompletion = null;
    }
  }

  private async completeHostedSignInInternal(): Promise<void> {
    await this.waitForAuthenticatedSession(20, 300);
    await this.waitForStaffSession(30, 300);
  }

  /** Loads identity-pool credentials for Staff S3 uploads after Cognito sign-in. */
  async ensureIdentityCredentials(): Promise<void> {
    if (this.isE2eStaffBypass()) {
      return;
    }
    await fetchAuthSession({ forceRefresh: true });
  }

  /**
   * Gives the OAuth listener time to finish after Cognito redirects back to /admin/login.
   * The listener can sign in and strip ?code= before Angular runs the login flow.
   */
  async waitForAuthenticatedSession(maxAttempts = 10, delayMs = 200): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.refreshSession();
      if (this.isAuthenticated()) {
        return;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  isHostedSignInCallback(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    return params.has('code') && params.has('state');
  }

  /** Starts staff sign-in; returns when a new temporary password must be set. */
  async beginStaffSignIn(input: StaffSignInInput): Promise<StaffSignInStep> {
    await this.refreshSession();
    if (this.isAuthenticated()) {
      await signOut({ global: true });
      await this.refreshSession();
    }

    const credentials: SignInInput = {
      username: input.username.trim(),
      password: input.password,
    };
    const result = await signIn(credentials);
    if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      return 'newPasswordRequired';
    }
    if (result.nextStep.signInStep !== 'DONE') {
      throw new Error(
        `Additional sign-in steps are required (${result.nextStep.signInStep}). Contact IT for staff account setup.`,
      );
    }
    await this.waitForStaffSession();
    return 'complete';
  }

  /** Completes first-time sign-in after Cognito issues a temporary password. */
  async completeStaffNewPassword(newPassword: string): Promise<void> {
    const result = await confirmSignIn({ challengeResponse: newPassword });
    if (result.nextStep.signInStep !== 'DONE') {
      throw new Error(
        `Additional sign-in steps are required (${result.nextStep.signInStep}). Contact IT for staff account setup.`,
      );
    }
    await this.waitForStaffSession();
  }

  /** @deprecated Prefer beginStaffHostedSignIn for UI flows. */
  async signInStaff(input: StaffSignInInput): Promise<void> {
    const step = await this.beginStaffSignIn(input);
    if (step === 'newPasswordRequired') {
      throw new Error(
        'Your account requires a new password. Enter your temporary password, then set a new password when prompted.',
      );
    }
  }

  async signOutStaff(): Promise<void> {
    await signOut({ global: true });
    await this.refreshSession();
  }

  /** Sends a verification code to the staff email for self-service password reset. */
  async requestStaffPasswordReset(username: string): Promise<void> {
    const result = await resetPassword({ username: username.trim() });
    if (result.nextStep.resetPasswordStep === 'DONE') {
      return;
    }
    if (result.nextStep.resetPasswordStep !== 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
      throw new Error(
        `Password reset requires additional steps (${result.nextStep.resetPasswordStep}). Contact IT for staff account help.`,
      );
    }
  }

  /** Completes password reset with the code from email and a new password. */
  async confirmStaffPasswordReset(input: StaffPasswordResetConfirmInput): Promise<void> {
    await confirmResetPassword({
      username: input.username.trim(),
      confirmationCode: input.confirmationCode.trim(),
      newPassword: input.newPassword,
    });
  }

  /**
   * Polls until cognito:groups includes Staff or times out.
   * OAuth Hosted UI can return an access token before group claims are present on either token.
   */
  async waitForStaffSession(maxAttempts = 20, delayMs = 250): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await this.refreshSession({ forceRefresh: attempt > 0 });
      if (this.isStaff()) {
        return;
      }
      if (!this.isAuthenticated()) {
        break;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    await this.assertStaffSession();
  }

  private async assertStaffSession(): Promise<void> {
    await this.refreshSession();
    if (!this.isStaff()) {
      await signOut({ global: true });
      throw new Error('This account is not authorized for staff admin access.');
    }
  }

  private isE2eStaffBypass(): boolean {
    return this.readE2eFlag('staffAuth') === true;
  }

  /** Playwright sets staffAuth: false to exercise /admin/login without Cognito network calls. */
  private isE2eStaffAuthDisabled(): boolean {
    return this.readE2eFlag('staffAuth') === false;
  }

  private shouldSkipHostedSignInRedirect(): boolean {
    return this.readE2eFlag('skipHostedSignInRedirect') === true;
  }

  private readE2eFlag(key: keyof RuntimeE2eConfig): boolean | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG__?: AppRuntimeConfig;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: AppRuntimeConfig;
    };
    const override = runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.e2e?.[key];
    if (override !== undefined) {
      return override;
    }
    return runtimeWindow.__TOW_RUNTIME_CONFIG__?.e2e?.[key];
  }

  private readGroupsFromToken(payload: Record<string, unknown> | undefined): string[] {
    if (!payload) {
      return [];
    }
    const raw = payload['cognito:groups'];
    if (Array.isArray(raw)) {
      return raw.map(String);
    }
    if (typeof raw === 'string' && raw.trim()) {
      return [raw.trim()];
    }
    return [];
  }

  private jwtHasStaffGroup(jwt: string): boolean {
    return this.readGroupsFromToken(this.decodeJwtPayload(jwt)).includes(this.staffGroup);
  }

  private resolveStaffGroups(
    tokens:
      | {
          idToken?: { payload?: Record<string, unknown>; toString?: () => string };
          accessToken?: { payload?: Record<string, unknown>; toString?: () => string };
        }
      | undefined,
  ): string[] {
    const idGroups = this.readGroupsFromTokenObject(tokens?.idToken);
    const accessGroups = this.readGroupsFromTokenObject(tokens?.accessToken);
    return [...new Set([...idGroups, ...accessGroups])];
  }

  private readGroupsFromTokenObject(
    token: { payload?: Record<string, unknown>; toString?: () => string } | undefined,
  ): string[] {
    const fromPayload = this.readGroupsFromToken(token?.payload);
    if (fromPayload.length) {
      return fromPayload;
    }
    const jwt = token?.toString?.();
    if (!jwt || !jwt.includes('.')) {
      return [];
    }
    return this.readGroupsFromToken(this.decodeJwtPayload(jwt));
  }

  private decodeJwtPayload(jwt: string): Record<string, unknown> | undefined {
    const parts = jwt.split('.');
    if (parts.length < 2) {
      return undefined;
    }
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}
