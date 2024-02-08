from flask import Flask, request, make_response
from flask_cors import CORS
import boto3

app = Flask(__name__)
CORS(app)
from aws.sagemaker.gnn.code.inference import LightGCN, model_fn, input_fn, output_fn, predict_fn

@app.route("/recommendation", methods=["POST"])
def reco():
    prediction = predict_fn(request.json, model_map)
    output = output_fn(prediction)
    res = make_response(output)
    res.headers['Content-Type'] = 'application/json'
    res.headers['Access-Control-Allow-Origin'] = '*'

    return res

if __name__ == "__main__":
    s3 = boto3.client('s3', 
                          aws_access_key_id='AKIA2Z2BTOGT36MIGFYG',
                          aws_secret_access_key='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',
                          region_name='us-east-2'
                      )
    model_map = model_fn(model_dir=None, s3=s3)
    app.run(host='0.0.0.0', port=8000)