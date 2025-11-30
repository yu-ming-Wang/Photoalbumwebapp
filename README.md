
# Photo Album Web App

This is a code bundle for [Photo Album Web App](http://cc-hw3-website-taiwan-no1.s3-website-us-east-1.amazonaws.com/).

## AWS Cloudformation

Type these:

```bash
# Deploy
aws cloudformation deploy \
  --template-file cloudformation.yml \
  --stack-name cc-hw3smart-photo-album \
  --capabilities CAPABILITY_NAMED_IAM \

# Get the output
aws cloudformation describe-stacks \
  --stack-name cc-hw3smart-photo-album \
  --profile jonathan \
  --query "Stacks[0].Outputs" \
  --output table
```

It should show this:

```bash
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                                                DescribeStacks                                                                                |
+--------------------------------------------------+---------------------+-----------------------------------------------------------------------------------------------------+
|                    Description                   |      OutputKey      |                                             OutputValue                                             |
+--------------------------------------------------+---------------------+-----------------------------------------------------------------------------------------------------+
|  Base URL for the REST API (v1 stage)            |  ApiBaseUrl         |  https://th664yffg2.execute-api.us-east-1.amazonaws.com/v1                                          |
|  S3 bucket hosting the frontend                  |  FrontendBucketName |  cc-hw3smart-photo-album-nyu-tandon-csgy-cc-hw3-frontend                                            |
|  Public website URL for the photo album frontend |  FrontendWebsiteURL |  http://cc-hw3smart-photo-album-nyu-tandon-csgy-cc-hw3-frontend.s3-website-us-east-1.amazonaws.com  |
|  S3 bucket storing original photos               |  PhotosBucketName   |  cc-hw3smart-photo-album-nyu-tandon-csgy-cc-hw3-photos                                              |
+--------------------------------------------------+---------------------+-----------------------------------------------------------------------------------------------------+
```