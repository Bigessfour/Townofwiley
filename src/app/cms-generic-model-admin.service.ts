import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';
import {
  CMS_MODEL_LIST_FIELDS,
  cmsCreateInputType,
  cmsCreateMutationField,
  cmsListQueryField,
  cmsUpdateInputType,
  cmsUpdateMutationField,
} from './cms-admin/cms-model-admin-fields';

const client = generateClient();

@Injectable({
  providedIn: 'root',
})
export class CmsGenericModelAdminService {
  async listRecords(model: string, limit = 50): Promise<Record<string, unknown>[]> {
    const fields = CMS_MODEL_LIST_FIELDS[model];
    if (!fields?.length) {
      return [];
    }

    const listField = cmsListQueryField(model);
    const selection = fields.join('\n');
    const query = /* GraphQL */ `
      query List${model}Records($limit: Int) {
        ${listField}(limit: $limit) {
          items {
            ${selection}
          }
        }
      }
    `;

    try {
      const response = (await client.graphql({
        query,
        variables: { limit },
        authMode: await this.resolveStaffAuthMode(),
      })) as GraphQLResult<Record<string, { items?: Record<string, unknown>[] }>>;

      if (response.errors?.length) {
        throw new Error(
          response.errors.map((e: { message?: string | null }) => e.message || '').join(' '),
        );
      }

      return (response.data?.[listField]?.items ?? []).filter(
        (item): item is Record<string, unknown> => item != null && typeof item === 'object',
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
      console.warn(`List records for ${model} failed:`, msg);
      return [];
    }
  }

  async createModel(model: string, input: Record<string, unknown>): Promise<string> {
    const createField = cmsCreateMutationField(model);
    const inputType = cmsCreateInputType(model);
    const query = /* GraphQL */ `
      mutation Create${model}Record($input: ${inputType}!) {
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

  async updateModel(model: string, input: Record<string, unknown>): Promise<string> {
    const id = input['id'];
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('Record id is required to update.');
    }

    const updateField = cmsUpdateMutationField(model);
    const inputType = cmsUpdateInputType(model);
    const query = /* GraphQL */ `
      mutation Update${model}Record($input: ${inputType}!) {
        ${updateField}(input: $input) {
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

    const updatedId = response.data?.[updateField]?.id;
    if (!updatedId) {
      throw new Error(`${model} record was not updated.`);
    }
    return updatedId;
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