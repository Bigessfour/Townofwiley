/** Clerk/staff admin login — English only (public site stays bilingual). */
export const ADMIN_LOGIN_COPY = {
  kicker: 'Staff access',
  title: 'Sign in — Town admin',
  body: 'Use the Town staff account IT gave you (email and password). The sign-in form is below these instructions.',
  howToHeading: 'How to sign in',
  howToSteps: [
    'Use a current browser at townofwiley.gov/admin/login (bookmark this page).',
    'Enter your Town staff email and password in the form below.',
    'First-time sign-in: use the temporary password from IT, then set a new password when prompted (do not use Forgot password until that step is done).',
    'Forgot your password after first sign-in? Use "Forgot password?" to receive a code from noreply@townofwiley.gov.',
    'After sign-in, open townofwiley.gov/admin and use the task buttons (Edit content, See on website).',
  ],
  helpText:
    'If you do not have an account or the reset email does not arrive, call Town Hall at (719) 829-4974 so IT can help.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  signInLabel: 'Sign in',
  signingInLabel: 'Signing in…',
  signInFormLabel: 'Staff sign-in',
  forgotPasswordLink: 'Forgot password?',
  forgotPasswordTitle: 'Reset password',
  forgotPasswordBody:
    'Enter your Town staff email. After your first sign-in is complete, we email a verification code from noreply@townofwiley.gov so you can choose a new password.',
  sendResetCodeLabel: 'Send reset code',
  sendingResetCodeLabel: 'Sending code…',
  forgotPasswordFormLabel: 'Password reset request',
  resetCodeSent:
    'If a staff account exists and has completed first-time sign-in, you will receive a code from noreply@townofwiley.gov within a few minutes. Check spam. If you never finished first-time setup, sign in with your temporary password from IT instead.',
  confirmResetTitle: 'Enter code and new password',
  confirmResetBody:
    'Enter the code from your email and choose a new password (at least 8 characters).',
  resetCodeLabel: 'Verification code',
  confirmResetFormLabel: 'Confirm password reset',
  saveNewPasswordLabel: 'Save new password',
  savingPasswordLabel: 'Saving password…',
  resetComplete: 'Your password was updated. Sign in with your email and new password.',
  backToSignIn: 'Back to sign in',
  newPasswordFormLabel: 'Set new password',
  newPasswordHint:
    'Your account requires a new password. Use the temporary password IT sent you, then choose a new one below.',
  newPasswordLabel: 'New password',
  confirmPasswordLabel: 'Confirm password',
  passwordMismatch: 'Passwords do not match.',
  setPasswordLabel: 'Save password and continue',
  returnHome: 'Return to public site',
  adminHubLabel: 'Go to admin hub (requires sign-in)',
  authError:
    'Sign-in could not be completed. Check your email, temporary password, or new password.',
  resetError:
    'Password reset could not be completed. Check your email, verification code, and that the new password is at least 8 characters.',
} as const;
