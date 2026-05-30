import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
});

/**
 * After `amplify gen2-migration refactor` on production, uncomment and deploy once:
 *
 * import { postRefactor } from '@aws-amplify/backend-cli/gen2-migration';
 * postRefactor(backend);
 */

export default backend;
