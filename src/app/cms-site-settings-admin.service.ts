import { inject, Injectable } from '@angular/core';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';
import { StaffAuthService } from './auth/staff-auth.service';
import { CMS_MODEL_LIST_FIELDS } from './cms-admin/cms-model-admin-fields';
import { requireAuthenticatedAdmin } from './cms-admin/cms-staff-appsync-auth';

type SiteSettingsRecord = Record<string, unknown> & {
  id: string;
  townName: string;
};

interface CreateSiteSettingsResult {
  createSiteSettings?: SiteSettingsRecord | null;
}

interface UpdateSiteSettingsResult {
  updateSiteSettings?: SiteSettingsRecord | null;
}

interface ListSiteSettingsResult {
  listSiteSettings?: {
    items?: SiteSettingsRecord[];
  } | null;
}

const SITE_SETTINGS_FIELDS = CMS_MODEL_LIST_FIELDS['SiteSettings'].join('\n');

const CREATE_SITE_SETTINGS_MUTATION = /* GraphQL */ `
  mutation CreateSiteSettings($input: CreateSiteSettingsInput!) {
    createSiteSettings(input: $input) {
      id
      townName
    }
  }
`;

const UPDATE_SITE_SETTINGS_MUTATION = /* GraphQL */ `
  mutation UpdateSiteSettings($input: UpdateSiteSettingsInput!) {
    updateSiteSettings(input: $input) {
      id
      townName
    }
  }
`;

const LIST_SITE_SETTINGS_QUERY = /* GraphQL */ `
  query ListSiteSettingsForAdmin($limit: Int) {
    listSiteSettings(limit: $limit) {
      items {
        ${SITE_SETTINGS_FIELDS}
      }
    }
  }
`;

const client = generateClient();

export interface SiteSettingsInput {
  id?: string;
  townName: string;
  officeHours?: string;
  address?: string;
  phone?: string;
  email?: string;
  pageTitle?: string;
  heroEyebrow?: string;
  heroStatus?: string;
  heroTitle?: string;
  heroMessage?: string;
  heroSubtext?: string;
  heroImageUrl?: string;
  welcomeLabel?: string;
  welcomeHeading?: string;
  welcomeBody?: string;
  welcomeCaption?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CmsSiteSettingsAdminService {
  private readonly staffAuth = inject(StaffAuthService);

  async listSiteSettings(limit = 1): Promise<Record<string, unknown>[]> {
    await requireAuthenticatedAdmin(this.staffAuth);
    const response = (await client.graphql({
      query: LIST_SITE_SETTINGS_QUERY,
      variables: { limit },
      authMode: 'userPool',
    })) as GraphQLResult<ListSiteSettingsResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    return (response.data?.listSiteSettings?.items ?? []).filter(
      (item): item is SiteSettingsRecord =>
        item != null && typeof item === 'object' && typeof item.id === 'string',
    );
  }

  async createSiteSettings(input: SiteSettingsInput): Promise<string> {
    await requireAuthenticatedAdmin(this.staffAuth);
    const response = (await client.graphql({
      query: CREATE_SITE_SETTINGS_MUTATION,
      variables: { input },
      authMode: 'userPool',
    })) as GraphQLResult<CreateSiteSettingsResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    const id = response.data?.createSiteSettings?.id;
    if (!id) {
      throw new Error('SiteSettings record was not created.');
    }

    return id;
  }

  async updateSiteSettings(input: SiteSettingsInput & { id: string }): Promise<string> {
    await requireAuthenticatedAdmin(this.staffAuth);
    const response = (await client.graphql({
      query: UPDATE_SITE_SETTINGS_MUTATION,
      variables: { input },
      authMode: 'userPool',
    })) as GraphQLResult<UpdateSiteSettingsResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    const id = response.data?.updateSiteSettings?.id;
    if (!id) {
      throw new Error('SiteSettings record was not updated.');
    }

    return id;
  }

  async saveSiteSettings(input: SiteSettingsInput): Promise<string> {
    if (input.id) {
      return this.updateSiteSettings({ ...input, id: input.id });
    }
    return this.createSiteSettings(input);
  }
}
