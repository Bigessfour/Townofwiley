/** User-facing message for Cognito / Amplify Auth failures (staff login). */
export function readStaffAuthErrorMessage(error: unknown, fallback: string): string {
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
