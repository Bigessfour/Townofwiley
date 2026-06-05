import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';

interface CreateSiteSettingsResult {
  createSiteSettings?: {
    id: string;
    townName: string;
  } | null;
}

const CREATE_SITE_SETTINGS_MUTATION = /* GraphQL */ `
  mutation CreateSiteSettings($input: CreateSiteSettingsInput!) {
    createSiteSettings(input: $input) {
      id
      townName
    }
  }
`;

const client = generateClient();

export interface SiteSettingsInput {
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
  async createSiteSettings(input: SiteSettingsInput): Promise<string> {
    const response = (await client.graphql({
      query: CREATE_SITE_SETTINGS_MUTATION,
      variables: { input },
      authMode: await this.resolveStaffAuthMode(),
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
