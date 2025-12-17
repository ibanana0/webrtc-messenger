from .. import db
from ..models.base import BaseModel
import bcrypt

class User(BaseModel):
    __tablename__ = "users"
    
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    public_key = db.Column(db.Text, nullable=True)
    
    def set_password(self, password: str) -> None:
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(
            password.encode(encoding="utf-8"),
            salt
        ).decode("utf-8")
        
    def check_password(self, password: str) -> bool:
        return bcrypt.checkpw(
            password=password.encode(encoding="utf-8"),
            hashed_password=self.password_hash.encode(encoding="utf-8")
        )
    
    def to_dict(self, include_public_key: bool = False) -> dict:
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_public_key:
            data['public_key'] = self.public_key
        return data
    
    def __repr__(self):
        return f'<User {self.username}>'