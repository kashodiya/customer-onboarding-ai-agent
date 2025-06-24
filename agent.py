import json
import os
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

# Initialize Bedrock client
bedrock = boto3.client('bedrock-runtime', region_name="us-east-1")


def ask_bedrock(prompt):
    """Send the prompt to Bedrock LLM and return the response."""
    try:
        # Set the model ID, e.g., Claude 3 Haiku.
        model_id = "anthropic.claude-3-haiku-20240307-v1:0"

        # Start a conversation with the user message.
        conversation = [
            {
                "role": "user",
                "content": [{"text": prompt}],
            }
        ]

        response = bedrock.converse(
            modelId=model_id,
            messages=conversation,
            inferenceConfig={"maxTokens": 4096, "temperature": 0.5, "topP": 0.9},
        )

        # Extract and print the response text.
        answer = response["output"]["message"]["content"][0]["text"]

        # response = bedrock.invoke_model(
        #     modelId='amazon.titan-text-express-v1',
        #     body=json.dumps({'inputText': prompt})
        # )
        # response_body = json.loads(response['body'].read())
        # answer = response_body.get('result')



        print(f"Received answer from Bedrock: {answer[:100]}...")  # Print only the first 100 characters for brevity
        return answer
    except NoCredentialsError:
        print("Credentials not available")
    except PartialCredentialsError:
        print("Incomplete credentials provided")
    except Exception as e:
        print(f"An error occurred: {e}")


def main():
    prompt = "What is the capital of France?"
    answer = ask_bedrock(prompt)

if __name__ == "__main__":
    main()