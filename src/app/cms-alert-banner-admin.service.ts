import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';

interface CreateAlertBannerResult {
  createAlertBanner?: {
    id: string;
    title: string;
  } | null;
}

const CREATE_ALERT_BANNER_MUTATION = /* GraphQL */ `
  mutation CreateAlertBanner($input: CreateAlertBannerInput!) {
    createAlertBanner(input: $input) {
      id
      title
      enabled
    }
  }
`;

const client = generateClient();

export interface AlertBannerInput {
  enabled: boolean;
  label: string;
  title: string;
  detail: string;
  linkLabel?: string;
  linkHref?: string;
}

/**
 * @deprecated Use {@link CmsGenericModelAdminService} from the clerk record editor instead.
 */
@Injectable({
  providedIn: 'root',
})
export class CmsAlertBannerAdminService {
  async createAlertBanner(input: AlertBannerInput): Promise<string> {
    const response = (await client.graphql({
      query: CREATE_ALERT_BANNER_MUTATION,
      variables: { input },
      authMode: await this.resolveStaffAuthMode(),
    })) as GraphQLResult<CreateAlertBannerResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    const id = response.data?.createAlertBanner?.id;
    if (!id) {
      throw new Error('AlertBanner record was not created.');
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
