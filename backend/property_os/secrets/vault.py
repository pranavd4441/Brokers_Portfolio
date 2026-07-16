import json
import logging
import os
import urllib.request

from .base import BaseSecretProvider

logger = logging.getLogger(__name__)


class VaultSecretProvider(BaseSecretProvider):
    """
    Secrets provider integrating with Hashicorp Vault (via REST HTTP requests).
    Includes fallback if VAULT_ADDR or VAULT_TOKEN is missing.
    """

    def __init__(self):
        self.vault_addr = os.getenv("VAULT_ADDR")
        self.vault_token = os.getenv("VAULT_TOKEN")
        self.secret_cache = {}

    def get_secret(self, name, default=None):
        if not self.vault_addr or not self.vault_token:
            return os.environ.get(name, default)

        secret_path = os.getenv("VAULT_SECRET_PATH", "secret/data/propertyos")
        if secret_path in self.secret_cache:
            return self.secret_cache[secret_path].get(name, default)

        url = f"{self.vault_addr}/v1/{secret_path}"
        req = urllib.request.Request(url)
        req.add_header("X-Vault-Token", self.vault_token)

        try:
            with urllib.request.urlopen(req, timeout=5) as response:  # nosec B310
                data = json.loads(response.read().decode())
                secrets = data.get("data", {}).get("data", {})
                self.secret_cache[secret_path] = secrets
                return secrets.get(name, default)
        except Exception as e:
            logger.error(
                f"Error fetching secrets from Hashicorp Vault ({secret_path}): {str(e)}"
            )

        return os.environ.get(name, default)
