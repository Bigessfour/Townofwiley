/** Live Gen 1 AppSync API (only deployed CMS API in production as of 2026). */
export const LIVE_APPSYNC_API_ID = 'j7b2x3sh7rcezekekkxxiak7hi';

export const DEFAULT_APPSYNC_REGION = 'us-east-2';

/**
 * AWS AppSync console → Queries tab for the live CMS API.
 * Used by Advanced (IT) links only — clerk task cards use in-app forms.
 */
export function buildAppSyncQueriesConsoleUrl(
  region: string = DEFAULT_APPSYNC_REGION,
  apiId: string = LIVE_APPSYNC_API_ID,
): string {
  const trimmedRegion = region.trim() || DEFAULT_APPSYNC_REGION;
  const trimmedApiId = apiId.trim() || LIVE_APPSYNC_API_ID;
  return `https://${trimmedRegion}.console.aws.amazon.com/appsync/home?region=${trimmedRegion}#/${trimmedApiId}/v1/queries`;
}
