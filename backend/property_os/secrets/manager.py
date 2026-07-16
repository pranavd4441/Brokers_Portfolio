import threading
import time
from .factory import SecretProviderFactory

class SecretsManager:
    """
    Thread-safe Secrets Manager that caches secret requests to optimize speed and limit api calls.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super(SecretsManager, cls).__new__(cls, *args, **kwargs)
                cls._instance._init_manager()
            return cls._instance

    def _init_manager(self):
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes caching TTL
        self.cache_lock = threading.Lock()

    def get_secret(self, name, default=None):
        now = time.time()
        
        with self.cache_lock:
            if name in self.cache:
                val, expiry = self.cache[name]
                if now < expiry:
                    return val
                    
        provider = SecretProviderFactory.get_provider()
        val = provider.get_secret(name, default)
        
        with self.cache_lock:
            self.cache[name] = (val, now + self.cache_ttl)
            
        return val

_manager = SecretsManager()

def get_secret(name, default=None):
    """
    Global thread-safe secret retrieval helper.
    """
    return _manager.get_secret(name, default)
