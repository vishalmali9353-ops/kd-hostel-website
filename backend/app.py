
import os
import re
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError, PyMongoError
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://vishalmali9353-ops.github.io"
        ]
    }
})

SECRET_KEY = os.environ.get("SECRET_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
ADMIN_ID = "YRP"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

if not SECRET_KEY or not MONGO_URI or not ADMIN_PASSWORD:
    raise RuntimeError("Required environment variables are missing.")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
db = client["kd_hostel"]

students = db["students"]
applications = db["applications"]

students.create_index(
    [("enrollment_number", ASCENDING)],
    unique=True
)
applications.create_index(
    [("enrollment_number", ASCENDING)],
    unique=True
)

serializer = URLSafeTimedSerializer(SECRET_KEY)


def make_token(user_id, role):
    return serializer.dumps({
        "user_id": user_id,
        "role": role
    })


def get_user():
    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        return None

    try:
        return serializer.loads(
            auth[7:],
            max_age=8 * 60 * 60
        )
    except (BadSignature, SignatureExpired):
        return None


def login_required(role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_user()

            if not user:
                return jsonify({
                    "error": "Please login again"
                }), 401

            if role and user.get("role") != role:
                return jsonify({
                    "error": "Access denied"
                }), 403

            return fn(*args, **kwargs)

        return wrapper
    return decorator


@app.get("/")
def home():
    return jsonify({
        "message": "K. D. Hostel API is running"
    })


# Student submits an application.
# Admin creates the account and password later.
@app.post("/api/register")
def register_student():
    data = request.get_json(silent=True) or {}

    enrollment = str(
        data.get("enrollment_number", "")
    ).strip()

    full_name = str(
        data.get("full_name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    if not enrollment or not full_name:
        return jsonify({
            "error": "Full name and enrollment number are required"
        }), 400

    if len(enrollment) > 30 or len(full_name) > 100:
        return jsonify({
            "error": "Input is too long"
        }), 400

    if email and (
        len(email) > 254
        or not re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+",
            email
        )
    ):
        return jsonify({
            "error": "Invalid email address"
        }), 400

    if students.find_one({
        "enrollment_number": enrollment
    }):
        return jsonify({
            "error": "An account already exists"
        }), 409

    try:
        applications.insert_one({
            "enrollment_number": enrollment,
            "full_name": full_name,
            "email": email,
            "status": "pending"
        })

    except DuplicateKeyError:
        return jsonify({
            "error": "Application already submitted"
        }), 409

    except PyMongoError:
        app.logger.exception("Could not save application")
        return jsonify({
            "error": "Could not save application"
        }), 500

    return jsonify({
        "message": "Application submitted for admin approval",
        "status": "pending"
    }), 201


# Admin and students log in here.
@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}

    user_id = str(
        data.get("user_id", "")
    ).strip()

    password = str(data.get("password", ""))

    if not user_id or not password:
        return jsonify({
            "error": "ID and password required"
        }), 400

    if user_id == ADMIN_ID and password == ADMIN_PASSWORD:
        return jsonify({
            "message": "Admin login successful",
            "token": make_token(ADMIN_ID, "admin"),
            "role": "admin"
        })

    student = students.find_one({
        "enrollment_number": user_id
    })

    if not student or not check_password_hash(
        student.get("password_hash", ""),
        password
    ):
        return jsonify({
            "error": "Invalid ID or password"
        }), 401

    if student.get("status") != "active":
        return jsonify({
            "error": "Student account is not active"
        }), 403

    return jsonify({
        "message": "Student login successful",
        "token": make_token(user_id, "student"),
        "role": "student"
    })


# Logged-in student views their own profile.
@app.get("/api/student/me")
@login_required("student")
def student_profile():
    user = get_user()

    student = students.find_one(
        {"enrollment_number": user["user_id"]},
        {"_id": 0, "password_hash": 0}
    )

    if not student:
        return jsonify({
            "error": "Student not found"
        }), 404

    return jsonify(student)


# Admin views pending applications.
@app.get("/api/admin/applications")
@login_required("admin")
def list_applications():
    result = list(
        applications.find({}, {"_id": 0})
        .sort("enrollment_number", ASCENDING)
        .limit(500)
    )

    return jsonify({
        "applications": result
    })


# Admin enters enrollment number and sets a password.
@app.post("/api/admin/create-account")
@login_required("admin")
def create_student_account():
    data = request.get_json(silent=True) or {}

    enrollment = str(
        data.get("enrollment_number", "")
    ).strip()

    password = str(data.get("password", ""))

    if not enrollment:
        return jsonify({
            "error": "Enrollment number is required"
        }), 400

    if len(password) < 12 or len(password) > 128:
        return jsonify({
            "error": "Password must be 12 to 128 characters"
        }), 400

    application = applications.find_one({
        "enrollment_number": enrollment,
        "status": "pending"
    })

    if not application:
        return jsonify({
            "error": "Pending application not found"
        }), 404

    try:
        students.insert_one({
            "enrollment_number": enrollment,
            "full_name": application["full_name"],
            "email": application.get("email", ""),
            "password_hash": generate_password_hash(password),
            "status": "active"
        })

    except DuplicateKeyError:
        return jsonify({
            "error": "An account already exists"
        }), 409

    except PyMongoError:
        app.logger.exception("Could not create account")
        return jsonify({
            "error": "Could not create account"
        }), 500

    applications.update_one(
        {
            "enrollment_number": enrollment,
            "status": "pending"
        },
        {
            "$set": {"status": "approved"}
        }
    )

    return jsonify({
        "message": "Student account created"
    }), 201


# Admin views active student accounts.
@app.get("/api/admin/students")
@login_required("admin")
def list_students():
    result = list(
        students.find(
            {},
            {"_id": 0, "password_hash": 0}
        )
        .sort("enrollment_number", ASCENDING)
        .limit(500)
    )

    return jsonify({
        "students": result
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000))
    )
