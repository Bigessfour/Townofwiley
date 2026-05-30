import { Injectable, computed, signal } from '@angular/core';
import {
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  type SignInInput,
} from 'aws-amplify/auth';
import { cognitoConfig } from '../amplify-config';

interface RuntimeE2eConfig {
  staffAuth?: boolean;
}

interface AppRuntimeConfig {
  e2e?: RuntimeE2eConfig;
}

export interface StaffSignInInput {
  username: string;
  password: string;
}

export type StaffSignInStep = 'complete' | 'newPasswordRequired';

@Injectable({ providedIn: 'root' })
export class StaffAuthService {
  private readonly staffGroup = cognitoConfig.staffGroup;
  private readonly sessionReady = signal(false);
  private readonly authenticated = signal(false);
  private readonly staffMember = signal(false);
  private readonly userEmail = signal<string | null>(null);
  private readonly accessTokenValue = signal<string | null>(null);

  readonly isSessionReady = computed(() => this.sessionReady());
  readonly isAuthenticated = computed(() => this.authenticated());
  readonly isStaff = computed(() => this.staffMember());
  readonly email = computed(() => this.userEmail());
  readonly accessToken = computed(() => this.accessTokenValue());

  async refreshSession(): Promise<void> {
    if (this.isE2eStaffBypass()) {
      this.accessTokenValue.set('e2e-staff-token');
      this.authenticated.set(true);
      this.staffMember.set(true);
      this.userEmail.set('e2e-staff@townofwiley.gov');
      this.sessionReady.set(true);
      return;
    }

    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString() ?? null;
      const idGroups = this.readGroupsFromToken(session.tokens?.idToken?.payload);
      const accessGroups = this.readGroupsFromToken(session.tokens?.accessToken?.payload);
      const groups = idGroups.length ? idGroups : accessGroups;
      const isStaff = groups.includes(this.staffGroup);

      this.accessTokenValue.set(accessToken);
      this.authenticated.set(Boolean(accessToken));
      this.staffMember.set(isStaff);

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
      this.accessTokenValue.set(null);
      this.authenticated.set(false);
      this.staffMember.set(false);
      this.userEmail.set(null);
    } finally {
      this.sessionReady.set(true);
    }
  }

  /** Starts staff sign-in; returns when a new temporary password must be set. */
  async beginStaffSignIn(input: StaffSignInInput): Promise<StaffSignInStep> {
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
    await this.assertStaffSession();
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
    await this.assertStaffSession();
  }

  /** @deprecated Prefer beginStaffSignIn for UI flows that handle password challenges. */
  async signInStaff(input: StaffSignInInput): Promise<void> {
    const step = await this.beginStaffSignIn(input);
    if (step === 'newPasswordRequired') {
      throw new Error(
        'Your account requires a new password. Enter your temporary password, then set a new password when prompted.',
      );
    }
  }

  async signOutStaff(): Promise<void> {
    await signOut();
    await this.refreshSession();
  }

  private async assertStaffSession(): Promise<void> {
    await this.refreshSession();
    if (!this.isStaff()) {
      await signOut();
      throw new Error('This account is not authorized for staff admin access.');
    }
  }

  private isE2eStaffBypass(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG__?: AppRuntimeConfig;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: AppRuntimeConfig;
    };
    const override = runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.e2e?.staffAuth === true;
    const base = runtimeWindow.__TOW_RUNTIME_CONFIG__?.e2e?.staffAuth === true;
    return override || base;
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
}
