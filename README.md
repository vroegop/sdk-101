# About this app

## Useful tools

[🌍 AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

[🌍 NODE.JS](https://nodejs.org/en/download)

## Useful commands

* `npm i -g aws-cdk`   install the AWS CDK CLI
* `npm run build`      compile typescript to js
* `npm run test`       perform the jest unit tests

--

* `aws configure sso`  configure SSO session and config
* `aws sso login --profile default`      login to AWS using the SSO (you may need `--profile {profileName}`)

--

* `cdk deploy --profile default`         deploy this stack to your default AWS account/region
* `cdk diff`           compare deployed stack with current state
* `cdk synth`          emits the synthesized CloudFormation template

--

* `npx live-server`    use this command in the `./presentation` folder to see the conference presentation

# Author: Randy Vroegop, 2023
