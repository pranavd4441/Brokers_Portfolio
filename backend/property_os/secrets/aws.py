import json
import logging
import os

from .base import BaseSecretProvider

logger = logging.getLogger(__name__)


class AWSSecretProvider(BaseSecretProvider):
    """
    Secrets provider integrating with AWS Secrets Manager.
    Includes mock fallback if credentials are not configured (common in dev/testing).
    """

    def __init__(self):
        self.client = None
        self.secret_cache = {}
        try:
            import boto3

            if os.getenv("AWS_ACCESS_KEY_ID"):
                self.client = boto3.client(
                    "secretsmanager", region_name=os.getenv("AWS_REGION", "us-east-1")
                )
        except Exception as e:
            logger.warning(f"AWS Secrets Manager failed to initialize: {str(e)}")

    def get_secret(self, name, default=None):
        if not self.client:
            return os.environ.get(name, default)

        secret_id = os.getenv("AWS_SECRET_ID", "propertyos/prod")

        if secret_id in self.secret_cache:
            return self.secret_cache[secret_id].get(name, default)

        try:
            response = self.client.get_secret_value(SecretId=secret_id)
            if "SecretString" in response:
                secrets = json.loads(response["SecretString"])
                self.secret_cache[secret_id] = secrets
                return secrets.get(name, default)
        except Exception as e:
            logger.error(
                f"Error fetching secrets from AWS Secrets Manager ({secret_id}): {str(e)}"
            )

        return os.environ.get(name, default)
