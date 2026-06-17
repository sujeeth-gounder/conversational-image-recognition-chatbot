"""
models.py — SQLAlchemy models mirroring database/schema.sql
"""
import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(190), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("user", "admin"), default="user", nullable=False)
    bio = db.Column(db.Text, default="")
    avatar_color = db.Column(db.String(9), default="#6366f1")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "bio": self.bio,
            "avatarColor": self.avatar_color,
            "createdAt": int(self.created_at.timestamp() * 1000),
        }


class Image(db.Model):
    __tablename__ = "images"
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"))
    name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.Text)
    analysis_json = db.Column(db.JSON)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "caption": self.caption,
            "analysis": self.analysis_json,
            "createdAt": int(self.created_at.timestamp() * 1000),
        }


class ChatHistory(db.Model):
    __tablename__ = "chat_history"
    id = db.Column(db.String(36), primary_key=True, default=gen_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"))
    image_id = db.Column(db.String(36), db.ForeignKey("images.id", ondelete="CASCADE"))
    role = db.Column(db.Enum("user", "bot"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "imageId": self.image_id,
            "role": self.role,
            "text": self.text,
            "createdAt": int(self.created_at.timestamp() * 1000),
        }
