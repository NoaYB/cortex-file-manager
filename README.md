# Cortex File Manager

**Fullstack File Management Application (GCP / Firebase)**

---

## Overview

Cortex File Manager is a fullstack web application designed to manage user-uploaded files  efficiently, with a strong focus on **backend design**, **cloud deployment**, and **authentication**.

The system allows users to upload, browse, search, download, and delete files while ensuring strict access control. Administrative users can monitor all uploaded files across the system without modifying user-owned data.

The application is fully deployed on **Google Cloud Platform**, using **Cloud Run** for the backend and **Firebase Hosting** for the frontend.

---

## Motivation

Modern applications frequently require secure handling of user-uploaded files while enforcing:

- **Strong authentication** with industry-standard identity providers
- **User-level data isolation** to prevent unauthorized access
- **Administrative visibility** without elevated modification privileges
- **Cloud-native scalability and reliability** for production workloads

This project demonstrates how to build a **production-ready file management system** using GCP-native services while keeping the frontend minimal and functional.

---

## System Architecture

The system follows a clean, cloud-native architecture:

```
┌──────────────────────────────────────────┐
│ Frontend (React + Vite)                  │
│ • Firebase Hosting                       │
│ • Google Sign-In (Firebase Auth)         │
└───────────────┬──────────────────────────┘
                │ HTTPS (JWT)
                ▼
┌──────────────────────────────────────────┐
│ Backend (FastAPI)                        │
│ • Google Cloud Run                       │
│ • JWT validation (Firebase Admin SDK)   │
│ • Role-based authorization               │
└───────────────┬──────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────┐
│ Storage Layer                            │
│ • Google Cloud Storage                   │
│ • Per-user file isolation                │
└──────────────────────────────────────────┘
```

---

## Core Components

### Backend (FastAPI + Cloud Run)

**Purpose**: Secure file management API

**Key Features**:

- Google Sign-In authentication (Firebase Auth)
- JWT verification using Firebase Admin SDK
- User-based file isolation using Firebase `uid`
- Admin role detection via environment variables
- RESTful API for upload, list, download, and delete
- Deployed  on Cloud Run

**API Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/me` | Authenticated user info (`uid`, `email`, `is_admin`) |
| POST | `/upload` | Upload files (`.txt`, `.json`, `.pdf`) |
| GET | `/files` | List files with filters and sorting |
| GET | `/files/{id}/download` | Download file by ID |
| DELETE | `/files/{id}` | Delete file (owner only) |

**Technical Stack**:
- Python 3.11+
- FastAPI framework
- Firebase Admin SDK
- Google Cloud Storage client library
- Uvicorn ASGI server

---

### Frontend (React + Vite + Firebase Hosting)

**Purpose**: Minimal UI for interacting with the backend

**Key Features**:

- Google Sign-In authentication
- File upload (single & multiple)
- File listing with advanced features:
  - Search by name (case-insensitive)
  - Filter by file type (`.txt`, `.json`, `.pdf`)
  - Sort by date or size
- Download and delete actions
- Admin-only file visibility (read-only mode)
- Fully deployed on Firebase Hosting

**Technical Stack**:
- React 18
- TypeScript
- Vite for build tooling
- Firebase SDK (Authentication)
- Modern ES6+ JavaScript

---

### Storage Layer (Google Cloud Storage)

**Why Cloud Storage?**

- Native GCP integration with Cloud Run
- High durability 
- Automatic scalability
- Simple object-based access model
- Cost-effective for file storage at scale


This ensures **strict user isolation** while allowing admin-level visibility across all user directories.

**Benefits of This Structure**:
- Each user's files are isolated by their unique Firebase `uid`
- File collisions are prevented using UUID prefixing
- Original filenames are preserved for user convenience
- Admin queries can traverse all `uid` directories for monitoring

---

## Authentication & Authorization

**Authentication Flow**:
1. User signs in with Google via Firebase Authentication
2. Frontend receives JWT token from Firebase
3. JWT included in `Authorization: Bearer <token>` header for all API requests
4. Backend validates JWT using Firebase Admin SDK
5. User identity (`uid`, `email`) extracted from verified token

**Authorization Rules**:

| Role | Upload | View Own Files | Delete Own Files | View All Files | Delete Others' Files |
|------|--------|----------------|------------------|----------------|----------------------|
| **User** | V      | V              | V                | X              | X                    |
| **Admin** | V      | V              | V                | V (read-only)  | X                    |

**Key Security Features**:
- Users can access **only their own files** for modification
- Admins can **view all files** for monitoring purposes
- Admins **cannot upload, delete, or modify** files they do not own
- All operations require valid JWT authentication
- Backend enforces authorization at the API level, not relying on frontend restrictions

---

## Deployment

### Live Deployment URLs

**Frontend (Firebase Hosting)**:  
🌐 [https://sixth-tribute-481218-f0.web.app](https://sixth-tribute-481218-f0.web.app)

**Backend (Cloud Run)**:  
 [https://cortex-backend-478973527810.europe-west1.run.app](https://cortex-backend-478973527810.europe-west1.run.app)

### Deployment Architecture

**Backend Deployment**:
- Containerized FastAPI application
- Deployed to Google Cloud Run 
- Automatic scaling based on request load
- HTTPS endpoint with managed SSL certificates
- Environment variables configured via Cloud Run console

**Frontend Deployment**:
- Static React application built with Vite
- Deployed to Firebase Hosting
- Global CDN distribution
- Custom domain support
- Automatic HTTPS with Firebase SSL certificates

---

## Installation & Setup

### Prerequisites

**Required Tools**:
- Node.js 18+
- Python 3.11+
- Google Cloud SDK (`gcloud` CLI)
- Firebase CLI (`firebase-tools`)

**Required GCP Services**:
- Cloud Run enabled
- Cloud Storage enabled
- Firebase Authentication enabled
- Service Account with appropriate permissions

---

### Backend – Local Setup

**Step 1**: Navigate to backend directory
```bash
cd backend
```

**Step 2**: Create virtual environment
```bash
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows
```

**Step 3**: Install dependencies
```bash
pip install -r requirements.txt
```

**Step 4**: Configure environment variables
Create a `.env` file in the `backend` directory:
```env
BUCKET=your-gcs-bucket-name
ADMIN_EMAILS=admin1@example.com,admin2@example.com
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend-url.web.app
```

**Step 5**: Set up Firebase credentials
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

**Step 6**: Start development server
```bash
uvicorn main:app --reload
```

Backend runs on: `http://localhost:8000`

