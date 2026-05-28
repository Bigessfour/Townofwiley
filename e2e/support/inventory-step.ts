import { test } from '@playwright/test';

/** Traceable inventory step with console logging for MCP / CI logs. */
export async function inventoryStep<T>(label: string, action: () => Promise<T>): Promise<T> {
  return test.step(label, async () => {
    console.log(`[inventory] ${label}`);
    return action();
  });
}
