import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-2_DmY7BCBIp',
      userPoolClientId: '2m6vp91m9938jpbg2efivr2p8k',
      identityPoolId: 'us-east-2:2c69cd53-7ed6-4032-9e65-b5492cd36e56',
    },
  },
  API: {
    GraphQL: {
      endpoint: 'https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql',
      defaultAuthMode: 'apiKey',
      apiKey: 'da2-dtpfsmrmtfbqxfwspnp3ep3fcq',
    },
  },
  Storage: {
    S3: {
      bucket: 'townofwiley-documents-storage',
      region: 'us-east-2',
    },
  },
});