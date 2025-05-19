# Complaint and Feedback Management System

A full-stack web application designed to collect, manage, and respond to complaints and feedback from affected populations in humanitarian settings. The system supports multilingual interfaces, attachments, role-based access, and complaint tracking.

## Features

- Public complaint submission (anonymous or with personal info)
- Multilingual support (Arabic and English)
- Role-based access (Admin, Staff, Complainant)
- Complaint tracking with status updates
- File attachments (PDF, images)
- Email and in-app notifications
- Categorization and auto-response suggestions (future)
- Admin dashboard with filtering and report exports
- Secure authentication and authorization
- Dockerized environment for easy deployment

## Tech Stack

- **Backend:** Node.js, Express (ES Modules)
- **Database:** PostgreSQL
- **Frontend:** EJS templates, HTML, CSS, JavaScript
- **Deployment:** Docker
- **Other Tools:** Power Automate (optional), Git, GitHub

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- Docker (optional)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/complaint-management-system.git
cd complaint-management-system

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# (edit .env with your DB and app settings)

# Run migrations and start the app
npm run dev
