
import os
from datetime import timedelta
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import check_password_hash

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get("SECRET_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
ADMIN_ID = "YRP"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

if not SECRET_KEY or not MONGO_URI or not ADMIN_PASSWORD:
    raise RuntimeError("Required environment variables are missing.")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["kd_hostel"]
students = db["students"]

serializer = URLSafeTimedSerializer(SECRET_KEY)


def make_token(user_id, role):
    return serializer.dumps({"user_id": user_id, "role": role})


def get_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    try:
        return serializer.loads(
            auth[7:], max_age=8 * 60 * 60
        )
    except (BadSignature, SignatureExpired):
        return None


def login_required(role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_user()
            if not user:
                return jsonify({"error": "Please login again"}), 401
            if role and user.get("role") != role:
                return jsonify({"error": "Access denied"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@app.get("/")
def home():
    return jsonify({
        "message": "K. D. Hostel API is running"
    })


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    user_id = str(data.get("user_id", "")).strip()
    password = str(data.get("password", ""))

    if not user_id or not password:
        return jsonify({"error": "ID and password required"}), 400

    if user_id == ADMIN_ID and password == ADMIN_PASSWORD:
        token = make_token(ADMIN_ID, "admin")
        return jsonify({
            "message": "Admin login successful",
            "token": token,
            "role": "admin"
        })

    student = students.find_one({
        "enrollment_number": user_id
    })

    if not student or not check_password_hash(
        student.get("password_hash", ""), password
    ):
        return jsonify({"error": "Invalid ID or password"}), 401

    token = make_token(user_id, "student")
    return jsonify({
        "message": "Student login successful",
        "token": token,
        "role": "student"
    })


@app.get("/api/student/me")
@login_required("student")
def student_profile():
    user = get_user()
    student = students.find_one(
        {"enrollment_number": user["user_id"]},
        {"_id": 0, "password_hash": 0}
    )

    if not student:
        return jsonify({"error": "Student not found"}), 404

    return jsonify(student)


@app.get("/api/admin/students")
@login_required("admin")
def list_students():
    result = list(students.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).limit(500))

    return jsonify({"students": result})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(
        os.environ.get("PORT", 5000)
    ))
                
