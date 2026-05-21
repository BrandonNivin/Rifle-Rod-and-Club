# Rifle, Rod, and Club

## Overview

Rifle, Rod, and Club is a full-stack web application built for sharing content related to firearms, fishing, outdoor gear, and general outdoor lifestyle topics.

The project was built using Node.js, Express, PostgreSQL, and vanilla frontend technologies. It includes a custom admin panel for creating and managing blog posts, image uploads, and database-driven content rendering.

The goal of this project was to build a lightweight content management system without relying on large frontend frameworks.

---

# Features

* Full blog post creation and management
* PostgreSQL database integration
* Admin authentication using environment variables
* Image uploads using Multer
* Edit and delete functionality for posts
* Responsive frontend design
* REST-style backend routes
* Rate limiting for basic request protection

---

# Tech Stack

## Backend

* Node.js
* Express.js
* PostgreSQL
* Multer
* dotenv

## Frontend

* HTML
* CSS
* JavaScript

---

# Project Structure

```text
Rifle-Rod-and-Club/
│
├── public/
│   ├── uploads/
│   ├── index.html
│   ├── admin.html
│   ├── style.css
│   └── script.js
│
├── server.js
├── package.json
├── package-lock.json
└── .env
```

---

# Installation

## Clone the Repository

```bash
git clone https://github.com/BrandonNivin/Rifle-Rod-and-Club.git
```

---

## Install Dependencies

```bash
npm install
```

---

# PostgreSQL Setup

Create a PostgreSQL database for the project.

Example:

```sql
CREATE DATABASE riflerodclub;
```

Then create the required posts table:

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# Environment Variables

Create a `.env` file in the root directory.

Example:

```env
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=riflerodclub

ADMIN_PASSWORD=your_admin_password
PORT=3000
```

---

# Running the Project

Start the server with:

```bash
node server.js
```

or with nodemon:

```bash
npx nodemon server.js
```

The application will run on:

```text
http://localhost:3000
```

---

# Admin Panel

The admin page allows authenticated users to:

* Create blog posts
* Upload images
* Edit existing posts
* Delete posts

The admin password is validated using the `ADMIN_PASSWORD` value stored in the `.env` file.

---

# Image Uploads

Uploaded images are stored inside:

```text
public/uploads/
```

Because uploaded files are generated locally, the uploads folder should not be committed to GitHub.

Recommended `.gitignore`:

```gitignore
node_modules/
.env
public/uploads/
```

---

# API Routes

## Get All Posts

```http
GET /posts
```

---

## Create Post

```http
POST /posts
```

---

## Update Post

```http
PUT /posts/:id
```

---

## Delete Post

```http
DELETE /posts/:id
```

---

# Future Improvements

Some future improvements planned for the project include:

* User authentication and accounts
* Comment system
* Post categories and tags
* Search functionality
* Rich text editor support
* Cloud image storage
* Better mobile responsiveness

---

# Summary

This project was built to practice full-stack web development concepts including backend routing, database integration, file uploads, and CRUD operations using Node.js and PostgreSQL.

Instead of relying on large frontend frameworks, the application uses a simpler structure with vanilla HTML, CSS, and JavaScript to keep the project lightweight and easier to understand.
