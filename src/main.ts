import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import { Vpc, InstanceType } from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as lambda from '@aws-cdk/aws-lambda';
import * as path from 'path';

export class MyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    })

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'Cluster', {
      vpc,
      version: eks.KubernetesVersion.V1_17,
      mastersRole: clusterAdmin,
      defaultCapacity: 1,
      defaultCapacityInstance: new InstanceType('t3.large')
    });

    const handler = new lambda.Function(this, 'Func', {
      handler: 'app.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions/ListPods/', 'fn')),
      environment: {
        CLUSTER_ENDPOINT: cluster.clusterEndpoint,
        CLUSTER_NAME: cluster.clusterName,
        CLUSTER_REGION: this.region,
      }
    })

    cluster.awsAuth.addMastersRole(handler.role!)

    new apigateway.LambdaRestApi(this, 'Api', { handler })

  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

new MyStack(app, 'my-stack-dev', { env: devEnv });
// new MyStack(app, 'my-stack-prod', { env: prodEnv });

app.synth();
