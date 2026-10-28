
import os
import re
from html import escape
from datetime import datetime, timezone
from functools import wraps

import resend
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError, DuplicateKeyError
from itsdangerous import (
    URLSafeTimedSerializer,
    BadSignature,
    SignatureExpired,
)
from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://vishalmali9353-ops.github.io"
            ]
        }
    },
)

SECRET_KEY = os.environ.get("SECRET_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
ADMIN_ID = "YRP"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
EMAIL_FROM = os.environ.get("EMAIL_FROM")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

if not SECRET_KEY or not MONGO_URI or not ADMIN_PASSWORD:
    raise RuntimeError("Required environment variables are missing.")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000,
)

db = client["kd_hostel"]
students = db["students"]
applications = db["applications"]
notices = db["notices"]

students.create_index(
    [("enrollment_number", ASCENDING)],
    unique=True,
)
applications.create_index(
    [("enrollment_number", ASCENDING)],
    unique=True,
)

serializer = URLSafeTimedSerializer(SECRET_KEY)


def token(uid, role):
    return serializer.dumps({
        "user_id": uid,
        "role": role,
    })


def current_user():
    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        return None

    try:
        return serializer.loads(
            auth[7:],
            max_age=8 * 60 * 60,
        )
    except (BadSignature, SignatureExpired):
        return None


def required(role=None):
    def deco(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            user = current_user()

            if not user:
                return jsonify(error="Please login again"), 401

            if role and user.get("role") != role:
                return jsonify(error="Access denied"), 403

            return fn(*args, **kwargs)

        return wrapped

    return deco


def clean(value, limit=200):
    return str(value or "").strip()[:limit]


def send_admission_email(student_name, student_email, enrollment_number):
    if not RESEND_API_KEY or not EMAIL_FROM or not student_email:
        app.logger.warning(
            "Admission email skipped: email configuration or student email missing"
        )
        return False

    safe_name = escape(str(student_name))
    safe_enrollment = escape(str(enrollment_number))

    try:
        resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [student_email],
            "subject": "K.D. Hostel Admission Approved",
            "html": f"""
                <h2>Welcome to K.D. Hostel</h2>
                <p>Dear {safe_name},</p>
                <p>Your hostel admission application has been approved.</p>
                <p><strong>Enrollment Number:</strong>
                {safe_enrollment}</p>
                <p>Please contact the hostel administration
                if you need assistance.</p>
                <p>Regards,<br>K.D. Hostel Administration</p>
            """,
        })

        app.logger.info(
            "Admission email request submitted for enrollment %s",
            enrollment_number,
        )
        return True

    except Exception:
        app.logger.exception("Admission email sending failed")
        return False


@app.get("/")
def home():
    return jsonify(message="K. D. Hostel API is running")


@app.get("/api/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify(api="ok", database="connected")
    except PyMongoError:
        app.logger.exception("MongoDB ping failed")
        return jsonify(api="ok", database="error"), 503


@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}

    enrollment = clean(data.get("enrollment_number"), 30)
    name = clean(data.get("full_name"), 100)
    email = clean(data.get("email"), 254).lower()

    if not enrollment or not name:
        return jsonify(
            error="Full name and enrollment number are required"
        ), 400

    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify(error="Invalid email address"), 400

    try:
        if students.find_one({"enrollment_number": enrollment}):
            return jsonify(error="An account already exists"), 409

        applications.insert_one({
            "enrollment_number": enrollment,
            "full_name": name,
            "email": email,
            "status": "pending",
        })

        return jsonify(
            message="Application submitted for admin approval",
            status="pending",
        ), 201

    except DuplicateKeyError:
        return jsonify(error="Application already submitted"), 409

    except PyMongoError:
        app.logger.exception("Registration database error")
        return jsonify(
            error="Database error while saving application"
        ), 503


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}

    uid = clean(data.get("user_id"), 100)
    password = str(data.get("password", ""))

    if not uid or not password:
        return jsonify(error="ID and password required"), 400

    if uid == ADMIN_ID and password == ADMIN_PASSWORD:
        return jsonify(
            message="Admin login successful",
            token=token(ADMIN_ID, "admin"),
            role="admin",
        )

    try:
        student = students.find_one({"enrollment_number": uid})
    except PyMongoError:
        app.logger.exception("Login database error")
        return jsonify(error="Database connection error"), 503

    if not student or not check_password_hash(
        student.get("password_hash", ""),
        password,
    ):
        return jsonify(error="Invalid ID or password"), 401

    if student.get("status") != "active":
        return jsonify(error="Student account is not active"), 403

    return jsonify(
        message="Student login successful",
        token=token(uid, "student"),
        role="student",
    )


@app.get("/api/student/me")
@required("student")
def student_me():
    try:
        student = students.find_one(
            {"enrollment_number": current_user()["user_id"]},
            {"_id": 0, "password_hash": 0},
        )

        if not student:
            return jsonify(error="Student not found"), 404

        return jsonify(student), 200

    except PyMongoError:
        app.logger.exception("Student profile error")
        return jsonify(error="Database connection error"), 503


