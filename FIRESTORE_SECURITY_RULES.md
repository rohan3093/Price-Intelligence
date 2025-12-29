# Firestore Security Rules for Production

## Current Rules (MVP/Testing)

For MVP validation, we're using open rules that allow anyone to read/write:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /assets/{document=**} {
      allow read, write: if true;
    }
    match /b2b_listings/{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **These rules are open and allow anyone to modify data. Use only for MVP testing.**

## Production Security Rules

Before going live, update to these secure rules:

### Option 1: Read-Only for Public, Write for Authenticated (Recommended)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Assets - public can read, only authenticated users can write
    match /assets/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // B2B Listings - public can read, only authenticated users can write
    match /b2b_listings/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**Requires**: Firebase Authentication setup

### Option 2: API Key Authentication (Simpler for MVP)

If you want to keep it simple without full auth, you can use a custom API key:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthorized() {
      return request.query.apiKey == 'YOUR_SECRET_API_KEY';
    }
    
    match /assets/{document=**} {
      allow read: if true;
      allow write: if isAuthorized();
    }
    
    match /b2b_listings/{document=**} {
      allow read: if true;
      allow write: if isAuthorized();
    }
  }
}
```

**Note**: This is less secure than proper authentication, but better than open rules.

### Option 3: Analyst Email Whitelist (For Small Team)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAnalyst() {
      let analystEmails = ['rohan3093@gmail.com', 'analyst2@example.com'];
      return request.auth != null && request.auth.token.email in analystEmails;
    }
    
    match /assets/{document=**} {
      allow read: if true;
      allow write: if isAnalyst();
    }
    
    match /b2b_listings/{document=**} {
      allow read: if true;
      allow write: if isAnalyst();
    }
  }
}
```

**Requires**: Firebase Authentication with email verification

## How to Update Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **intelligence-exchange-8281f**
3. Go to **Firestore Database** → **Rules** tab
4. Paste your chosen rules
5. Click **"Publish"**

## Recommended Path

### Current Setup
- ✅ Firebase Firestore is configured
- ⚠️ Analyst login uses localStorage (hardcoded credentials)
- ⚠️ Security rules are open (anyone can read/write)

### For Production: Choose One

**Option A: Firebase Authentication (Best - Recommended)**
- ✅ Most secure
- ✅ Proper authentication system
- ✅ Can track who made changes
- ⏱️ Requires ~15 minutes to implement
- **See**: `PRODUCTION_SECURITY_GUIDE.md` for step-by-step instructions

**Option B: API Key (Quick Fix)**
- ✅ Can implement in 5 minutes
- ✅ Better than open rules
- ⚠️ Less secure (API key visible in frontend code)
- ⚠️ Need to update app code to include API key
- **See**: `PRODUCTION_SECURITY_GUIDE.md` for details

**Option C: Keep Open Rules (Not Recommended)**
- ⚠️ Anyone can modify your data
- ⚠️ Only for testing/MVP validation
- ❌ Not suitable for production

## Testing Rules

After updating rules, test:
1. Can users read assets? (should work)
2. Can unauthenticated users create assets? (should fail with new rules)
3. Can authenticated analysts create assets? (should work)

---

## Quick Decision Guide

**"I want the most secure solution"** → Use **Option 1** (Firebase Authentication)
- Follow `PRODUCTION_SECURITY_GUIDE.md` Step 1-4
- I can help implement the code changes

**"I need to launch today"** → Use **Option 2** (API Key)
- Follow `PRODUCTION_SECURITY_GUIDE.md` Option 2 section
- I can help add API key to your code

**"I'm still testing"** → Keep open rules for now
- Update before going public

---

**Current Status**: Using open rules for MVP validation  
**Action Required**: Choose an option and update rules before public launch  
**See**: `PRODUCTION_SECURITY_GUIDE.md` for detailed step-by-step instructions

