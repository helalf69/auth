# Authentication Microservice Documentation

This document explains how the authentication microservice works, breaking down each component and its purpose.

## Overview

This microservice provides OAuth 2.0 authentication using three providers:
- **Google** - Google Sign-In
- **Facebook** - Facebook Login
- **Microsoft** - Microsoft Account (Azure AD)

The service runs on **Express.js** framework and listens on **port 3030**.

---

## Project Structure

```
auth/
├── server.js          # Main application file
├── package.json       # Dependencies and project metadata
├── .env.example      # Example environment variables template
├── .gitignore        # Files to exclude from version control
└── DOCUMENTATION.md  # This file
```

---

## Dependencies Explained

### Core Dependencies

1. **express** (`^5.2.1`)
   - Web framework for Node.js
   - Handles HTTP requests and routing

2. **passport** (`^0.7.0`)
   - Authentication middleware for Node.js
   - Provides a unified interface for different authentication strategies
   - Manages authentication flow and session handling

3. **express-session** (`^1.18.0`)
   - Session management middleware
   - Stores user session data (cookies)
   - Required for Passport to maintain login state

4. **dotenv** (`^16.4.5`)
   - Loads environment variables from `.env` file
   - Keeps sensitive credentials out of source code

### OAuth Strategy Packages

5. **passport-google-oauth20** (`^2.0.0`)
   - Google OAuth 2.0 strategy for Passport
   - Handles Google Sign-In flow

6. **passport-facebook** (`^3.0.0`)
   - Facebook OAuth strategy for Passport
   - Handles Facebook Login flow

7. **passport-microsoft** (`^0.1.1`)
   - Microsoft OAuth strategy for Passport
   - Handles Microsoft Account / Azure AD authentication

---

## Code Breakdown: server.js

### 1. Environment Configuration

```javascript
require('dotenv').config();
```

**Purpose**: Loads environment variables from `.env` file into `process.env`. This allows you to store sensitive credentials (API keys, secrets) without committing them to version control.

---

### 2. Module Imports

```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
```

**Purpose**: Imports all necessary modules:
- Express for the web server
- Session middleware for maintaining user sessions
- Passport for authentication
- Individual OAuth strategies for each provider

---

### 3. Express App Initialization

```javascript
const app = express();
const PORT = 3030;
```

**Purpose**: Creates an Express application instance and defines the port number (3030) where the server will listen.

---

### 4. Session Configuration

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
```

**Purpose**: Configures session middleware:
- **secret**: Used to sign the session ID cookie. Should be a random string in production.
- **resave**: `false` means don't save session if it wasn't modified
- **saveUninitialized**: `false` means don't create session until something is stored
- **cookie.secure**: `false` for HTTP, set to `true` for HTTPS in production

**Why it matters**: Sessions allow the server to remember that a user is logged in between requests.

---

### 5. Passport Initialization

```javascript
app.use(passport.initialize());
app.use(passport.session());
```

**Purpose**: 
- `passport.initialize()`: Sets up Passport middleware
- `passport.session()`: Enables persistent login sessions using Express sessions

**Why it matters**: These middleware functions must be called before defining routes so Passport can handle authentication.

---

### 6. Body Parsing Middleware

```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**Purpose**: 
- `express.json()`: Parses JSON request bodies
- `express.urlencoded()`: Parses URL-encoded form data

**Why it matters**: Allows the server to read data sent in POST/PUT requests.

---

### 7. User Serialization

```javascript
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
```

**Purpose**: 
- **serializeUser**: Called when user logs in. Stores user data in the session (typically just the user ID).
- **deserializeUser**: Called on every request. Retrieves user data from session and attaches it to `req.user`.

**In this implementation**: We store the entire user object for simplicity. In production, you'd typically store only the user ID and fetch full user data from a database.

---

### 8. Google OAuth Strategy

```javascript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    id: profile.id,
    provider: 'google',
    name: profile.displayName,
    email: profile.emails[0].value,
    photo: profile.photos[0].value
  };
  return done(null, user);
}));
```

**Purpose**: Configures Google OAuth authentication:
- **clientID/clientSecret**: Credentials from Google Cloud Console
- **callbackURL**: Where Google redirects after authentication
- **Callback function**: Called after successful Google authentication. Receives user profile data and creates a user object.

**Flow**:
1. User clicks "Login with Google"
2. Redirected to Google's login page
3. User authenticates with Google
4. Google redirects back to `/auth/google/callback`
5. This callback function runs, creating a user object
6. User is serialized and stored in session

---

### 9. Facebook OAuth Strategy

```javascript
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'email', 'picture.type(large)']
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    id: profile.id,
    provider: 'facebook',
    name: profile.displayName,
    email: profile.emails ? profile.emails[0].value : null,
    photo: profile.photos ? profile.photos[0].value : null
  };
  return done(null, user);
}));
```

**Purpose**: Similar to Google strategy, but for Facebook:
- **profileFields**: Specifies which user data to request from Facebook
- **Note**: Email may be null if user hasn't granted permission or doesn't have an email on Facebook

---

### 10. Microsoft OAuth Strategy

```javascript
passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: "/auth/microsoft/callback",
  tenant: 'common'
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    id: profile.id,
    provider: 'microsoft',
    name: profile.displayName,
    email: profile.emails ? profile.emails[0].value : null,
    photo: null
  };
  return done(null, user);
}));
```

