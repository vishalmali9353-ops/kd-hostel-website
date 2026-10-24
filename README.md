K. D. Hostel Management System

A web-based hostel management project for K. D. Hostel, near K. D. Polytechnic, Patan, Gujarat.

Project Overview

The K. D. Hostel Management System is designed to provide hostel information and support student and administrator login through a web application.

Features

- Hostel home page
- Boys Hostel information
- Girls Hostel information
- About the hostel
- Hostel facilities
- Contact information
- Student registration page
- Student login page
- Admin login and dashboard
- Student profile and hostel status (backend integration in progress)

Technology Stack

Frontend

- HTML5
- CSS3
- Bootstrap 5
- JavaScript

Backend

- Python
- Flask
- Gunicorn

Database

- MongoDB Atlas
- PyMongo

Hosting

- GitHub Pages for the frontend
- Render for the backend (planned)

Project Structure

kd-hostel-management/
├── frontend/
│   ├── html/
│   │   ├── index.html
│   │   ├── about.html
│   │   ├── admin-dashboard.html
│   │   ├── boys-hostel.html
│   │   ├── girls-hostel.html
│   │   ├── facilities.html
│   │   ├── contact.html
│   │   ├── login.html
│   │   └── register.html
│   ├── css/
│   │   └── style.css
│   ├── javascript/
│   │   └── script.js
│   └── images/
│       └── kd-hostel-logo.png
└── backend/
    ├── app.py
    └── requirements.txt

Login System

Student Login

- User ID: Student enrollment number
- Initial password: "1234" (planned)
- Students should only be able to access their own profile and information.

Admin Login

- Admin ID: "YRP"
- Admin password: Configured privately on the backend server.
- The administrator will manage student information and hostel status.

Security: Initial credentials are for development only. Passwords must be handled securely on the backend. Never store passwords, database credentials, or secret keys in public frontend files or this README.

Database Setup

The project is planned to use MongoDB Atlas.

1. Create a MongoDB Atlas deployment.
2. Create a database user.
3. Configure network access securely.
4. Set the MongoDB connection string as a private environment variable on the backend host.
5. Add student records securely before enabling student login.

Backend Environment Variables

Configure these privately in the backend hosting dashboard:

- "MONGO_URI" — MongoDB connection string
- "SECRET_KEY" — a strong, randomly generated secret
- "ADMIN_PASSWORD" — the administrator password

Do not commit real secret values to GitHub.

Running the Backend Locally

Install the dependencies:

pip install -r backend/requirements.txt

Set the required environment variables, then run:

python backend/app.py

The API root should return a status message when the backend is running.

Deployment Plan

1. Complete the MongoDB Atlas setup.
2. Configure private environment variables.
3. Deploy the Flask backend on Render.
4. Connect the frontend login forms to the deployed API.
5. Implement and test the student and admin dashboards.
6. Test authentication and authorization before public use.

Current Status

- [x] Frontend HTML pages created
- [x] Backend "app.py" created
- [x] Backend "requirements.txt" created
- [ ] MongoDB Atlas configured
- [ ] Backend deployed on Render
- [ ] Student records added securely
- [ ] Login system tested
- [ ] Student dashboard connected
- [ ] Admin dashboard connected

Hostel Contact Information

K. D. Hostel
Near K. D. Polytechnic, Hemchandracharya North Gujarat University Road, Patan – 384265, Gujarat, India.

- Phone: 02766-220419
- Email: kdhostel-patan@gujarat.gov.in

Disclaimer

This project is under development. Login, database, and dashboard functionality must be configured and tested before the system is used with real student information.