---

### Frontend – Local Setup

**Step 1**: Navigate to frontend directory
```bash
cd frontend
```

**Step 2**: Install dependencies
```bash
npm install
```

**Step 3**: Configure environment variables
Create a `.env` file in the `frontend` directory:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

**Step 4**: Start development server
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## Environment Variables

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BUCKET` | Google Cloud Storage bucket name | `cortex-file-storage` |
| `ADMIN_EMAILS` | Comma-separated list of admin emails | `admin@example.com,user@domain.com` |
| `ALLOWED_ORIGINS` | Allowed CORS origins (Firebase + local) | `https://app.web.app,http://localhost:5173` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key (local dev only) | `/path/to/key.json` |

**Example Production Configuration**:
```env
BUCKET=cortex-file-storage-prod
ADMIN_EMAILS=admin@company.com,security@company.com
ALLOWED_ORIGINS=https://sixth-tribute-481218-f0.web.app,https://sixth-tribute-481218-f0.firebaseapp.com
```

---

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Cloud Run backend URL | `https://backend.run.app` |
| `VITE_FIREBASE_API_KEY` | Firebase project API key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `project-id-12345` |

---

## Redeployment Guide

### Backend Redeployment (Cloud Run)

**Step 1**: Build and tag Docker image
```bash
cd backend
docker build -t gcr.io/PROJECT_ID/cortex-backend .
```

**Step 2**: Push to Google Container Registry
```bash
docker push gcr.io/PROJECT_ID/cortex-backend
```

**Step 3**: Deploy to Cloud Run
```bash
gcloud run deploy cortex-backend \
  --image gcr.io/PROJECT_ID/cortex-backend \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars BUCKET=your-bucket,ADMIN_EMAILS=admin@example.com
```

---

### Frontend Redeployment (Firebase Hosting)

**Step 1**: Build production bundle
```bash
cd frontend
npm run build
```

**Step 2**: Deploy to Firebase
```bash
firebase deploy --only hosting
```

**Note**: Ensure environment variables are configured in `.env.production` before building.

---

### CORS Configuration

CORS is controlled via the `ALLOWED_ORIGINS` environment variable in the backend.

**To update CORS origins**:
1. Navigate to Cloud Run console
2. Select the `cortex-backend` service
3. Click "Edit & Deploy New Revision"
4. Update the `ALLOWED_ORIGINS` environment variable
5. Deploy the new revision

**Important**: Always include both Firebase Hosting URLs and local development URL during active development.

---

### Cloud Storage Maintenance

**To clear test data**:
```bash
gsutil -m rm -r gs://your-bucket-name/**
```

**To backup bucket contents**:
```bash
gsutil -m cp -r gs://source-bucket gs://backup-bucket
```

**Note**: The bucket can be safely cleared between test runs without affecting the application structure.

---



## API Reference

### Authentication

All endpoints (except health check) require a valid Firebase JWT token:

