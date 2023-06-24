# Welcome to Cloud101

## Useful tools

[🌍 AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

[🌍 NODE.JS](https://nodejs.org/en/download)

## Useful commands

* `npm i -g aws-cdk`   install the AWS CDK CLI
* `npm run build`      compile typescript to js
* `npm run test`       perform the jest unit tests

--

* `aws configure sso`  configure SSO session and config
* `aws sso login`      login to AWS using the SSO (you may need `--profile {profileName}`)

--

* `cdk deploy`         deploy this stack to your default AWS account/region
* `cdk diff`           compare deployed stack with current state
* `cdk synth`          emits the synthesized CloudFormation template

--

* `npx live-server`    use this command in the `./slides` folder to see the presentation

## Good to know

The branch `cloud-101` is the entrypoint for your journey if you are new to most (cdk or AWS) stuff.

> Note that by entrypoint I mean this contains good examples and a useful slidedeck which you can follow.
> The slidedeck will guide you through the cloud journey and tell you where to begin. The stack in this branch is to host the 
> slidedeck using HTTPS via a CloudFront distribution and the stack is simple but a little too complicated for someone completely new.

If you want to deploy the `cloud-101` branch to AWS using CDK you need to do a few things:

* Make sure you're logged in to the AWS CLI
* Make sure you have a AWS account that can use CDK and create the following resources (least privilege or have admin access):
  * CloudFront distributions
  * S3 Buckets
  * Lambda's
  * Alter Route53 records
  * Use ACM Certificates
* You should create a Route53 hosted zone and replace the URL in the stack with the correct URL specified in your hosted zone
* You should create a ACM certificate and point to the right ARN in the stack
* You should update the account number in the bin/cdk-serverless-workshop.ts file to your (desired) account number

> Note: You can deploy this without a custom URL and a default SSL certificate by simply removing the
> HostedZone, Certificate and CNameRecord (and everything referencing those). You'll get a default
> CloudFront URL which also works (with SSL) but is a little less pretty 😉
