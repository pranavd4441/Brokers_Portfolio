import os

from .aws import AWSSecretProvider
from .env import EnvSecretProvider
from .vault import VaultSecretProvider


class SecretProviderFactory:
    """
    Factory to resolve the active secrets provider based on configuration.
    """

    _provider_instances = {}

    @classmethod
    def get_provider(cls):
        provider_name = os.getenv("SECRET_PROVIDER", "env").lower()

        if provider_name not in cls._provider_instances:
            if provider_name == "aws":
                cls._provider_instances[provider_name] = AWSSecretProvider()
            elif provider_name == "vault":
                cls._provider_instances[provider_name] = VaultSecretProvider()
            else:
                cls._provider_instances[provider_name] = EnvSecretProvider()

        return cls._provider_instances[provider_name]
