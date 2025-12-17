"""
Migration Script: Clear Old RSA Public Keys
============================================

Script ini menghapus semua public_key lama yang menggunakan format RSA-PEM
agar user dapat generate X25519 key pair baru saat login berikutnya.

Jalankan script ini sekali setelah deploy update enkripsi X25519.

Usage:
    cd backend
    python scripts/clear_old_rsa_keys.py
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.user import User

def is_rsa_pem_key(key: str) -> bool:
    """Check if key is old RSA-PEM format"""
    if not key:
        return False
    return key.strip().startswith('-----BEGIN PUBLIC KEY-----')

def is_x25519_key(key: str) -> bool:
    """Check if key is new X25519 base64 format (32 bytes = 44 chars base64)"""
    if not key:
        return False
    key = key.strip()
    # X25519 key is 32 bytes, which encodes to 44 base64 characters (with padding)
    # or 43 without padding
    if key.startswith('-----'):
        return False
    try:
        import base64
        decoded = base64.b64decode(key)
        return len(decoded) == 32
    except:
        return False

def main():
    app = create_app()
    
    with app.app_context():
        print("=" * 60)
        print("🔑 X25519 Migration: Clear Old RSA Keys")
        print("=" * 60)
        
        users = User.query.all()
        print(f"\n📊 Total users: {len(users)}")
        
        rsa_keys_count = 0
        x25519_keys_count = 0
        no_keys_count = 0
        
        users_to_clear = []
        
        for user in users:
            if not user.public_key:
                no_keys_count += 1
            elif is_rsa_pem_key(user.public_key):
                rsa_keys_count += 1
                users_to_clear.append(user)
            elif is_x25519_key(user.public_key):
                x25519_keys_count += 1
            else:
                print(f"   ⚠️  Unknown key format for {user.username}: {user.public_key[:50]}...")
        
        print(f"\n📈 Key Statistics:")
        print(f"   - RSA-PEM keys (old): {rsa_keys_count}")
        print(f"   - X25519 keys (new): {x25519_keys_count}")
        print(f"   - No keys: {no_keys_count}")
        
        if not users_to_clear:
            print("\n✅ No old RSA keys to clear. Migration not needed.")
            return
        
        print(f"\n⚠️  Found {len(users_to_clear)} users with old RSA keys:")
        for user in users_to_clear:
            print(f"   - {user.username}")
        
        # Confirm
        confirm = input("\n❓ Clear these RSA keys? Users will need to re-login to generate X25519 keys. (y/N): ")
        
        if confirm.lower() != 'y':
            print("❌ Migration cancelled.")
            return
        
        # Clear keys
        for user in users_to_clear:
            user.public_key = None
        
        db.session.commit()
        
        print(f"\n✅ Cleared {len(users_to_clear)} old RSA keys!")
        print("   Users will get new X25519 keys when they login next time.")
        print("=" * 60)

if __name__ == '__main__':
    main()
