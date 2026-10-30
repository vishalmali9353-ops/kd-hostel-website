🏛️ K.D. HOSTEL MANAGEMENT SYSTEM

<div align="center"><img src="frontend/images/kd-hostel-logo.png" width="135" alt="K.D. Hostel Logo">K.D. HOSTEL

HOSTEL MANAGEMENT SYSTEM

A Smart Digital Solution for Modern Hostel Administration

""Live Website" (https://img.shields.io/badge/🌐_Live_Website-Visit_Website-142B50?style=for-the-badge)" (https://vishalmali9353-ops.github.io/kd-hostel-website/)
""GitHub" (https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)" (https://github.com/vishalmali9353-ops/kd-hostel-website)

"HTML5" (https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
"CSS3" (https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
"Bootstrap" (https://img.shields.io/badge/Bootstrap-7952B3?style=flat-square&logo=bootstrap&logoColor=white)
"JavaScript" (https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
"Python" (https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
"Flask" (https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)
"MongoDB" (https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)

</div>

01 | PROJECT OVERVIEW

K.D. Hostel Management System is a modern, web-based application developed for K. D. Polytechnic, Patan.

The platform is designed to digitize and simplify hostel operations through a centralized system for student admission, administration, room allocation and student account management.

It provides dedicated dashboards for students and administrators, making hostel management more efficient, organized and accessible.

02 | CORE MODULES

<table>
<tr>
<td width="50%" valign="top">👨‍🎓 STUDENT PORTAL

- Online admission registration
- Secure student authentication
- Personal student dashboard
- Profile and enrollment details
- Admission status tracking
- Room and hostel information
- Student account access

</td>
<td width="50%" valign="top">🛡️ ADMIN PORTAL

- Secure admin authentication
- Administrative dashboard
- Admission application management
- Approve / Reject applications
- Student record management
- Temporary password generation
- Email credential delivery
- Room management

</td>
</tr>
<tr>
<td width="50%" valign="top">🏢 HOSTEL INFORMATION

- Boys Hostel
- Girls Hostel
- Hostel facilities
- Photo gallery
- Hostel notices
- Contact information

</td>
<td width="50%" valign="top">🛏️ ROOM MANAGEMENT

- Room availability
- Room capacity
- Student room allotment
- Room information management
- Hostel accommodation records

</td>
</tr>
</table>03 | ADMISSION WORKFLOW

flowchart TD
    A([Student Visits Website]) --> B[Submit Admission Form]
    B --> C[(MongoDB Database)]
    C --> D[Admin Reviews Application]
    D --> E{Admission Decision}
    E -->|Rejected| F[Application Rejected]
    E -->|Approved| G[Generate Temporary Password]
    G --> H[Send Credentials Through Email]
    H --> I[Student Login]
    I --> J[Student Dashboard]
    J --> K[View Profile and Hostel Details]

04 | TECHNOLOGY STACK

Layer| Technology| Purpose
Frontend| HTML5| Website structure
Styling| CSS3| Modern user interface
UI Framework| Bootstrap 5| Responsive design
Programming| JavaScript| Dynamic functionality
Backend| Python Flask| Application logic
Database| MongoDB Atlas| Student and hostel records
Database Driver| PyMongo| Database connectivity
Authentication| Token-based authentication| Secure access
Email| Email API| Student notifications
Frontend Hosting| GitHub Pages| Website deployment
Backend Hosting| Render| API hosting

05 | PROJECT STRUCTURE

KD-HOSTEL-MANAGEMENT-SYSTEM/
│
├── frontend/
│   ├── html/
│   │   ├── index.html
│   │   ├── about.html
│   │   ├── boys-hostel.html
│   │   ├── girls-hostel.html
│   │   ├── facilities.html
│   │   ├── gallery.html
│   │   ├── admission.html
│   │   ├── notices.html
│   │   ├── contact.html
│   │   ├── login.html
│   │   ├── admin-dashboard.html
│   │   └── student-dashboard.html
│   │
│   ├── css/
│   ├── javascript/
│   └── images/
│
├── backend/
│   ├── app.py
│   └── requirements.txt
│
└── README.md

06 | APPLICATION SECURITY

- Password hashing for student accounts.
- Token-based authentication.
- Protected administrative endpoints.
- Separate student and administrator access.
- Secure environment variable configuration.
- Database-backed student records.

07 | DEPLOYMENT ARCHITECTURE

<div align="center">Service| Platform
Frontend Website| GitHub Pages
Backend REST API| Render
Database| MongoDB Atlas
Email Notifications| Email API

</div>08 | LOCAL DEVELOPMENT SETUP

Step 1 — Clone Repository

git clone https://github.com/vishalmali9353-ops/kd-hostel-website.git

Step 2 — Install Backend Requirements

cd backend
pip install -r requirements.txt

Step 3 — Configure Environment Variables

MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_secret_key
ADMIN_PASSWORD=your_admin_password

Configure email credentials separately according to the backend implementation.

Step 4 — Start Backend

python app.py

Step 5 — Open Frontend

Open the frontend home page using a local web server and configure its API base URL to point to the running Flask backend.

09 | PROJECT SCREENSHOTS

Add actual screenshots of the deployed application below.

Website| Dashboard
Home Page| Admin Dashboard
Admission Form| Student Dashboard
Boys Hostel| Room Management
Girls Hostel| Student Login

10 | INSTITUTE INFORMATION

<div align="center">K. D. POLYTECHNIC, PATAN

DEPARTMENT OF COMPUTER ENGINEERING

Diploma Engineering Academic Project

Project Name: K.D. Hostel Management System

Project Domain: Web Application Development

</div>---

<div align="center">BUILT FOR SMARTER HOSTEL MANAGEMENT

K.D. HOSTEL MANAGEMENT SYSTEM

Simplifying Administration. Connecting Students. Managing Hostels.

<br>⭐ Thank You for Visiting Our Repository! ⭐

</div>
