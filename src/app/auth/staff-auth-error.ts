/** User-facing message for Cognito / Amplify Auth failures (staff login). */
export function readStaffAuthErrorMessage(error: unknown, fallback: string): string {
  const mapped = mapStaffAuthError(error);
  if (mapped) {
    return mapped;
  }

  if (error instanceof Error && error.message.trim()) {
    const name = error.name?.trim();
    if (name && name !== 'Error' && !error.message.includes(name)) {
      return `${name}: ${error.message}`;
    }
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message).trim();
    if (message) {
      return message;
    }
  }

  return fallback;
}

/** Password-reset specific guidance (ForgotPassword / ConfirmForgotPassword). */
export function readStaffPasswordResetErrorMessage(error: unknown, fallback: string): string {
  return readStaffAuthErrorMessage(error, fallback);
}

function mapStaffAuthError(error: unknown): string | null {
  const name = readErrorName(error).toLowerCase();
  const message = readErrorMessage(error).toLowerCase();

  if (
    message.includes('force_change_password') ||
    message.includes('cannot be reset in the current state') ||
    message.includes('current state')
  ) {
    return (
      'This account has not finished first-time setup yet. Sign in with the temporary password from IT ' +
      '(not Forgot password). You will be prompted to choose a new password. Call Town Hall at (719) 829-4974 if you need a new temporary password.'
    );
  }

  if (name.includes('codemismatch') || message.includes('invalid verification code')) {
    return 'That verification code is incorrect. Check the latest email from noreply@townofwiley.gov and try again.';
  }

  if (name.includes('expiredcode') || message.includes('expired')) {
    return 'That verification code expired. Request a new code from Forgot password? and use the newest email.';
  }

  if (name.includes('invalidpassword') || message.includes('password did not conform')) {
    return 'The new password does not meet Town requirements (at least 8 characters with upper, lower, number, and symbol).';
  }

  if (name.includes('limitexceeded') || message.includes('attempt limit exceeded')) {
    return 'Too many attempts. Wait a few minutes, then try again or call Town Hall at (719) 829-4974.';
  }

  if (
    name.includes('invalidparameter') &&
    (message.includes('no registered/verified email') || message.includes('verified email'))
  ) {
    return 'This account does not have a verified email for password recovery. Contact Town Hall so IT can verify your staff email in Cognito.';
  }

  return null;
}

function readErrorName(error: unknown): string {
  if (error instanceof Error && error.name) {
    return error.name;
  }
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name: unknown }).name);
  }
  return '';
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

/** True for expected Cognito sign-in failures (wrong password, etc.). */
export function isAmplifyAuthFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = error.name.toLowerCase();
  const message = error.message.toLowerCase();

  return (
    name.includes('auth') ||
    name.includes('notauthorized') ||
    name.includes('usernotfound') ||
    name.includes('password') ||
    message.includes('incorrect username or password') ||
    message.includes('password') ||
    message.includes('not authorized')
  );
}
