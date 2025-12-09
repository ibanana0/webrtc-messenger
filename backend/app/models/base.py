from datetime import datetime
from .. import db

# membuat class untuk mix-in di class lain (dapat digunakan berkali-kali) (helper)
class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

class SoftDeleteMixin:
    deleted_at = db.Column(db.DateTime, nullable=True)
    
    def soft_delete(self):
        self.deleted_at = datetime.utcnow()
    def restore(self):
        self.deleted_at = None
    
    @property
    def is_deleted(self):
        return self.deleted_at is not None

class BaseModel(db.Model, TimestampMixin, SoftDeleteMixin):
    __abstract__ = True     # hanya template, tidak dijadikan table
    id = db.Column(db.Integer, primary_key=True)