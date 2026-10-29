
import os
import re
import secrets
import hashlib
import smtplib
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from functools import wraps
from urllib.parse import urlencode

from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError, DuplicateKeyError
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import check_password_hash, generate_password_hash


# =========================================================
# 1. APP CONFIGURATION
# =========================================================

app = Flask(__name__)

FRONTEND_ORIGIN = os.environ.get(
    "FRONTEND_ORIGIN",
    "https://vishalmali9353-ops.github.io"
).rstrip("/")

CORS(
    app,
    resources={r"/api/*": {"origins": [
        FRONTEND_ORIGIN,
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]}}
)

SECRET_KEY = os.environ.get("SECRET_KEY")
MONGO_URI = os.environ.get("MONGO_URI")
ADMIN_ID = "YRP"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")

FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    "https://vishalmali9353-ops.github.io/"
    "kd-hostel-website/frontend/html/reset-password.html"
).rstrip("/")

PAYMENT_URL = (
    "https://www.eduqfix.com/PayDirect/#/student/pay/"
    "wtldj2los3A4rE42PbWuPkYCHxT1lLblPFFbybo1J71g2K8eflLA3ccWFp5hOuNj/1707"
)

COURSES = {
    "Computer Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering"
}

HOSTELS = {"Boys", "Girls"}
FEE_STATUSES = {"Pending", "Paid", "Upcoming"}
ACCOUNT_STATUSES = {"active", "inactive"}

if not SECRET_KEY or not MONGO_URI or not ADMIN_PASSWORD:
    raise RuntimeError(
        "Missing SECRET_KEY, MONGO_URI or ADMIN_PASSWORD environment variable."
    )

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000
)

db = client["kd_hostel"]

students = db["students"]
applications = db["applications"]
notices = db["notices"]

students.create_index(
    [("enrollment_number", ASCENDING)],
    unique=True
)

applications.create_index(
    [("enrollment_number", ASCENDING)],
    unique=True
)

notices.create_index([("created_at", ASCENDING)])

serializer = URLSafeTimedSerializer(SECRET_KEY)


# =========================================================
# 2. COMMON HELPERS
# =========================================================

def now():
    return datetime.now(timezone.utc)


def iso_now():
    return now().isoformat()


def clean(value, limit=200):
    if value is None:
        return ""
    return str(value).strip()[:limit]


def valid_email(value):
    return bool(
        re.fullmatch(
            r"[^@\s]+@[^@\s]+\.[^@\s]+",
            value or ""
        )
    )


def valid_phone(value):
    return not value or bool(re.fullmatch(r"[0-9]{10}", value))


def token(user_id, role):
    return serializer.dumps({
        "user_id": user_id,
        "role": role
    })


def current_user():
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


