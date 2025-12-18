# Cortex File Manager – Frontend

**Minimal React UI for Secure File Management**

---

## Overview

The frontend is a lightweight React + TypeScript application built with Vite, designed to interact with a secure backend API running on Google Cloud Run. It provides a clean interface for file management operations while delegating all security, authorization, and data handling to the backend.

**Live Deployment**: https://sixth-tribute-481218-f0.web.app

---

## Features

- Google Sign-In authentication via Firebase
- File upload (single and multiple)
- File browsing with search, filter, and sort
- Download and delete operations
- Role-aware UI (User vs Admin)
- Admin read-only access to all files

---

## Tech Stack

- React 18
- TypeScript
- Vite
- Firebase Authentication
- Firebase Hosting

---

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx              # Main application logic
│   ├── firebase.ts          # Firebase configuration
│   ├── api.ts               # Backend API calls
│   └── main.tsx             # React entry point
├── public/
├── dist/                    # Build output
├── package.json
└── vite.config.ts
```

---

## Installation

**Prerequisites**: Node.js 18+, npm, Firebase CLI

**Setup**:
```bash
cd frontend
npm install
```

**Environment Variables**:

Create `.env` file:
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

**Run locally**:
```bash
npm run dev
```

Application available at: `http://localhost:5173`

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Backend API endpoint | `http://localhost:8000` |
| `VITE_FIREBASE_API_KEY` | Firebase project API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `project-id-12345` |

---

## Build & Deployment

**Build for production**:
```bash
npm run build
```

**Deploy to Firebase Hosting**:
```bash
firebase deploy --only hosting
```

Changes are live immediately at: https://sixth-tribute-481218-f0.web.app

---

## Backend Integration

All API requests include Firebase authentication:

```typescript
const token = await user.getIdToken();

fetch(`${BACKEND_URL}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Backend Responsibilities**:
- JWT token validation
- User authorization
- File ownership enforcement
- Admin permissions

**Frontend Responsibilities**:
- Authentication UI
- File operations UI
- Role-aware rendering
- Error handling

---

## API Usage

**Upload File**:
```typescript
const formData = new FormData();
formData.append('files', fileObject);

fetch(`${BACKEND_URL}/upload`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**List Files**:
```typescript
const params = new URLSearchParams({
  search: 'report',
  type: 'application/pdf',
  sort_by: 'date',
  order: 'desc'
});

fetch(`${BACKEND_URL}/files?${params}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Download File**:
```typescript
fetch(`${BACKEND_URL}/files/${fileId}/download`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Delete File**:
```typescript
fetch(`${BACKEND_URL}/files/${fileId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Design Decisions

**Minimal UI**: Focus on backend design and cloud deployment over elaborate frontend features.

**No Client-Side Secrets**: Firebase configuration values are not secrets. Security is enforced by backend and Firebase security rules.

**Role-Aware UI**: UI adapts based on user role, but authorization is enforced server-side only.

**Firebase Hosting**: Chosen for seamless Firebase Auth integration, global CDN, automatic HTTPS, and simple deployment.

---

## Troubleshooting

**Network errors on upload**: Verify backend is running and `VITE_BACKEND_URL` is correct.

**Google Sign-In fails**: Check Firebase configuration in `.env` and ensure Google auth is enabled in Firebase Console.

**Unauthorized errors**: Verify token is being sent correctly and backend JWT validation is working.

**Build fails**: Clear node_modules and reinstall dependencies.

**Firebase deployment fails**: Re-authenticate with `firebase login --reauth` and verify project selection.

---

## Future Enhancements

- File preview (PDF/text/images)
- Pagination for large file lists
- Drag-and-drop upload
- Mobile-responsive design
- Dark mode

---

## About

This frontend was built as part of a Fullstack Backend Home Task, emphasizing clean architecture, cloud-native deployment, secure authentication, and backend-first security model.

**Author**: Noa Y. – Fullstack Developer

---

## Related Documentation

- [Main Project README](../README.md) – Complete system overview
- [Backend README](../backend/README.md) – Backend API documentation

---

## License

MIT License - see [LICENSE](../LICENSE) file for details.