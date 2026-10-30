<div align="center">

<img src="frontend/images/kd-hostel-logo.png" alt="K.D. Hostel Logo" width="140">

# K.D. Hostel Management System

**Smart • Secure • Simple Hostel Management**

A web-based hostel management system for **K.D. Polytechnic, Patan**

![Project](https://img.shields.io/badge/Project-Hostel%20Management-blue?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-orange?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Python%20Flask-green?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-MongoDB-brightgreen?style=for-the-badge)

</div>

---

## 📑 Table of Contents

- [About the Project](#-about-the-project)
- [Objectives](#-objectives)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [How It Works](#-how-it-works)
- [Installation & Setup](#-installation--setup)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Security](#-security)
- [Academic Information](#-academic-information)
- [Team](#-team)

---

## 📌 About the Project

The **K.D. Hostel Management System** digitizes hostel administration at K.D. Polytechnic, Patan. It provides one centralized platform for student admissions, student accounts, hostel information, room allocation and day-to-day administrative work.

Separate interfaces for **students** and **administrators** make hostel management faster, more organized and less paper-dependent.

## 🎯 Objectives

- Digitize the hostel admission process
- Simplify student registration and login
- Provide online admission approval
- Automate temporary password generation and email delivery
- Manage student records efficiently
- Simplify hostel room management
- Give students easy access to their hostel information

## ✨ Key Features

### 👨‍🎓 Student Module
- Online admission application
- Secure login with enrollment number and password
- Student dashboard and profile management
- Admission status tracking
- Hostel and room information

### 🛡️ Admin Module
- Secure administrator login and dashboard
- View and manage student records
- Review, approve or reject admission applications
- Auto-generate temporary student passwords
- Send login credentials to students by email
- Manage hostel rooms and room allotment

### 🏢 Hostel Management
- Boys and Girls hostel information
- Room availability and capacity management
- Student room allotment
- Facilities, gallery, notices and contact details

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling |
| Bootstrap 5 | Responsive UI |
| JavaScript | Frontend functionality |
| Python | Backend programming |
| Flask | Backend framework |
| MongoDB Atlas | Cloud database |
| PyMongo | Database connectivity |
| REST API | Frontend–backend communication |
| Email API | Student email communication |
| Render | Backend deployment |
| GitHub Pages | Frontend hosting |

## 📂 Project Structure

```text
kd-hostel-website/
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
│   ├── css/
│   ├── javascript/
│   └── images/
├── backend/
│   ├── app.py
│   └── requirements.txt
└── README.md
```

## 🔄 How It Works

1. Student visits the K.D. Hostel website.
2. Student submits an online admission application.
3. Application details are stored in MongoDB.
4. Administrator logs in to the admin dashboard.
5. Administrator reviews the pending application.
6. Administrator approves the application.
7. The system generates a temporary password.
8. Student receives login credentials by email.
9. Student logs in with enrollment number and password.
10. Student accesses the dashboard and hostel information.

## 🚀 Installation & Setup

**Prerequisites:** Python 3.9+, Git, and a MongoDB Atlas account.

**1. Clone the repository**

```bash
git clone https://github.com/vishalmali9353-ops/kd-hostel-website.git
cd kd-hostel-website
```

**2. Install backend dependencies**

```bash
cd backend
pip install -r requirements.txt
```

**3. Configure environment variables**

```env
MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_secret_key
ADMIN_PASSWORD=your_admin_password
```

> If email functionality is enabled, configure your email service credentials separately. Never commit secrets to the repository.

**4. Run the backend**

```bash
python app.py
```

The API will be available at `http://127.0.0.1:5000`.

**5. Run the frontend**

Open `frontend/html/index.html` in your browser (or serve the `frontend` folder with any static server, e.g. VS Code Live Server). Make sure the API base URL in the frontend JavaScript points to your running backend.

## 🌐 Deployment

| Component | Platform |
|---|---|
| Frontend | GitHub Pages |
| Backend API | Render |
| Database | MongoDB Atlas |


## 🔐 Security

- Password hashing for student accounts
- Token-based authentication
- Protected administrative APIs
- Environment variables for sensitive configuration
- Role-based access for students and administrators

## 🎓 Academic Information

| | |
|---|---|
| **Institute** | K.D. Polytechnic, Patan |
| **Department** | Computer Engineering |
| **Project Title** | K.D. Hostel Management System |
| **Project Type** | Web-Based Application |
| **Academic Level** | Diploma in Computer Engineering |

## 👨‍💻 Team

Developed as an academic minor project by:

- **Mali Vishal Shivabhai** — Team Leader
- **Ghariyala Lalaji Bhalaji**
- **Chauhan Nilesh Ganpat**

---

<div align="center">

**K.D. HOSTEL MANAGEMENT SYSTEM**
Making Hostel Management Smarter and Easier.

⭐ Thank you for visiting our project! ⭐

</div>
