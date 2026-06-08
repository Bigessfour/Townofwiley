/**
 * Gen 1 (production) AppSync API ID for the CMS backend.
 * Source of truth: infrastructure/gen1-production-bindings.json + public/cms-inventory.json.
 */
export const PRODUCTION_APPSYNC_API_ID = 'j7b2x3sh7rcezekekkxxiak7hi';

export const DEFAULT_APPSYNC_REGION = 'us-east-2';

/**
 * AWS AppSync console → Queries tab for the CMS API.
 * Primary clerk path: use the in-app forms on /admin. IT may use the Queries tab for direct GQL.
 */
export function buildAppSyncQueriesConsoleUrl(
  region: string = DEFAULT_APPSYNC_REGION,
  apiId: string = PRODUCTION_APPSYNC_API_ID,
): string {
  const trimmedRegion = region.trim() || DEFAULT_APPSYNC_REGION;
  const trimmedApiId = apiId.trim() || PRODUCTION_APPSYNC_API_ID;
  return `https://${trimmedRegion}.console.aws.amazon.com/appsync/home?region=${trimmedRegion}#/${trimmedApiId}/v1/queries`;
}