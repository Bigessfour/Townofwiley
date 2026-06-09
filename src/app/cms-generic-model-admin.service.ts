import { inject, Injectable } from '@angular/core';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';
import { StaffAuthService } from './auth/staff-auth.service';
import {
  CMS_MODEL_LIST_FIELDS,
  cmsCreateInputType,
  cmsCreateMutationField,
  cmsDeleteInputType,
  cmsDeleteMutationField,
  cmsListQueryField,
  cmsUpdateInputType,
  cmsUpdateMutationField,
} from './cms-admin/cms-model-admin-fields';
import {
  assertCmsAdminModel,
  type CmsAdminModel,
  type CmsAdminOperation,
  requireAuthenticatedAdmin,
  toClerkFriendlyGraphqlError,
} from './cms-admin/cms-staff-appsync-auth';
import { LoggingService } from './logging.service';

const client = generateClient();

@Injectable({
  providedIn: 'root',
})
export class CmsGenericModelAdminService {
  private readonly staffAuth = inject(StaffAuthService);
  private readonly logging = inject(LoggingService);

  async isAuthenticatedAdmin(): Promise<boolean> {
    await this.staffAuth.refreshSession();
    return this.staffAuth.isStaff();
  }

  async listRecords(model: string, limit = 50): Promise<Record<string, unknown>[]> {
    assertCmsAdminModel(model);
    const fields = CMS_MODEL_LIST_FIELDS[model];
    if (!fields?.length) {
      return [];
    }

    await requireAuthenticatedAdmin(this.staffAuth);
    if (this.staffAuth.playwrightStaffBypassActive()) {
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
      const response = await this.executeStaffGraphql<
        Record<string, { items?: Record<string, unknown>[] }>
      >('list', model, query, { limit });

      return (response.data?.[listField]?.items ?? []).filter(
        (item): item is Record<string, unknown> => item != null && typeof item === 'object',
      );
    } catch (error: unknown) {
      this.logAdminFailure('list', model, error);
      throw new Error(toClerkFriendlyGraphqlError(error, 'list', model), { cause: error });
    }
  }

  async createModel(model: string, input: Record<string, unknown>): Promise<string> {
    return this.createRecord(model, input);
  }

  async createRecord(model: string, input: Record<string, unknown>): Promise<string> {
    assertCmsAdminModel(model);
    const sanitized = this.sanitizeMutationInput(model, input, 'create');
    const createField = cmsCreateMutationField(model);
    const inputType = cmsCreateInputType(model);
    const query = /* GraphQL */ `
      mutation Create${model}Record($input: ${inputType}!) {
        ${createField}(input: $input) {
          id
        }
      }
    `;

    try {
      const response = await this.executeStaffGraphql<Record<string, { id?: string }>>(
        'create',
        model,
        query,
        { input: sanitized },
      );

      const id = response.data?.[createField]?.id;
      if (!id) {
        throw new Error(`${model} record was not created.`);
      }

      this.logAdminSuccess('create', model, id);
      return id;
    } catch (error: unknown) {
      this.logAdminFailure('create', model, error);
      throw new Error(toClerkFriendlyGraphqlError(error, 'create', model), { cause: error });
    }
  }

  async updateModel(model: string, input: Record<string, unknown>): Promise<string> {
    return this.updateRecord(model, input);
  }

  async updateRecord(model: string, input: Record<string, unknown>): Promise<string> {
    assertCmsAdminModel(model);
    const sanitized = this.sanitizeMutationInput(model, input, 'update');
    const id = sanitized['id'];
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

    try {
      const response = await this.executeStaffGraphql<Record<string, { id?: string }>>(
        'update',
        model,
        query,
        { input: sanitized },
      );

      const updatedId = response.data?.[updateField]?.id;
      if (!updatedId) {
        throw new Error(`${model} record was not updated.`);
      }

      this.logAdminSuccess('update', model, updatedId);
      return updatedId;
    } catch (error: unknown) {
      this.logAdminFailure('update', model, error);
      throw new Error(toClerkFriendlyGraphqlError(error, 'update', model), { cause: error });
    }
  }

  async deleteModel(model: string, id: string): Promise<string> {
    return this.deleteRecord(model, id);
  }

  async deleteRecord(model: string, id: string): Promise<string> {
    assertCmsAdminModel(model);
    const trimmedId = id.trim();
    if (!trimmedId) {
      throw new Error('Record id is required to delete.');
    }

    const deleteField = cmsDeleteMutationField(model);
    const inputType = cmsDeleteInputType(model);
    const query = /* GraphQL */ `
      mutation Delete${model}Record($input: ${inputType}!) {
        ${deleteField}(input: $input) {
          id
        }
      }
    `;

    try {
      const response = await this.executeStaffGraphql<Record<string, { id?: string }>>(
        'delete',
        model,
        query,
        { input: { id: trimmedId } },
      );

      const deletedId = response.data?.[deleteField]?.id;
      if (!deletedId) {
        throw new Error(`${model} record was not deleted.`);
      }

      this.logAdminSuccess('delete', model, deletedId);
      return deletedId;
    } catch (error: unknown) {
      this.logAdminFailure('delete', model, error);
      throw new Error(toClerkFriendlyGraphqlError(error, 'delete', model), { cause: error });
    }
  }

  private async executeStaffGraphql<TData>(
    operation: CmsAdminOperation,
    model: CmsAdminModel,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<GraphQLResult<TData>> {
    await requireAuthenticatedAdmin(this.staffAuth);

    const response = (await client.graphql({
      query,
      variables,
      authMode: 'userPool',
    } as Parameters<typeof client.graphql>[0])) as GraphQLResult<TData>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    return response;
  }

  private sanitizeMutationInput(
    model: CmsAdminModel,
    input: Record<string, unknown>,
    mode: 'create' | 'update',
  ): Record<string, unknown> {
    const allowed = new Set(CMS_MODEL_LIST_FIELDS[model]);
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (key === 'id') {
        if (mode === 'update' && typeof value === 'string' && value.trim()) {
          sanitized['id'] = value.trim();
        }
        continue;
      }

      if (!allowed.has(key)) {
        continue;
      }

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          sanitized[key] = trimmed;
        }
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  private logAdminSuccess(operation: CmsAdminOperation, model: string, recordId: string): void {
    this.logging.log('info', `CMS admin ${operation} succeeded`, {
      eventType: `cms_admin_${operation}_success`,
      model,
      recordId,
    });
  }

  private logAdminFailure(operation: CmsAdminOperation, model: string, error: unknown): void {
    this.logging.log('warn', `CMS admin ${operation} failed`, {
      eventType: `cms_admin_${operation}_failed`,
      model,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
