import { defineStorage } from '@aws-amplify/backend';

/** Public document uploads (newsletters, meeting files). */
export const storage = defineStorage({
  name: 'documents',
  access: (allow) => ({
    'documents/*': [
      allow.guest.to(['read']),
      allow.groups(['Staff']).to(['read', 'write', 'delete']),
    ],
  }),
});
