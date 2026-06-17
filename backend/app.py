"""
app.py — Flask REST API for VisionChat
-------------------------------------------------------------------------------
Endpoints:  /register  /login  /upload-image  /chat  /history  + /admin/*
Auth:       JWT (Flask-JWT-Extended)
DB:         MySQL via SQLAlchemy
AI:         backend/ai/vision.py (YOLOv8 + BLIP + Tesseract + OpenCV)
-------------------------------------------------------------------------------
Run:
    pip install -r requirements.txt
    export DATABASE_URL="mysql+pymysql://user:pass@localhost/visionchat"
    export JWT_SECRET="change-me"
    flask --app app run
"""
import os
import uuid

import bcrypt
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.utils import secure_filename

from models import ChatHistory, Image, User, db
from ai.vision import analyze_image, answer_question

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
ALLOWED = {"png", "jpg", "jpeg"}
MAX_BYTES = 8 * 1024 * 1024


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "mysql+pymysql://root:root@localhost/visionchat"
    )
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET", "dev-secret")
    app.config["MAX_CONTENT_LENGTH"] = MAX_BYTES

    CORS(app)
    JWTManager(app)
    db.init_app(app)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    with app.app_context():
        db.create_all()

    # --------------------------------------------------------------------- #
    #  Auth                                                                  #
    # --------------------------------------------------------------------- #
    @app.post("/register")
    def register():
        data = request.get_json() or {}
        name, email, pw = data.get("name"), data.get("email"), data.get("password", "")
        if not name or not email or len(pw) < 6:
            return jsonify(error="Invalid input"), 400
        if User.query.filter_by(email=email).first():
            return jsonify(error="Email already registered"), 409
        user = User(
            name=name,
            email=email,
            password_hash=bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode(),
        )
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=user.id)
        return jsonify(token=token, user=user.to_dict()), 201

    @app.post("/login")
    def login():
        data = request.get_json() or {}
        user = User.query.filter_by(email=data.get("email")).first()
        if not user or not bcrypt.checkpw(
            data.get("password", "").encode(), user.password_hash.encode()
        ):
            return jsonify(error="Invalid credentials"), 401
        token = create_access_token(identity=user.id)
        return jsonify(token=token, user=user.to_dict())

    # --------------------------------------------------------------------- #
    #  Image upload + analysis                                              #
    # --------------------------------------------------------------------- #
    @app.post("/upload-image")
    @jwt_required()
    def upload_image():
        uid = get_jwt_identity()
        if "image" not in request.files:
            return jsonify(error="No file"), 400
        f = request.files["image"]
        ext = f.filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED:
            return jsonify(error="Invalid file type"), 400

        fname = f"{uuid.uuid4()}_{secure_filename(f.filename)}"
        path = os.path.join(UPLOAD_DIR, fname)
        f.save(path)

        analysis = analyze_image(path)
        img = Image(
            user_id=uid,
            name=f.filename,
            file_path=path,
            caption=analysis["caption"],
            analysis_json=analysis,
            width=analysis["width"],
            height=analysis["height"],
        )
        db.session.add(img)
        db.session.commit()
        return jsonify(img.to_dict()), 201

    # --------------------------------------------------------------------- #
    #  Chat / VQA                                                           #
    # --------------------------------------------------------------------- #
    @app.post("/chat")
    @jwt_required()
    def chat():
        uid = get_jwt_identity()
        data = request.get_json() or {}
        img = Image.query.filter_by(id=data.get("imageId"), user_id=uid).first()
        if not img:
            return jsonify(error="Image not found"), 404

        question = data.get("message", "")
        db.session.add(ChatHistory(user_id=uid, image_id=img.id, role="user", text=question))
        reply = answer_question(question, img.analysis_json)
        bot = ChatHistory(user_id=uid, image_id=img.id, role="bot", text=reply)
        db.session.add(bot)
        db.session.commit()
        return jsonify(reply=reply, messageId=bot.id)

    # --------------------------------------------------------------------- #
    #  History                                                             #
    # --------------------------------------------------------------------- #
    @app.get("/history")
    @jwt_required()
    def history():
        uid = get_jwt_identity()
        images = Image.query.filter_by(user_id=uid).order_by(Image.created_at.desc()).all()
        chat = ChatHistory.query.filter_by(user_id=uid).order_by(ChatHistory.created_at).all()
        return jsonify(
            images=[i.to_dict() for i in images],
            chat=[c.to_dict() for c in chat],
        )

    return app


if __name__ == "__main__":
    create_app().run(debug=True)