```http
Authorization: Bearer <firebase-jwt-token>
```

---

### GET /

**Description**: Health check endpoint

**Response**:
```json
{
  "status": "healthy",
  "service": "cortex-file-manager"
}
```

---

### GET /me

**Description**: Get authenticated user information

**Response**:
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "is_admin": false
}
```

---

### POST /upload

**Description**: Upload one or more files

**Headers**:
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <token>`

**Form Data**:
- `files`: File(s) to upload (max: `.txt`, `.json`, `.pdf`)

**Response**:
```json
{
  "uploaded": [
    {
      "id": "uuid-generated-id",
      "name": "document.pdf",
      "size": 102400,
      "type": "application/pdf",
      "uploaded_at": "2025-12-18T10:30:00Z"
    }
  ]
}
```

---

### GET /files

**Description**: List files with optional filters

**Query Parameters**:
- `search`: Filter by filename (case-insensitive)
- `type`: Filter by file type (e.g., `application/pdf`)
- `sort_by`: Sort field (`date` or `size`)
- `order`: Sort order (`asc` or `desc`)

**Example**:
```
GET /files?search=report&type=application/pdf&sort_by=date&order=desc
```

**Response**:
```json
{
  "files": [
    {
      "id": "uuid-1",
      "name": "report.pdf",
      "size": 204800,
      "type": "application/pdf",
      "uploaded_at": "2025-12-18T10:30:00Z",
      "owner": "user@example.com"
    }
  ],
  "total": 1
}
```

---

### GET /files/{id}/download

**Description**: Download a file by ID

**Response**: File content with appropriate `Content-Type` header

---

### DELETE /files/{id}

**Description**: Delete a file (owner only)

**Response**:
```json
{
  "message": "File deleted successfully",
  "id": "uuid-1"
}
```

**Error Response** (non-owner):
```json
{
  "detail": "You can only delete your own files"
}
```

---

## Troubleshooting

### Backend Issues

**Problem**: JWT validation fails  
**Solution**: Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account key

**Problem**: CORS errors in browser  
**Solution**: Verify `ALLOWED_ORIGINS` includes your frontend URL

**Problem**: Cloud Storage access denied  
**Solution**: Check service account has `Storage Object Admin` role

---

### Frontend Issues

**Problem**: Google Sign-In not working  
**Solution**: Verify Firebase configuration in `.env` file

**Problem**: API requests failing  
**Solution**: Check `VITE_BACKEND_URL` points to correct backend URL

**Problem**: Files not uploading  
**Solution**: Verify file type is one of: `.txt`, `.json`, `.pdf`

---

### Deployment Issues

**Problem**: Cloud Run deployment fails  
**Solution**: Check Docker image builds successfully locally first

**Problem**: Firebase hosting shows old version  
**Solution**: Clear cache: `firebase hosting:channel:delete preview`

**Problem**: Environment variables not updating  
**Solution**: Deploy new Cloud Run revision after updating variables

---

## Security Considerations

**Authentication**:
- All API requests require valid Firebase JWT
- Tokens expire after 1 hour (Firebase default)
- Token validation happens on every request

**Authorization**:
- File access enforced at the storage layer using `uid` prefixes
- Backend validates ownership before any file operation
- Admin privileges limited to read-only operations

**Data Privacy**:
- User files isolated by Firebase `uid`
- No user can access another user's files (except admins, read-only)
- All communication over HTTPS

**Input Validation**:
- File type validation on upload
- Filename sanitization
- Size limits enforced (adjust in backend config)

---

## Performance Optimization

**Backend**:
- Cloud Run auto-scales based on demand (0 to N instances)
- Cold start time: ~2-3 seconds
- Warm instance response time: <100ms

**Frontend**:
- Vite production builds with tree-shaking
- Firebase Hosting CDN with global distribution
- Lazy loading for large file lists (can be implemented)

**Storage**:
- Cloud Storage provides consistent low-latency access
- Parallel uploads supported for multiple files
- Streaming downloads for large files

---



---

## About

This project was built as part of a **Fullstack Backend Home Task**, focusing on:

- Backend robustness and API design
- Cloud architecture and deployment
- Authentication & security best practices
- Clean, maintainable code structure

---

## Contributors

**Noa Y.** – Fullstack Development & Cloud Architecture

---

## Technologies Used

**Backend**:
- Python 3.11
- FastAPI
- Firebase Admin SDK
- Google Cloud Storage Client
- Uvicorn ASGI Server

**Frontend**:
- React 18
- TypeScript
- Vite
- Firebase SDK (Authentication)

**Cloud & Infrastructure**:
- Google Cloud Run
- Google Cloud Storage
- Firebase Hosting
- Firebase Authentication

---
