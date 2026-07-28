export type CommunityEventCategory =
  | 'yard_sale'
  | 'bake_sale'
  | 'car_wash'
  | 'school'
  | 'fundraiser'
  | 'gathering'
  | 'festival'
  | 'sports'
  | 'other';

export type CommunityEventStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface CommunityEvent {
  eventId: string;
  title: string;
  description: string;
  category: CommunityEventCategory;
  location: string;
  startDateTime: string;
  endDateTime: string;
  organizerName?: string;
  socialLink?: string;
  audience?: string;
  cost?: string;
  accessibilityNotes?: string;
}

/** Admin API view — may include submitter PII. */
export interface AdminCommunityEvent extends CommunityEvent {
  status: CommunityEventStatus;
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  language?: 'en' | 'es';
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface CommunityEventSubmission {
  title: string;
  description: string;
  location: string;
  category: CommunityEventCategory;
  submitterName: string;
  submitterPhone: string;
  submitterEmail: string;
  startDateTime: string;
  endDateTime?: string;
  organizerName?: string;
  socialLink?: string;
  audience?: string;
  cost?: string;
  accessibilityNotes?: string;
  language: 'en' | 'es';
  /** Honeypot — must stay empty */
  website?: string;
}

export const COMMUNITY_EVENT_CATEGORIES: readonly CommunityEventCategory[] = [
  'yard_sale',
  'bake_sale',
  'car_wash',
  'school',
  'fundraiser',
  'gathering',
  'festival',
  'sports',
  'other',
] as const;

export const COMMUNITY_CATEGORY_ICONS: Record<CommunityEventCategory, string> = {
  yard_sale: 'pi pi-home',
  bake_sale: 'pi pi-shopping-bag',
  car_wash: 'pi pi-car',
  school: 'pi pi-book',
  fundraiser: 'pi pi-heart',
  gathering: 'pi pi-users',
  festival: 'pi pi-star',
  sports: 'pi pi-trophy',
  other: 'pi pi-calendar',
};
