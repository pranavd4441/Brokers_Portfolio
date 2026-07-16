import os

from .base import BaseSecretProvider


class EnvSecretProvider(BaseSecretProvider):
    """
    Secrets provider that fetches values directly from OS environment variables.
    """

    def get_secret(self, name, default=None):
        return os.environ.get(name, default)
