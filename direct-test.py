from langchain_aws import ChatBedrock
from langchain.schema import HumanMessage
from dotenv import load_dotenv
import os

def main():
    # Load environment variables from .env file
    load_dotenv()

    # Ensure AWS credentials are set in the environment variables
    aws_region = os.getenv('AWS_REGION')  # e.g., 'us-west-2'

    # Initialize ChatBedrock model
    model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
    chat_model = ChatBedrock(
        model_id=model_id,
        region_name="us-west-2",
    )

    # Ask a question to the model
    question = "What is the meaning of life?"
    message = HumanMessage(content=question)
    response = chat_model([message])

    # Print the response
    print("Question:", question)
    print("Response:", response.content)

if __name__ == "__main__":
    main()