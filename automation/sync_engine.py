"""
ShiftPay Sync Engine
Handles end-to-end client-side encryption (AES-256-GCM + PBKDF2) matching ShiftPay's WebCrypto implementation.
Allows Python automation to securely sync payslips and shifts directly to Firestore.
"""

import hashlib
import base64
import json
import os
import time
import requests
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

FB_PROJECT = 'maas-takip-sync'
FB_KEY = 'AIzaSyCSTmFZHJFZAf4qXdmhRtc9Srv5VpB-CBY'
SALT = 'maas-takip-v1-salt'.encode('utf-8')
HEADERS = {
    'Referer': 'https://shiftpay-app.pages.dev/',
    'Origin': 'https://shiftpay-app.pages.dev',
    'Content-Type': 'application/json'
}

class ShiftPaySync:
    def __init__(self, sync_code: str):
        # Normalize code (uppercase, strip spaces/hyphens)
        clean = sync_code.replace('-', '').replace(' ', '').strip().upper()
        if len(clean) != 16:
            raise ValueError(f"Sync code must be 16 characters. Got: {clean}")
        self.code = clean
        
        # Derive key: PBKDF2-SHA256, 150,000 iterations
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=SALT,
            iterations=150000
        )
        self.key = kdf.derive(self.code.encode('utf-8'))
        self.aesgcm = AESGCM(self.key)
        
        # Doc ID: SHA-256 of "maas-takip-sync|" + code
        self.doc_id = hashlib.sha256(('maas-takip-sync|' + self.code).encode('utf-8')).hexdigest()
        self.fb_url = f"https://firestore.googleapis.com/v1/projects/{FB_PROJECT}/databases/(default)/documents/sync/{self.doc_id}?key={FB_KEY}"
        self.upd = ""

    def encrypt(self, data_dict: dict) -> str:
        iv = os.urandom(12)
        payload = json.dumps(data_dict, ensure_ascii=False).encode('utf-8')
        ct = self.aesgcm.encrypt(iv, payload, None)
        return base64.b64encode(iv + ct).decode('utf-8')

    def decrypt(self, b64_str: str) -> dict:
        raw = base64.b64decode(b64_str)
        iv = raw[:12]
        ct = raw[12:]
        payload = self.aesgcm.decrypt(iv, ct, None)
        return json.loads(payload.decode('utf-8'))

    def get_data(self) -> dict:
        """Fetch and decrypt current user data from Firestore."""
        res = requests.get(self.fb_url, headers=HEADERS, timeout=10)
        if res.status_code == 404:
            self.upd = ""
            return {}
        res.raise_for_status()
        doc = res.json()
        self.upd = doc.get('updateTime', '')
        fields = doc.get('fields', {})
        enc_str = fields.get('c', {}).get('stringValue', '')
        if not enc_str:
            return {}
        return self.decrypt(enc_str)

    def save_data(self, data_dict: dict):
        """Encrypt and upload user data to Firestore."""
        now_ts = int(time.time() * 1000)
        data_dict['updated'] = now_ts
        enc_str = self.encrypt(data_dict)
        body = {
            "fields": {
                "c": {"stringValue": enc_str},
                "u": {"integerValue": str(now_ts)},
                "v": {"integerValue": "1"}
            }
        }
        url = self.fb_url
        if self.upd:
            url += f"&currentDocument.updateTime={self.upd}"
            
        res = requests.patch(url, headers=HEADERS, json=body, timeout=10)
        res.raise_for_status()
        j = res.json()
        self.upd = j.get('updateTime', '')
        return True
