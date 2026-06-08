/**
 * Gen 2 (current production) AppSync API ID for the CMS backend.
 * Source of truth cross-ref: infrastructure/gen2-production-bindings.json + public/gen2-cms-inventory.json.
 * Public reads and staff mutations target this (x7poeh... / fpm2ifk... endpoint).
 */
export const GEN2_APPSYNC_API_ID = 'x7poehudqvamneqni5s6e2cjxy';

/** Gen 1 legacy AppSync API ID (post-migration decommission candidate; retained for fallbacks/docs only). */
export const GEN1_APPSYNC_API_ID_LEGACY = 'j7b2x3sh7rcezekekkxxiak7hi';

export const DEFAULT_APPSYNC_REGION = 'us-east-2';

/**
 * AWS AppSync console → Queries tab for the CMS API.
 * Defaults to Gen 2 production (current live data). Pass GEN1_APPSYNC_API_ID_LEGACY explicitly only for legacy diagnostics.
 * Primary clerk path: use the in-app forms on /admin or the Data manager deep link.
 * Advanced/IT links may use the Queries tab for direct GQL.
 */
export function buildAppSyncQueriesConsoleUrl(
  region: string = DEFAULT_APPSYNC_REGION,
  apiId: string = GEN2_APPSYNC_API_ID,
): string {
  const trimmedRegion = region.trim() || DEFAULT_APPSYNC_REGION;
  const trimmedApiId = apiId.trim() || GEN2_APPSYNC_API_ID;
  return `https://${trimmedRegion}.console.aws.amazon.com/appsync/home?region=${trimmedRegion}#/${trimmedApiId}/v1/queries`;
}
