# Security Guide

🌐 **[日本語版はこちら (Japanese)](./SECURITY.md)**

This document explains the security configuration for the TYPECAST project.

## Overview

TYPECAST implements the following security measures:

1. **Environment variable management for sensitive information**
2. **Data access control via Firestore Security Rules**
3. **Firebase API Key restrictions (recommended)**
4. **Production environment protection via GitHub Secrets**

---

## 1. Environment Variable Management

### Protecting Sensitive Information

The following files are excluded via `.gitignore` and are not included in the Git repository:

- `.env` - Local development environment variables
- `.env.local` - Local environment-specific settings
- `service-account.json` - GCP service account key
- `.cursorrules` - Cursor IDE configuration

### Required Environment Variables

#### Backend (`.env` in project root)

```bash
PORT=8080
GEMINI_API_KEY=your_gemini_api_key_here
TMDB_API_KEY=your_tmdb_api_key_here
VITE_FIREBASE_PROJECT_ID=your-project-id
FIRESTORE_DB_NAME=(default)
GEMINI_PROMPT_TEMPLATE_B64=base64_encoded_prompt
DAILY_RECOMMEND_LIMIT=5
ACCOUNT_RECREATE_COOLDOWN_HOURS=24
```

#### Frontend (`typecast-web/.env`)

```bash
VITE_API_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Important**: `firebase.ts` does not have hardcoded fallback values, so all environment variables are required. If not set, the application will fail at startup.

---

## 2. Firestore Security Rules

### Rules Overview

The `firestore.rules` file implements the following access controls:

#### users collection
- Read/Write: Own document only

#### history collection
- Read/Write: Own history only
- Owner determined by `user_id` field

#### share collection
- Read: Anyone (for share links)
- Create/Update/Delete: Own created items only

#### feedback collection
- Read/Write: Own feedback only

#### deleted_identities collection
- Read/Write: Not allowed (server-side only)

### Deploying Rules

```bash
# Deploy Firestore Rules only
firebase deploy --only firestore:rules

# Deploy everything (Hosting + Firestore Rules)
firebase deploy
```

### Testing Rules

You can test rules using the Rules Simulator in the Firebase Console under "Firestore Database > Rules" tab.

---

## 3. Firebase API Key Restrictions (Recommended)

Firebase Web API Keys are designed to be public, but it is strongly recommended to configure restrictions to prevent unauthorized use.

### Configuration Steps

1. **Access GCP Console**
   - https://console.cloud.google.com/
   - Select your project

2. **Open Credentials page**
   - Left menu > APIs & Services > Credentials

3. **Select Firebase Web API Key**
   - Select the key corresponding to `VITE_FIREBASE_API_KEY` from the API keys list

4. **Set Application restrictions**
   - Select "HTTP referrers (web sites)"
   - Add the following referrers:
     ```
     https://tycast.net/*
     https://*.tycast.net/*
     https://*.firebaseapp.com/*
     http://localhost:*/*
     ```

5. **Set API restrictions**
   - Select "Restrict key"
   - Enable the following APIs:
     - Identity Toolkit API
     - Token Service API
     - Cloud Firestore API
     - Firebase Installations API

6. **Save**

### Effects of Restrictions

- Prevents API key usage from domains other than specified
- Blocks unauthorized Firebase operations
- Prevents unauthorized quota consumption

---

## 4. GitHub Secrets Configuration

The following GitHub Secrets are required for production deployment:

### Common

- `GCP_PROJECT_ID` - GCP project ID
- `GCP_SA_KEY` - Service account JSON key (complete)

### Backend (Cloud Run)

- `GEMINI_API_KEY` - Gemini API key
- `TMDB_API_KEY` - TMDB API key
- `GEMINI_PROMPT_TEMPLATE_B64` - Base64-encoded prompt
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `FIRESTORE_DB_NAME` - Firestore database name
- `PROD_FRONTEND_URL` - Frontend URL (e.g., https://tycast.net)
- `PROD_API_BASE_URL` - Backend URL (e.g., https://typecast-api-xxx.run.app)
- `DAILY_RECOMMEND_LIMIT` - Daily recommendation limit

### Frontend (Firebase Hosting)

- `VITE_API_URL` - Backend API URL
- `VITE_FIREBASE_API_KEY` - Firebase Web API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase authentication domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase App ID

---

## 5. Security Checklist

Before deploying to production, verify the following:

### Required

- [ ] `.env` file is not included in Git repository
- [ ] `service-account.json` is not included in Git repository
- [ ] Firestore Security Rules are deployed
- [ ] All GitHub Secrets are configured
- [ ] Authorized domains are configured in Firebase Authentication

### Recommended

- [ ] Firebase API Key restrictions are configured
- [ ] Appropriate IAM permissions are set for Cloud Run service
- [ ] Firestore backups are enabled
- [ ] Error monitoring is configured in Cloud Logging

---

## 6. Incident Response

### If API Key is Leaked

1. **Immediately disable the key**
   - GCP Console > APIs & Services > Credentials
   - Delete or regenerate the affected key

2. **Generate a new key**
   - Create a new API key
   - Configure restrictions

3. **Update environment variables**
   - Local: Update `.env` file
   - Production: Update GitHub Secrets
   - Redeploy Cloud Run

4. **Investigate impact**
   - Check Cloud Logging for unauthorized access
   - Notify users if necessary

### If Unauthorized Access is Detected

1. **Verify Firestore Security Rules**
   - Confirm rules are correctly configured
   - Strengthen if necessary

2. **Investigate with Cloud Logging**
   - Identify unauthorized access patterns
   - Record IP addresses and user IDs

3. **Implement countermeasures**
   - Suspend affected user accounts
   - Strengthen API key restrictions if necessary

---

## 7. Reference Links

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [GCP API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)

---

## Questions & Issue Reporting

If you have security-related questions or discover issues, please contact the project maintainers directly rather than opening a public Issue.
