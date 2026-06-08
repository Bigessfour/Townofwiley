import { defineAuth } from '@aws-amplify/backend';

/**
 * Staff CMS sign-in (email). Matches Gen 1 Townofwiley pool behavior for /admin/login.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['Staff'],
});
