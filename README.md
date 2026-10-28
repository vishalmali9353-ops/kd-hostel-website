<div align="center">

<img src="Frontend/images/kd-hostel-logo.png" alt="K.D. Hostel Logo" width="160">

# 🏨 K.D. Hostel Management System

**A smart, secure and user-friendly full-stack web application that digitizes hostel administration at K. D. Polytechnic, Patan.**

![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20Bootstrap%20%7C%20JS-F0B323?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Python%20Flask-0B2D59?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deployed-GitHub%20Pages%20%2B%20Render-181717?style=for-the-badge)

[🌐 Live Demo](https://vishalmali9353-ops.github.io/kd-hostel-website/) · [💻 Source Code](https://github.com/vishalmali9353-ops/kd-hostel-website) · [🐞 Report Issue](https://github.com/vishalmali9353-ops/kd-hostel-website/issues)

</div>

---

## 📋 Project Snapshot

| | |
|---|---|
| **Project** | K.D. Hostel Management System |
| **Type** | Full-stack web application (Academic project) |
| **Institution** | K. D. Polytechnic, Patan, Gujarat |
| **Program** | Diploma in Computer Engineering |
| **Role** | Full-Stack Developer (UI design, REST API, database, deployment) |
| **Status** | Frontend live · Backend modules in progress |

---

## 📌 About the Project

Hostel administration at the college relied on manual paperwork for admissions, room allotment, notices and fee tracking. This project replaces that with a **centralized web platform** where students can apply, track their status and view hostel information, while administrators manage everything from a single dashboard.

**Goals**

- Digitize hostel admission and student registration
- Provide secure student and administrator login
- Manage rooms, capacity and allotments
- Publish notices and announcements
- Give every student a personalized dashboard
- Improve transparency and administrative efficiency

---

## ✨ Key Features

<table>
<tr>
<td width="33%" valign="top">

### 🏠 Public Website
- Home page and hostel introduction
- Separate **Boys** and **Girls** hostel pages
- Facilities and photo gallery
- Admission information and form
- Notices and announcements
- Contact information

</td>
<td width="33%" valign="top">

### 👨‍🎓 Student Portal
- Registration and secure login
- Admission application status
- Profile and personal details
- Room details and allotment status
- Hostel fee status
- Notices and updates

</td>
<td width="33%" valign="top">

### 🛡️ Admin Dashboard
- Administrator authentication
- View and manage student records
- Review and approve applications
- Manage room allocation and availability
- Publish hostel notices
- Update admission and fee status

</td>
</tr>
</table>

> Features reflect the modules currently implemented and deployed.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, Bootstrap, JavaScript |
| **Backend** | Python, Flask (REST API) |
| **Database** | MongoDB Atlas (cloud) |
| **Version Control** | Git, GitHub |
| **Hosting** | GitHub Pages (frontend), Render (backend API) |

---

## 🏗️ System Architecture

```
┌──────────────┐    HTTPS / JSON    ┌───────────────┐     PyMongo     ┌───────────────┐
│   Frontend   │ ─────────────────► │  Flask REST   │ ──────────────► │ MongoDB Atlas │
│ GitHub Pages │ ◄───────────────── │  API (Render) │ ◄────────────── │   Database    │
└──────────────┘                    └───────────────┘                 └───────────────┘
   Students / Admin                  Auth · Logic · Validation          Students · Rooms · Notices
```

---

## 📸 Screenshots

| Home Page | Student Dashboard | Admin Dashboard |
|---|---|---|
| ![Home](Frontend/images/screenshots/home.png) | ![Student](Frontend/images/screenshots/student.png) | ![Admin](Frontend/images/screenshots/admin.png) |

> Add your screenshots in `Frontend/images/screenshots/`.

---

## 📂 Project Structure

```
kd-hostel-website/
├── README.md
├── Frontend/
│   ├── html/
│   │   ├── index.html
│   │   ├── about.html
│   │   ├── boys-hostel.html
│   │   ├── girls-hostel.html
│   │   ├── facilities.html
│   │   ├── contact.html
│   │   ├── login.html
│   │   ├── register.html
│   │   └── admin-dashboard.html
│   ├── css/style.css
│   ├── javascript/script.js
│   └── images/kd-hostel-logo.png
└── backend/
    ├── app.py
    └── requirements.txt
```

---

## ⚙️ Getting Started

**1. Clone the repository**
```bash
git clone https://github.com/vishalmali9353-ops/kd-hostel-website.git
cd kd-hostel-website
```

**2. Run the frontend**
Open `Frontend/html/index.html` in your browser, or use a local server.

**3. Set up the backend**
```bash
cd backend
pip install -r requirements.txt
```

**4. Configure environment variables**
```env
MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_secret_key
ADMIN_PASSWORD=your_admin_password
```
> 🔒 Never commit credentials, secret keys or admin passwords to GitHub.

**5. Start the API**
```bash
python app.py
```

---

## 🌐 Live Deployment

| Service | Link |
|---|---|
| Frontend | https://vishalmali9353-ops.github.io/kd-hostel-website/ |
| Backend API | _Add your Render URL here_ |
| Repository | https://github.com/vishalmali9353-ops/kd-hostel-website |

---

## 💼 Skills Demonstrated

- **Web development:** responsive, multi-page UI with Bootstrap
- **Backend engineering:** REST API design with Flask, authentication and role-based access (student / admin)
- **Database design:** NoSQL data modeling with MongoDB Atlas
- **Deployment:** frontend and backend hosted separately on GitHub Pages and Render
- **Security practice:** environment variables for secrets, no credentials in source control
- **Tooling:** Git and GitHub workflow

---

## 🔮 Roadmap

- [ ] Automated admission confirmation emails
- [ ] Online fee payment integration
- [ ] Room availability reports
- [ ] Digital hostel attendance
- [ ] Downloadable admission receipts
- [ ] Improved mobile experience
- [ ] Advanced administrative reports

---

## 👨‍💻 Developer

**Your Name**
Diploma in Computer Engineering · K. D. Polytechnic, Patan

[![GitHub](https://img.shields.io/badge/GitHub-vishalmali9353--ops-181717?style=flat&logo=github)](https://github.com/vishalmali9353-ops)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/your-profile)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=flat&logo=gmail&logoColor=white)](mailto:your-email@example.com)

---

<div align="center">

**🏨 K.D. HOSTEL — Safe • Comfortable • Disciplined**

_Making Hostel Management Smarter and Simpler._

⭐ If you like this project, give it a star!

</div>
