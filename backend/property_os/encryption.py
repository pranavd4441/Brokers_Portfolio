import os
import base64
import hashlib
from django.db import models
from django.conf import settings
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

class FieldEncryptor:
    """
    Helper utility executing AES-256-CBC encryption and decryption of values.
    """
    _key = None

    @classmethod
    def get_key(cls):
        if not cls._key:
            key_str = os.getenv('FIELD_ENCRYPTION_KEY')
            if not key_str:
                secret_key = getattr(settings, 'SECRET_KEY', 'default-insecure-key-change-in-production')
                cls._key = hashlib.sha256(secret_key.encode()).digest()
            else:
                try:
                    cls._key = base64.b64decode(key_str)
                    if len(cls._key) != 32:
                        cls._key = hashlib.sha256(key_str.encode()).digest()
                except Exception:
                    cls._key = hashlib.sha256(key_str.encode()).digest()
        return cls._key

    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        if not plaintext:
            return plaintext
        if plaintext.startswith("enc_aes_256:"):
            return plaintext  # Prevent double encryption
            
        try:
            key = cls.get_key()
            iv = os.urandom(16)
            
            # PKCS7 padding
            pad_len = 16 - (len(plaintext.encode()) % 16)
            padded_data = plaintext.encode() + bytes([pad_len] * pad_len)
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            encryptor = cipher.encryptor()
            ciphertext = encryptor.update(padded_data) + encryptor.finalize()
            
            payload = base64.b64encode(iv + ciphertext).decode('utf-8')
            return f"enc_aes_256:{payload}"
        except Exception:
            return plaintext

    @classmethod
    def decrypt(cls, ciphertext: str) -> str:
        if not ciphertext or not ciphertext.startswith("enc_aes_256:"):
            return ciphertext
            
        try:
            key = cls.get_key()
            payload = ciphertext[len("enc_aes_256:"):]
            raw_data = base64.b64decode(payload.encode('utf-8'))
            
            iv = raw_data[:16]
            encrypted_content = raw_data[16:]
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            padded_data = decryptor.update(encrypted_content) + decryptor.finalize()
            
            # PKCS7 unpadding
            pad_len = padded_data[-1]
            if pad_len < 1 or pad_len > 16:
                raise ValueError("Invalid padding bytes")
            return padded_data[:-pad_len].decode('utf-8')
        except Exception:
            return ciphertext


class EncryptedCharField(models.CharField):
    """
    Transparently encrypted CharField for sensitive database columns.
    """
    def get_prep_value(self, value):
        prep_value = super().get_prep_value(value)
        if prep_value is not None:
            return FieldEncryptor.encrypt(str(prep_value))
        return prep_value

    def from_db_value(self, value, expression, connection):
        if value is not None:
            return FieldEncryptor.decrypt(str(value))
        return value

    def to_python(self, value):
        val = super().to_python(value)
        if val is not None:
            return FieldEncryptor.decrypt(str(val))
        return val
