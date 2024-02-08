import json
import boto3
from datetime import datetime
import os


def lambda_handler(event, context):
    try:

        s3 = boto3.client('s3')
        data_dump = event['body']
        username = json.loads(data_dump)[0]['username']
        bucket_name = os.environ['BUCKET_NAME']
        object_key = os.environ['OBJECT_KEY']
        date = f"{datetime.now():%Y-%m-%d-%H-%M-%S}"

        s3.put_object(Body=data_dump, Bucket=bucket_name,
                      Key=f'{object_key}/{username}/scraper_{date}.json')

        return json.dumps({
            'status_code': 200,
            'message': 'success',
        })

    except Exception as e:

        return json.dumps({
            'status_code': 500,
            'message': 'failed',
            'error': e.__str__()
        })
