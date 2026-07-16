class BaseSecretProvider:
    """
    Abstract base class for custom enterprise secrets providers.
    """
    def get_secret(self, name, default=None):
        raise NotImplementedError("Subclasses must implement get_secret()")
