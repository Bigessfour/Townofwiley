import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';

/**
 * Generic admin service for any CMS model using string GQL (no generated types dependency).
 * Leverages cms-model-inventory for known models.
 * Provides list + create for clerk-friendly in-app CRUD without going to AppSync console.
 * For full edit/delete, extend with update${Model} / delete${Model} mutations + id.
 */
const client = generateClient();

@Injectable({
  providedIn: 'root',
})
export class CmsGenericModelAdminService {
  async listModel(model: string, limit = 25): Promise<unknown[]> {
    const listField = `list${model}s`;
    const query = /* GraphQL */ `
      query List${model}s($limit: Int) {
        ${listField}(limit: $limit) {
          items {
            id
          }
        }
      }
    `;
    try {
      const response = (await client.graphql({
        query,
        variables: { limit },
        authMode: await this.resolveStaffAuthMode(),
      })) as GraphQLResult<Record<string, { items?: unknown[] }>>;
      if (response.errors?.length) {
        throw new Error(
          response.errors.map((e: { message?: string | null }) => e.message || '').join(' '),
        );
      }
      return (response.data?.[listField]?.items ?? []) as unknown[];
    } catch (e: unknown) {
      // Fallback empty on error (e.g. model not exactly pluralized or no read auth in session)
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
      console.warn(`Generic list for ${model} failed (may need custom fields or auth):`, msg);
      return [];
    }
  }

  async createModel(model: string, input: Record<string, unknown>): Promise<string> {
    const createField = `create${model}`;
    const query = /* GraphQL */ `
      mutation Create${model}($input: Create${model}Input!) {
        ${createField}(input: $input) {
          id
        }
      }
    `;
    const response = (await client.graphql({
      query,
      variables: { input },
      authMode: await this.resolveStaffAuthMode(),
    })) as GraphQLResult<Record<string, { id?: string }>>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((m: string | undefined): m is string => Boolean(m))
          .join(' '),
      );
    }

    const id = response.data?.[createField]?.id;
    if (!id) {
      throw new Error(`${model} record was not created.`);
    }
    return id;
  }

  private async resolveStaffAuthMode(): Promise<'userPool' | 'iam'> {
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.accessToken) {
        return 'userPool';
      }
    } catch {
      // Fall back
    }
    return 'iam';
  }
}
