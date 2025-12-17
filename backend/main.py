import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import google.auth
from google.auth.transport.requests import Request

import firebase_admin
from firebase_admin import credentials, auth

from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

from google.cloud import storage
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger("uvicorn.error")

# ----------------------------
# Cloud Storage setup
# ----------------------------
BUCKET_NAME = os.getenv("BUCKET")
if not BUCKET_NAME:
    raise RuntimeError("BUCKET env var not set")

# IMPORTANT:

storage_client = storage.Client()
bucket = storage_client.bucket(BUCKET_NAME)

ALLOWED_EXTENSIONS = {"txt", "json", "pdf"}

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "").split(",")
    if e.strip()
}

# ----------------------------
# App
# ----------------------------
app = FastAPI()

allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,"
    "https://sixth-tribute-481218-f0.web.app,https://sixth-tribute-481218-f0.firebaseapp.com",
)

allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Firebase initialization
# ----------------------------
if not firebase_admin._apps:
    if os.getenv("K_SERVICE"):  # Cloud Run
        firebase_admin.initialize_app()
    else:  # local dev
        if os.path.exists("serviceAccountKey.json"):
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

# ----------------------------
# Helpers
# ----------------------------
def is_admin(decoded_token: dict) -> bool:
    email = (decoded_token.get("email") or "").lower()
    return email in ADMIN_EMAILS if ADMIN_EMAILS else False


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = auth.verify_id_token(token)
    except Exception as e:
        print("AUTH ERROR:", repr(e))
        raise HTTPException(status_code=401, detail="Unauthorized")

    decoded["is_admin"] = is_admin(decoded)
    return decoded


def validate_file_ext(filename: str) -> str:
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only .txt, .json, .pdf are allowed",
        )
    return ext


def blob_to_item(blob: storage.Blob) -> Dict[str, Any]:
    name = blob.name.split("/", 1)[-1]
    uid = blob.name.split("/", 1)[0]

    return {
        "filename": name,
        "ext": name.split(".")[-1].lower(),
        "object_name": blob.name,
        "bucket": BUCKET_NAME,
        "size": blob.size,
        "content_type": blob.content_type,
        "updated_at": blob.updated,
        "uid": uid,
    }

# ----------------------------
# Health
# ----------------------------
@app.get("/")
def health():
    return {"status": "ok"}

# ----------------------------
# Auth test
# ----------------------------
@app.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "uid": user["uid"],
        "email": user.get("email"),
        "is_admin": user.get("is_admin", False),
    }

# ----------------------------
# Upload
# ----------------------------
@app.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    user=Depends(get_current_user),
):
    uid = user["uid"]
    results = []

    for f in files:
        validate_file_ext(f.filename)

        object_name = f"{uid}/{uuid.uuid4()}_{f.filename}"
        blob = bucket.blob(object_name)

        blob.upload_from_file(
            f.file,
            content_type=f.content_type,
        )
        blob.reload()

        results.append(
            {
                "object_name": object_name,
                "filename": f.filename,
                "size": blob.size,
                "content_type": blob.content_type,
                "updated_at": blob.updated,
            }
        )

    return {"uploaded": results}

# ----------------------------
# List files
# ----------------------------
@app.get("/files")
def list_files(
    q: Optional[str] = None,
    file_type: Optional[str] = None,
    sort_by: str = "date",
    order: str = "desc",
    user=Depends(get_current_user),
):
    uid = user["uid"]
    admin = user["is_admin"]

    prefix = "" if admin else f"{uid}/"
    blobs = list(bucket.list_blobs(prefix=prefix))
    items = [blob_to_item(b) for b in blobs]

    if file_type:
        items = [i for i in items if i["ext"] == file_type]

    if q:
        q = q.lower()
        items = [i for i in items if q in i["filename"].lower()]

    reverse = order != "asc"
    if sort_by == "size":
        items.sort(key=lambda x: x["size"] or 0, reverse=reverse)
    else:
        items.sort(
            key=lambda x: x["updated_at"]
            or datetime(1970, 1, 1, tzinfo=timezone.utc),
            reverse=reverse,
        )

    return {"files": items, "admin": admin}

# ----------------------------
# Download (signed URL)
# ----------------------------
@app.get("/files/{object_name:path}/download")
def download_file(
    object_name: str,
    user=Depends(get_current_user),
):
    blob = bucket.blob(object_name)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_uid = object_name.split("/", 1)[0]
    if not user["is_admin"] and file_uid != user["uid"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    #  Cloud Run: ××™×Ÿ private key, ×œ×›×Ÿ ×ž×©×ª×ž×©×™× ×‘-IAM Credentials ×›×“×™ ×œ×—×ª×•×
    credentials, _ = google.auth.default()
    credentials.refresh(Request())

    service_account_email = getattr(credentials, "service_account_email", None)
    if not service_account_email:
        raise HTTPException(
            status_code=500,
            detail="Missing service_account_email in ADC credentials (cannot sign URL).",
        )

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=10),
        method="GET",
        service_account_email=service_account_email,
        access_token=credentials.token,
        response_disposition=f'attachment; filename="{object_name.split("/",1)[-1]}"',
    )

    return {"url": url}

# ----------------------------
# Delete
# ----------------------------
@app.delete("/files/{object_name:path}")
def delete_file(
    object_name: str,
    user=Depends(get_current_user),
):
    blob = bucket.blob(object_name)

    if not blob.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_uid = object_name.split("/", 1)[0]

    # Admin is NOT allowed to delete other users' files (and also users can't delete others)
    if file_uid != user["uid"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    blob.delete()
    return {"deleted": True, "object_name": object_name}