def required(role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapped(*args, **kwargs):
            user = current_user()

            if not user:
                return jsonify(error="Please login again."), 401

            if role and user.get("role") != role:
                return jsonify(error="Access denied."), 403

            return fn(*args, **kwargs)

        return wrapped
    return decorator


def public_student(student):
    """Never expose password hashes or reset-token information."""
    if not student:
        return None

    result = dict(student)

    for key in (
        "_id",
        "password_hash",
        "reset_token_hash",
        "reset_expires_at"
    ):
        result.pop(key, None)

    return result


def application_fields(data):
    """Accept registration fields without storing arbitrary input."""
    fields = (
        "enrollment_number",
        "full_name",
        "email",
        "phone",
        "gender",
        "date_of_birth",
        "address",
        "course",
        "year",
        "semester",
        "hostel",
        "room_number",
        "parent_name",
        "parent_phone",
        "fee_status"
    )

    result = {}

    for key in fields:
        if key in data:
            limit = 1000 if key in ("address",) else 254
            result[key] = clean(data[key], limit)

    return result


def validate_student_fields(data, registration=False):
    errors = []

    if "full_name" in data and not clean(data["full_name"], 100):
        errors.append("Full name is required.")

    if "email" in data:
        email = clean(data["email"], 254).lower()
        if email and not valid_email(email):
            errors.append("Enter a valid email address.")

    if "phone" in data:
        phone = clean(data["phone"], 20)
        if not valid_phone(phone):
            errors.append("Phone number must contain exactly 10 digits.")

    if "parent_phone" in data:
        phone = clean(data["parent_phone"], 20)
        if not valid_phone(phone):
            errors.append("Parent phone number must contain exactly 10 digits.")

    if data.get("course") and data["course"] not in COURSES:
        errors.append("Select a valid engineering course.")

    if data.get("hostel") and data["hostel"] not in HOSTELS:
        errors.append("Hostel must be Boys or Girls.")

    if data.get("fee_status") and data["fee_status"] not in FEE_STATUSES:
        errors.append("Invalid fee status.")

    if data.get("status") and data["status"] not in ACCOUNT_STATUSES:
        errors.append("Invalid account status.")

    room = clean(data.get("room_number"), 3)

    if room and not re.fullmatch(r"[A-Za-z0-9]{1,3}", room):
        errors.append("Room number must be 1–3 letters or digits.")

    if room and not data.get("hostel"):
        errors.append("Select a hostel before assigning a room.")

    return errors


def room_is_full(hostel, room, exclude_enrollment=None):
    """Maximum three active student accounts per hostel room."""
    query = {
        "hostel": hostel,
        "room_number": room,
        "status": "active"
    }

    if exclude_enrollment:
        query["enrollment_number"] = {"$ne": exclude_enrollment}

    return students.count_documents(query) >= 3


def send_email(to_email, subject, body):
    """
    SMTP configuration is optional for local development.
    Configure all SMTP variables on Render to send real email.
    """
    host = os.environ.get("SMTP_HOST")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    sender = os.environ.get("EMAIL_FROM") or user
    port = int(os.environ.get("SMTP_PORT", "465"))

    if not all([host, user, password, sender, to_email]):
        return False, "SMTP email settings are incomplete."

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = to_email
    message.set_content(body)

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=20) as smtp:
                smtp.login(user, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.starttls()
                smtp.login(user, password)
                smtp.send_message(message)

        return True, None

    except Exception:
        app.logger.exception("Email delivery failed")
        return False, "Email could not be sent. Check SMTP configuration."


def make_reset_link(enrollment):
    """Generate a separate, random, single-use reset link per student."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires = now() + timedelta(hours=1)

    students.update_one(
        {"enrollment_number": enrollment},
        {"$set": {
            "reset_token_hash": token_hash,
            "reset_expires_at": expires
        }}
    )

    return FRONTEND_URL + "?" + urlencode({"token": raw_token})


def check_reset_token(raw_token):
    if not raw_token or len(raw_token) > 200:
        return None

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    student = students.find_one({
        "reset_token_hash": token_hash,
        "reset_expires_at": {"$gt": now()}
    })

    return student


# =========================================================
# 3. HEALTH CHECK
# =========================================================

@app.get("/")
def home():
    return jsonify(message="K. D. Hostel API is running")


@app.get("/api/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify(api="ok", database="connected")
    except PyMongoError:
        app.logger.exception("MongoDB health check failed")
        return jsonify(api="ok", database="error"), 503


# =========================================================
# 4. STUDENT REGISTRATION
# =========================================================

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    fields = application_fields(data)

    enrollment = clean(data.get("enrollment_number"), 30)
    name = clean(data.get("full_name"), 100)
    email = clean(data.get("email"), 254).lower()

    if not enrollment or not name or not email:
        return jsonify(
            error="Enrollment number, full name and email are required."
        ), 400

    if not re.fullmatch(r"[A-Za-z0-9/-]{1,30}", enrollment):
        return jsonify(error="Invalid enrollment number format."), 400

    fields["enrollment_number"] = enrollment
    fields["full_name"] = name
    fields["email"] = email
    fields.setdefault("status", "pending")

    errors = validate_student_fields(fields, registration=True)

    if errors:
        return jsonify(error=" ".join(errors)), 400

    fields["status"] = "pending"
    fields["created_at"] = iso_now()
    fields["updated_at"] = iso_now()

    try:
        if students.find_one({"enrollment_number": enrollment}):
            return jsonify(error="A student account already exists."), 409

        existing = applications.find_one({
            "enrollment_number": enrollment
        })

        if existing:
            if existing.get("status") == "pending":
                return jsonify(error="Application already submitted."), 409

            if existing.get("status") == "approved":
                return jsonify(error="This application was already approved."), 409

            # Allow a rejected applicant to submit updated information.
            applications.replace_one(
                {"enrollment_number": enrollment},
                fields
            )
        else:
            applications.insert_one(fields)

        # Notify the applicant that the application was received.
        sent, _ = send_email(
            email,
            "K.D. Hostel - Registration received",
            (
                f"Hello {name},\n\n"
                "Your hostel registration has been received and is pending "
                "admin approval.\n\n"
                "Enrollment number: " + enrollment + "\n\n"
                "K.D. Hostel"
            )
        )

        return jsonify(
            message="Application submitted for admin approval.",
            status="pending",
            email_sent=sent
        ), 201

    except DuplicateKeyError:
        return jsonify(error="Application already submitted."), 409
    except PyMongoError:
        app.logger.exception("Registration database error")
        return jsonify(error="Database error while saving application."), 503


# =========================================================
# 5. LOGIN
# =========================================================

@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}

    user_id = clean(data.get("user_id"), 100)
    password = str(data.get("password", ""))

    if not user_id or not password:
        return jsonify(error="ID and password are required."), 400

    if user_id == ADMIN_ID and secrets.compare_digest(
        password, ADMIN_PASSWORD
    ):
        return jsonify(
            message="Admin login successful.",
            token=token(ADMIN_ID, "admin"),
            role="admin"
        )

    try:
        student = students.find_one({
            "enrollment_number": user_id
        })

        if (
            not student
            or not check_password_hash(
                student.get("password_hash", ""),
                password
            )
        ):
            return jsonify(error="Invalid ID or password."), 401

        if student.get("status") != "active":
            return jsonify(error="Student account is not active."), 403

        return jsonify(
            message="Student login successful.",
            token=token(user_id, "student"),
            role="student"
        )

    except PyMongoError:
        app.logger.exception("Login database error")
        return jsonify(error="Database connection error."), 503


# =========================================================
# 6. STUDENT DASHBOARD
# =========================================================

@app.get("/api/student/me")
@required("student")
def student_me():
    try:
        student = students.find_one({
            "enrollment_number": current_user()["user_id"]
        })

        if not student:
            return jsonify(error="Student not found."), 404

        result = public_student(student)
        result["payment_url"] = (
            PAYMENT_URL
            if result.get("fee_status", "Pending") == "Pending"
            else ""
        )

        return jsonify(result)

    except PyMongoError:
        return jsonify(error="Database connection error."), 503


@app.get("/api/student/notices")
@required("student")
def student_notices():
    enrollment = current_user()["user_id"]

    try:
        items = list(
            notices.find(
                {
                    "$or": [
                        {"target": "all"},
                        {"target": enrollment},
                        {"targets": enrollment}
                    ]
                },
                {"_id": 0}
            ).sort("created_at", -1).limit(100)
        )

        return jsonify(notices=items)

    except PyMongoError:
        return jsonify(error="Database connection error."), 503


# =========================================================
# 7. STUDENT SELF-SERVICE PROFILE EDIT
# =========================================================

@app.patch("/api/student/me")
@required("student")
def update_own_profile():
    data = request.get_json(silent=True) or {}

    allowed = (
        "full_name",
        "email",
        "phone",
        "address",
        "parent_name",
        "parent_phone",
        "course",
        "year",
        "semester"
    )

    updates = {
        key: clean(data[key], 1000 if key == "address" else 254)
        for key in allowed
        if key in data
    }

    if not updates:
        return jsonify(error="No editable fields supplied."), 400

    if "email" in updates:
        updates["email"] = updates["email"].lower()

    errors = validate_student_fields(updates)

    if errors:
        return jsonify(error=" ".join(errors)), 400

    updates["updated_at"] = iso_now()

    try:
        result = students.update_one(
            {"enrollment_number": current_user()["user_id"]},
            {"$set": updates}
        )

        if not result.matched_count:
            return jsonify(error="Student not found."), 404

        return jsonify(
            message="Profile updated successfully. Hostel and room allotment "
                    "must be changed by the admin."
        )

    except PyMongoError:
        return jsonify(error="Database connection error."), 503


# =========================================================
# 8. ADMIN APPLICATIONS
# =========================================================

@app.get("/api/admin/applications")
@required("admin")
def admin_applications():
    try:
        items = list(
            applications.find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(1000)
        )

        return jsonify(applications=items)

    except PyMongoError:
        return jsonify(error="Database connection error."), 503


@app.patch("/api/admin/applications/<enrollment>")
@required("admin")
def edit_application(enrollment):
    data = request.get_json(silent=True) or {}
    allowed = set(application_fields(data)) - {"enrollment_number"}

    updates = {
        key: clean(data[key], 1000 if key == "address" else 254)
        for key in allowed
    }

    if not updates:
        return jsonify(error="No editable application fields supplied."), 400

    if "email" in updates:
        updates["email"] = updates["email"].lower()

    errors = validate_student_fields(updates)

    if errors:
        return jsonify(error=" ".join(errors)), 400

    updates["updated_at"] = iso_now()

    try:
        result = applications.update_one(
            {
                "enrollment_number": enrollment,
                "status": "pending"
            },
            {"$set": updates}
        )

        if not result.matched_count:
            return jsonify(
                error="Pending application not found."
            ), 404

        return jsonify(message="Application details updated.")

    except PyMongoError:
        return jsonify(error="Database connection error."), 503


@app.post("/api/admin/applications/<enrollment>/reject")
@required("admin")
def reject_application(enrollment):
    try:
        result = applications.update_one(
            {
                "enrollment_number": enrollment,
                "status": "pending"
            },
            {"$set": {
                "status": "rejected",
                "updated_at": iso_now()
            }}
        )

        if not result.matched_count:
            return jsonify(
                error="Pending application not found."
            ), 404

        return jsonify(message="Application rejected.")

    except PyMongoError:
        return jsonify(error="Database connection error."), 503


# =========================================================
# 9. APPROVE APPLICATION + CREATE ACCOUNT
# =========================================================

@app.post("/api/admin/create-account")
@required("admin")
def create_account():
    data = request.get_json(silent=True) or {}

    enrollment = clean(data.get("enrollment_number"), 30)
    password = str(data.get("password", ""))

    if not enrollment:
        return jsonify(
            error="Enrollment number is required."
        ), 400

    if len(password) < 12 or len(password) > 128:
        return jsonify(
            error="Temporary password must contain 12–128 characters."
        ), 400

    try:
        # Find the pending application
        application = applications.find_one({
            "enrollment_number": enrollment,
            "status": "pending"
        })

        if not application:
            return jsonify(
                error="Pending application not found."
            ), 404

        # Prevent duplicate student accounts
        if students.find_one({
            "enrollment_number": enrollment
        }):
            return jsonify(
                error="Student account already exists."
            ), 409

        # Prepare student account from application details
        student = dict(application)
        student.pop("_id", None)

        student.update({
            "password_hash": generate_password_hash(password),
            "status": "active",
            "hostel": student.get("hostel", ""),
            "room_number": student.get("room_number", ""),
            "fee_status": student.get("fee_status", "Pending"),
            "created_at": iso_now()
        })

        # Create student account
        students.insert_one(student)

        # Mark application as approved
        applications.update_one(
            {
                "enrollment_number": enrollment,
                "status": "pending"
            },
            {
                "$set": {
                    "status": "approved",
                    "approved_at": iso_now()
                }
            }
        )

        return jsonify(
            message="Student account created successfully.",
            enrollment_number=enrollment,
            status="active"
        ), 201

    except DuplicateKeyError:
        return jsonify(
            error="Student account already exists."
        ), 409

    except PyMongoError:
        app.logger.exception(
            "Create student account failed"
        )
        return jsonify(
            error="Database error while creating student account."
        ), 503

    except Exception:
        app.logger.exception(
            "Unexpected error while creating student account"
        )
        return jsonify(
            error="Unexpected server error while creating account."
        ), 500
