import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';

interface CreateEventResult {
  createEvent?: {
    id: string;
    title: string;
  } | null;
}

const CREATE_EVENT_MUTATION = /* GraphQL */ `
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
    }
  }
`;

const client = generateClient();

export interface EventInput {
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO datetime
  end?: string;
  active: boolean;
}

/**
 * @deprecated Use {@link CmsGenericModelAdminService} from the clerk record editor instead.
 */
@Injectable({
  providedIn: 'root',
})
export class CmsEventAdminService {
  async createEvent(input: EventInput): Promise<string> {
    const response = (await client.graphql({
      query: CREATE_EVENT_MUTATION,
      variables: { input },
      authMode: await this.resolveStaffAuthMode(),
    })) as GraphQLResult<CreateEventResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    const id = response.data?.createEvent?.id;
    if (!id) {
      throw new Error('Event record was not created.');
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
