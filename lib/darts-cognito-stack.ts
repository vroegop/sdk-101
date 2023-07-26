import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { UserPool, UserPoolClient, UserPoolEmail } from 'aws-cdk-lib/aws-cognito';

export class DartsCognitoStack extends Stack {
  public cognitoUserPool: UserPool;
  public cognitoUserPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The cognitoPool is a 'database' that holds the user registration data
    this.cognitoUserPool = new UserPool(this, 'cognitoUserPool', {
      userPoolName: 'userPool',
      selfSignUpEnabled: true,
      // If you add email as alias, the username can no longer be in email address format because the email address will become an alias.
      signInAliases: {
        username: true
      },
      // This doesn't set verified true, but sends an email with the verification code automatically.
      autoVerify: {
        email: true
      },
      // This is scary, dev only! You will delete your users on deletion. This is required for RemovalPolicy.DESTROY
      deletionProtection: false,
      // Important setting!
      signInCaseSensitive: false,
      email: UserPoolEmail.withCognito()
    });

    // The cognitoPoolClient is an internal api that we can access via API Gateway to use the CognitoPool
    this.cognitoUserPoolClient = new UserPoolClient(this, 'cognitoUserPoolClient', {
      userPoolClientName: 'userPoolClient',
      userPool: this.cognitoUserPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        custom: false,
        userSrp: false
      },
    });

    // Destroy everything on stack removal (cognito pool requires extra removal settings, see construct)
    this.cognitoUserPool.applyRemovalPolicy(RemovalPolicy.DESTROY);
    this.cognitoUserPoolClient.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // This is a value that must be added to the front-end project to make life easier
    const userPoolClientId = new CfnOutput(this, 'User Pool Client ID', { value: this.cognitoUserPoolClient.userPoolClientId });
  }
}