**Purpose**: Microsoft Account / Azure AD authentication:
- **tenant**: `'common'` allows any Microsoft account. Use a specific tenant ID for organization-only access.
- **Note**: Microsoft profiles may not include photos by default

---

### 11. Routes

#### Home Route (`GET /`)

```javascript
app.get('/', (req, res) => {
  res.json({
    message: 'Authentication Microservice',
    endpoints: { ... }
  });
});
```

**Purpose**: Provides API documentation showing available endpoints.

---

#### Google Authentication Routes

```javascript
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
```

**Purpose**: Initiates Google OAuth flow:
- Redirects user to Google's login page
- Requests `profile` and `email` permissions

```javascript
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    res.json({
      success: true,
      message: 'Google authentication successful',
      user: req.user
    });
  }
);
```

**Purpose**: Handles Google's redirect after authentication:
- `passport.authenticate()` validates the OAuth response
- On success: `req.user` contains the user object from the strategy callback
- On failure: Redirects to `/auth/failure`

**Same pattern applies to Facebook and Microsoft routes.**

---

#### Profile Route (`GET /auth/profile`)

```javascript
app.get('/auth/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.status(401).json({
      authenticated: false,
      message: 'Not authenticated'
    });
  }
});
```

**Purpose**: Returns current user's profile if logged in:
- `req.isAuthenticated()`: Passport method that checks if user has an active session
- Returns 401 Unauthorized if not logged in

---

#### Logout Route (`GET /auth/logout`)

```javascript
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});
```

**Purpose**: Logs out the current user:
- `req.logout()`: Passport method that destroys the session
- Clears the session cookie

---

#### Failure Route (`GET /auth/failure`)

```javascript
app.get('/auth/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Authentication failed'
  });
});
```

**Purpose**: Handles authentication failures (user denies permission, invalid credentials, etc.)

---

### 12. Server Startup

```javascript
app.listen(PORT, () => {
  console.log(`Authentication microservice running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see available endpoints`);
});
```

**Purpose**: Starts the Express server and listens on port 3030.

---

## How to Use

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your OAuth credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your actual credentials from:
- **Google**: https://console.cloud.google.com/apis/credentials
- **Facebook**: https://developers.facebook.com/apps/
- **Microsoft**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade

### 3. Configure OAuth Apps

For each provider, you need to:
1. Create an OAuth application
2. Set the callback URL to:
   - Google: `http://localhost:3030/auth/google/callback`
   - Facebook: `http://localhost:3030/auth/facebook/callback`
   - Microsoft: `http://localhost:3030/auth/microsoft/callback`

### 4. Start the Server

```bash
npm start
```

### 5. Test the Endpoints

- Visit `http://localhost:3030/` to see available endpoints
- Visit `http://localhost:3030/auth/google` to start Google login
- Visit `http://localhost:3030/auth/facebook` to start Facebook login
- Visit `http://localhost:3030/auth/microsoft` to start Microsoft login
- Visit `http://localhost:3030/auth/profile` to see current user (after login)
- Visit `http://localhost:3030/auth/logout` to logout

---

## Authentication Flow

1. **User initiates login**: Visits `/auth/google` (or Facebook/Microsoft)
2. **Redirect to provider**: User is redirected to provider's login page
3. **User authenticates**: User logs in with their provider account
4. **Provider redirects back**: Provider sends user back to callback URL with authorization code
5. **Token exchange**: Passport exchanges code for access token (happens automatically)
6. **Profile fetch**: Passport fetches user profile using access token
7. **Strategy callback**: Your callback function creates user object
8. **Session creation**: User is serialized and stored in session
9. **Success response**: User is redirected/responded with success message

---

## Security Considerations

1. **Session Secret**: Change `SESSION_SECRET` to a strong random string in production
2. **HTTPS**: Use HTTPS in production and set `cookie.secure: true`
3. **Environment Variables**: Never commit `.env` file to version control
4. **Database**: In production, store user data in a database instead of just in session
5. **Token Storage**: Access tokens are not stored in this implementation. Store them securely if you need to make API calls on behalf of users.

---

## Extending the Service

### Add User Database

Instead of storing user in session, you could:
1. Check if user exists in database by provider ID
2. Create new user if doesn't exist
3. Update user information
4. Store only user ID in session

### Add JWT Tokens

Instead of sessions, you could:
1. Generate JWT token after authentication
2. Return token to client
3. Client sends token in Authorization header
4. Verify token on protected routes

### Add Protected Routes

Create middleware to protect routes:

```javascript
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

app.get('/protected-route', requireAuth, (req, res) => {
  res.json({ message: 'This is protected', user: req.user });
});
```

---

## Troubleshooting

### "Invalid credentials" error
- Check that your `.env` file has correct client IDs and secrets
- Verify callback URLs match exactly in provider's console

### Session not persisting
- Check that cookies are enabled in browser
- Verify `SESSION_SECRET` is set
- In production, ensure HTTPS is used with `secure: true`

### "Redirect URI mismatch"
- Ensure callback URLs in provider console exactly match those in code
- Include protocol (`http://` or `https://`) and port number

---

## Summary

This microservice provides a complete OAuth 2.0 authentication solution using Passport.js. It handles the complex OAuth flow automatically, allowing you to focus on your application logic. The service is stateless (except for sessions) and can be easily scaled horizontally.
