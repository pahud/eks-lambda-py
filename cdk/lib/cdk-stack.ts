import cdk = require('@aws-cdk/core');
import { Vpc, InstanceType } from '@aws-cdk/aws-ec2';
import iam = require('@aws-cdk/aws-iam');
import eks = require('@aws-cdk/aws-eks');
import lambda = require('@aws-cdk/aws-lambda');
import apigateway = require('@aws-cdk/aws-apigateway');
import path = require('path');

export class EksStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromLookup(this, 'VPC', {
      isDefault: true
    })

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'Cluster', {
      vpc,
      mastersRole: clusterAdmin,
      defaultCapacity: 1,
      defaultCapacityInstance: new InstanceType('t3.large')
    });

    const handler = new lambda.Function(this, 'Func', {
      handler: 'app.lambda_handler',
      runtime: lambda.Runtime.PYTHON_3_8,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions/ListPods/', 'fn')),
      environment: {
        CLUSTER_ENDPOINT: cluster.clusterEndpoint,
        CLUSTER_NAME: cluster.clusterName,
        CLUSTER_REGION: this.region,
      }
    })

    cluster.awsAuth.addMastersRole(handler.role!)

    new apigateway.LambdaRestApi(this, 'Api', {
      handler
    })
      
    }
}