@app.get("/api/student/notices")
@required("student")
def student_notices():
    uid = current_user()["user_id"]

    try:
        items = list(
            notices.find(
                {"$or": [{"target": "all"}, {"target": uid}]},
                {"_id": 0},
            ).sort("created_at", -1).limit(100)
        )

        return jsonify(notices=items)

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


@app.get("/api/admin/applications")
@required("admin")
def admin_applications():
    try:
        items = list(
            applications.find({}, {"_id": 0})
            .sort("enrollment_number", ASCENDING)
            .limit(500)
        )

        return jsonify(applications=items)

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


@app.post("/api/admin/create-account")
@required("admin")
def create_account():
    data = request.get_json(silent=True) or {}

    uid = clean(data.get("enrollment_number"), 30)
    password = str(data.get("password", ""))

    if not uid:
        return jsonify(error="Enrollment number is required"), 400

    if len(password) < 12 or len(password) > 128:
        return jsonify(
            error="Password must be 12 to 128 characters"
        ), 400

    try:
        application = applications.find_one({
            "enrollment_number": uid,
            "status": "pending",
        })

        if not application:
            return jsonify(
                error="Pending application not found"
            ), 404

        students.insert_one({
            "enrollment_number": uid,
            "full_name": application["full_name"],
            "email": application.get("email", ""),
            "password_hash": generate_password_hash(password),
            "status": "active",
            "hostel": "",
            "room_number": "",
            "phone": "",
            "course": "",
            "year": "",
            "fee_status": "Pending",
        })

        applications.update_one(
            {"enrollment_number": uid},
            {"$set": {"status": "approved"}},
        )

    except DuplicateKeyError:
        return jsonify(error="Account already exists"), 409

    except PyMongoError:
        app.logger.exception("Create account failed")
        return jsonify(
            error="Database error creating account"
        ), 503

    # Email failure must not undo the successfully created account.
    email_sent = send_admission_email(
        application.get("full_name", "Student"),
        application.get("email", ""),
        uid,
    )

    return jsonify(
        message="Student account created",
        email_sent=email_sent,
    ), 201


@app.post("/api/admin/applications/<enrollment>/reject")
@required("admin")
def reject_application(enrollment):
    try:
        result = applications.update_one(
            {
                "enrollment_number": enrollment,
                "status": "pending",
            },
            {"$set": {"status": "rejected"}},
        )

        if result.matched_count:
            return jsonify(message="Application rejected"), 200

        return jsonify(
            error="Pending application not found"
        ), 404

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


@app.get("/api/admin/students")
@required("admin")
def admin_students():
    try:
        items = list(
            students.find({}, {"_id": 0, "password_hash": 0})
            .sort("enrollment_number", ASCENDING)
            .limit(1000)
        )

        return jsonify(students=items)

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


@app.patch("/api/admin/students/<enrollment>")
@required("admin")
def update_student(enrollment):
    data = request.get_json(silent=True) or {}

    allowed = (
        "full_name",
        "email",
        "hostel",
        "room_number",
        "phone",
        "course",
        "year",
        "status",
        "fee_status",
    )

    updates = {
        key: clean(data[key], 254 if key == "email" else 100)
        for key in allowed
        if key in data
    }

    if not updates:
        return jsonify(error="No editable fields supplied"), 400

    if "full_name" in updates and not updates["full_name"]:
        return jsonify(error="Name cannot be empty"), 400

    if updates.get("email") and not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+",
        updates["email"],
    ):
        return jsonify(error="Invalid email"), 400

    if "status" in updates and updates["status"] not in (
        "active", "inactive"
    ):
        return jsonify(error="Invalid account status"), 400

    if "fee_status" in updates and updates["fee_status"] not in (
        "Pending", "Paid", "Upcoming"
    ):
        return jsonify(error="Invalid fee status"), 400

    if "hostel" in updates and updates["hostel"] not in (
        "", "Boys", "Girls"
    ):
        return jsonify(error="Hostel must be Boys or Girls"), 400

    try:
        result = students.update_one(
            {"enrollment_number": enrollment},
            {"$set": updates},
        )

        if result.matched_count:
            return jsonify(message="Student details updated"), 200

        return jsonify(error="Student not found"), 404

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


@app.post("/api/admin/notices")
@required("admin")
def post_notice():
    data = request.get_json(silent=True) or {}

    title = clean(data.get("title"), 120)
    body = clean(data.get("body"), 2000)
    target = clean(data.get("target", "all"), 30) or "all"

    if not title or not body:
        return jsonify(error="Title and message are required"), 400

    try:
        if target != "all" and not students.find_one(
            {"enrollment_number": target}
        ):
            return jsonify(error="Target student not found"), 404

        item = {
            "title": title,
            "body": body,
            "target": target,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        notices.insert_one(item)

        return jsonify(message="Notice published"), 201

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


@app.get("/api/admin/notices")
@required("admin")
def admin_notices():
    try:
        items = list(
            notices.find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(100)
        )

        return jsonify(notices=items)

    except PyMongoError:
        return jsonify(error="Database connection error"), 503


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
    )
