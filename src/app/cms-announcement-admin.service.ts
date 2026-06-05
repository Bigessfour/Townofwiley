import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';

interface CreateAnnouncementResult {
  createAnnouncement?: {
    id: string;
    title: string;
  } | null;
}

const CREATE_ANNOUNCEMENT_MUTATION = /* GraphQL */ `
  mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
    createAnnouncement(input: $input) {
      id
      title
    }
  }
`;

const client = generateClient();

export interface AnnouncementInput {
  title: string;
  detail: string;
  date?: string;
  announcementKind?: string;
  attachmentKey?: string;
  priority?: number;
  imageUrl?: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class CmsAnnouncementAdminService {
  async createAnnouncement(input: AnnouncementInput): Promise<string> {
    const response = (await client.graphql({
      query: CREATE_ANNOUNCEMENT_MUTATION,
      variables: { input },
      authMode: await this.resolveStaffAuthMode(),
    })) as GraphQLResult<CreateAnnouncementResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    const id = response.data?.createAnnouncement?.id;
    if (!id) {
      throw new Error('Announcement record was not created.');
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
