
import os
import re
import smtplib
from html import escape
from email.message import EmailMessage
from datetime import datetime, timezone
from functools import wraps

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

SMTP_EMAIL = os.environ.get("SMTP_EMAIL")
SMTP_APP_PASSWORD = os.environ.get("SMTP_APP_PASSWORD")
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))

if not SECRET_KEY or not MONGO_URI or not ADMIN_PASSWORD:
    raise RuntimeError(
        "Required environment variables are missing."
    )

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


def valid_email(email):
    return bool(
        email
        and re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
    )


def send_email(recipient, subject, html):
    """Send email using Gmail SMTP. Never log credentials."""
    if not SMTP_EMAIL or not SMTP_APP_PASSWORD:
        app.logger.warning(
            "Email not sent: Gmail SMTP configuration is missing."
        )
        return False

    if not valid_email(recipient):
        app.logger.warning(
            "Email not sent: recipient email is missing or invalid."
        )
        return False

    message = EmailMessage()
    message["From"] = f"K.D. Hostel <{SMTP_EMAIL}>"
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(
        "This message is from K.D. Hostel. "
        "Please open it in an HTML-compatible email app."
    )
    message.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(
            SMTP_SERVER,
            SMTP_PORT,
            timeout=20,
        ) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(
                SMTP_EMAIL,
                SMTP_APP_PASSWORD.replace(" ", ""),
            )
            server.send_message(message)

        app.logger.info("Email accepted by Gmail SMTP.")
        return True

    except Exception:
        app.logger.exception("Gmail SMTP email failed.")
        return False


def send_admission_email(
    student_name,
    student_email,
    enrollment_number,
):
    name = escape(str(student_name))
    enrollment = escape(str(enrollment_number))

    return send_email(
        student_email,
        "K.D. Hostel - Admission Approved",
        f"""
        <h2>Admission Approved</h2>
        <p>Dear {name},</p>
        <p>Your K.D. Hostel admission application has been approved.</p>
        <p><strong>Enrollment Number:</strong> {enrollment}</p>
        <p>Your student account has been created. Please use the
        login instructions provided by the hostel administrator.</p>
        <p>Regards,<br>K.D. Hostel Administration</p>
        """,
    )


def send_rejection_email(
    student_name,
    student_email,
    enrollment_number,
):
    name = escape(str(student_name))
    enrollment = escape(str(enrollment_number))

    return send_email(
        student_email,
        "K.D. Hostel - Admission Application Update",
        f"""
        <h2>Admission Application Update</h2>
        <p>Dear {name},</p>
        <p>We regret to inform you that your hostel admission
        application has been rejected.</p>
        <p><strong>Enrollment Number:</strong> {enrollment}</p>
        <p>Please contact the hostel administration for further
        information.</p>
        <p>Regards,<br>K.D. Hostel Administration</p>
        """,
    )


def send_account_email(
    student_name,
    student_email,
    enrollment_number,
):
    name = escape(str(student_name))
    enrollment = escape(str(enrollment_number))

    return send_email(
        student_email,
        "K.D. Hostel - Student Account Created",
        f"""
        <h2>Student Account Created</h2>
        <p>Dear {name},</p>
        <p>Your K.D. Hostel student account has been created.</p>
        <p><strong>Enrollment Number:</strong> {enrollment}</p>
        <p>Please use your enrollment number to log in with the
        temporary password provided by the hostel administrator.
        Change your password after logging in.</p>
        <p>For assistance, contact the hostel administration.</p>
        <p>Regards,<br>K.D. Hostel Administration</p>
        """,
    )


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

    if not enrollment or not name or not email:
        return jsonify(
            error="Full name, enrollment number and email are required"
        ), 400

    if not valid_email(email):
        return jsonify(error="Invalid email address"), 400

    try:
        if students.find_one({"enrollment_number": enrollment}):
            return jsonify(error="An account already exists"), 409

        applications.insert_one({
            "enrollment_number": enrollment,
            "full_name": name,
            "email": email,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
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
        app.logger.exception("Student notices error")
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
        app.logger.exception("Admin applications error")
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
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        applications.update_one(
            {"enrollment_number": uid, "status": "pending"},
            {"$set": {"status": "approved"}},
        )

    except DuplicateKeyError:
        return jsonify(error="Account already exists"), 409

    except PyMongoError:
        app.logger.exception("Create account failed")
        return jsonify(
            error="Database error creating account"
        ), 503

    student_name = application.get("full_name", "Student")
    student_email = application.get("email", "")

    approval_email_sent = send_admission_email(
        student_name,
        student_email,
        uid,
    )
    account_email_sent = send_account_email(
        student_name,
        student_email,
        uid,
    )

    return jsonify(
        message="Student account created",
        email_sent=approval_email_sent or account_email_sent,
        approval_email_sent=approval_email_sent,
        account_email_sent=account_email_sent,
    ), 201


@app.post("/api/admin/applications/<enrollment>/reject")
@required("admin")
def reject_application(enrollment):
    try:
        application = applications.find_one({
            "enrollment_number": enrollment,
            "status": "pending",
        })

        if not application:
            return jsonify(
                error="Pending application not found"
            ), 404

        result = applications.update_one(
            {
                "enrollment_number": enrollment,
                "status": "pending",
            },
            {"$set": {
                "status": "rejected",
                "rejected_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

        if not result.matched_count:
            return jsonify(
                error="Application status changed; refresh and retry"
            ), 409

    except PyMongoError:
        app.logger.exception("Reject application failed")
        return jsonify(error="Database connection error"), 503

    email_sent = send_rejection_email(
        application.get("full_name", "Student"),
        application.get("email", ""),
        enrollment,
    )

    return jsonify(
        message="Application rejected",
        email_sent=email_sent,
    ), 200


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
        app.logger.exception("Admin students error")
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

    if "email" in updates and not valid_email(updates["email"]):
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
        app.logger.exception("Update student failed")
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
        app.logger.exception("Publish notice failed")
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
        app.logger.exception("Admin notices error")
        return jsonify(error="Database connection error"), 503


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
    )
