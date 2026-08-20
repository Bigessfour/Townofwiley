import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AmplifyGraphqlApi,
  AmplifyGraphqlDefinition,
} from '@aws-amplify/graphql-api-construct';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

const stackDir = path.dirname(fileURLToPath(import.meta.url));

export interface CmsStackProps extends cdk.StackProps {
  /** Cognito hosted UI prefix (global unique). Personal account already owns townofwiley-staff. */
  cognitoDomainPrefix: string;
}

/**
 * Staff Cognito + Amplify GraphQL (AppSync/Dynamo) + documents S3 for /admin CMS.
 * Uses Amplify GraphQL transformer via CDK — not Amplify Hosting / Gen 1 CLI.
 */
export class CmsStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPoolId: string;
  public readonly documentsBucket: s3.Bucket;
  public readonly graphqlApi: AmplifyGraphqlApi;

  constructor(scope: Construct, id: string, props: CmsStackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, 'StaffUserPool', {
      userPoolName: 'Townofwiley-staff',
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },
      mfa: cognito.Mfa.OFF,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new cognito.CfnUserPoolGroup(this, 'StaffGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Staff',
      description: 'Town of Wiley staff CMS (/admin)',
      precedence: 0,
    });

    this.userPoolClient = this.userPool.addClient('StaffWebClient', {
      userPoolClientName: 'townofwiley-staff-web',
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN,
        ],
        callbackUrls: [
          'https://townofwiley.gov/admin/login',
          'https://www.townofwiley.gov/admin/login',
          'http://localhost:4200/admin/login',
        ],
        logoutUrls: [
          'https://townofwiley.gov/admin',
          'https://www.townofwiley.gov/admin',
          'http://localhost:4200/admin',
        ],
      },
      preventUserExistenceErrors: true,
    });

    this.userPool.addDomain('StaffHostedUi', {
      cognitoDomain: { domainPrefix: props.cognitoDomainPrefix },
    });

    const identityPool = new cognito.CfnIdentityPool(this, 'StaffIdentityPool', {
      identityPoolName: 'TownofwileyStaffIdentity',
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });
    this.identityPoolId = identityPool.ref;

    const authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      roleName: `tow-cms-auth-role-${cdk.Aws.ACCOUNT_ID}`,
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    const unauthenticatedRole = new iam.Role(this, 'UnauthenticatedRole', {
      roleName: `tow-cms-unauth-role-${cdk.Aws.ACCOUNT_ID}`,
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
      roleMappings: {
        cognitoProvider: {
          type: 'Token',
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`,
        },
      },
    });

    this.documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      bucketName: `townofwiley-documents-storage-${cdk.Aws.ACCOUNT_ID}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Amplify Storage-style paths used by Amplify JS Storage + legacy keys under public/
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        resources: [
          this.documentsBucket.arnForObjects('public/*'),
          this.documentsBucket.arnForObjects('protected/${cognito-identity.amazonaws.com:sub}/*'),
          this.documentsBucket.arnForObjects('private/${cognito-identity.amazonaws.com:sub}/*'),
        ],
      }),
    );
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [this.documentsBucket.bucketArn],
        conditions: {
          StringLike: {
            's3:prefix': [
              'public/',
              'public/*',
              'protected/${cognito-identity.amazonaws.com:sub}/',
              'protected/${cognito-identity.amazonaws.com:sub}/*',
              'private/${cognito-identity.amazonaws.com:sub}/',
              'private/${cognito-identity.amazonaws.com:sub}/*',
            ],
          },
        },
      }),
    );
    unauthenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.documentsBucket.arnForObjects('public/*')],
      }),
    );
    unauthenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: [this.documentsBucket.bucketArn],
        conditions: {
          StringLike: { 's3:prefix': ['public/', 'public/*'] },
        },
      }),
    );

    this.graphqlApi = new AmplifyGraphqlApi(this, 'CmsApi', {
      apiName: 'townofwiley-cms',
      definition: AmplifyGraphqlDefinition.fromFiles(
        path.join(stackDir, '..', 'schema', 'cms.graphql'),
      ),
      authorizationModes: {
        defaultAuthorizationMode: 'API_KEY',
        apiKeyConfig: {
          description: 'Public site CMS reads',
          expires: cdk.Duration.days(365),
        },
        userPoolConfig: {
          userPool: this.userPool,
        },
        identityPoolConfig: {
          identityPoolId: identityPool.ref,
          authenticatedUserRole: authenticatedRole,
          unauthenticatedUserRole: unauthenticatedRole,
        },
      },
    });

    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'IdentityPoolId', { value: identityPool.ref });
    new cdk.CfnOutput(this, 'HostedUiDomain', {
      value: `${props.cognitoDomainPrefix}.auth.${this.region}.amazoncognito.com`,
    });
    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: this.documentsBucket.bucketName,
    });
    new cdk.CfnOutput(this, 'AppSyncApiId', {
      value: this.graphqlApi.apiId,
    });
    new cdk.CfnOutput(this, 'GraphQLEndpoint', {
      value: this.graphqlApi.graphqlUrl,
    });
    new cdk.CfnOutput(this, 'GraphQLApiKey', {
      value: this.graphqlApi.apiKey ?? '',
      description: 'Public AppSync API key (also rotate via AppSync console)',
    });
  }
}
