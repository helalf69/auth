require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;

const app = express();
const PORT = 3030;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from public directory
app.use(express.static('public'));

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  // This function is called after successful Google authentication
  const user = {
    id: profile.id,
    provider: 'google',
    name: profile.displayName,
    email: profile.emails[0].value,
    photo: profile.photos[0].value
  };
  return done(null, user);
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'email', 'picture.type(large)']
}, (accessToken, refreshToken, profile, done) => {
  // This function is called after successful Facebook authentication
  const user = {
    id: profile.id,
    provider: 'facebook',
    name: profile.displayName,
    email: profile.emails ? profile.emails[0].value : null,
    photo: profile.photos ? profile.photos[0].value : null
  };
  return done(null, user);
}));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: "/auth/microsoft/callback",
  tenant: 'common' // Use 'common' for multi-tenant, or specific tenant ID
}, (accessToken, refreshToken, profile, done) => {
  // This function is called after successful Microsoft authentication
  const user = {
    id: profile.id,
    provider: 'microsoft',
    name: profile.displayName,
    email: profile.emails ? profile.emails[0].value : null,
    photo: null // Microsoft profile may not include photo
  };
  return done(null, user);
}));

// Routes

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'Authentication Microservice',
    endpoints: {
      login: {
        google: '/auth/google',
        facebook: '/auth/facebook',
        microsoft: '/auth/microsoft'
      },
      profile: '/auth/profile',
      logout: '/auth/logout',
      privacy: '/privacy-policy'
    },
    privacyPolicy: '/privacy-policy'
  });
});

// Privacy Policy route
app.get('/privacy-policy', (req, res) => {
  res.sendFile(__dirname + '/public/privacy-policy.html');
});

// Google authentication routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Successful authentication
    res.json({
      success: true,
      message: 'Google authentication successful',
      user: req.user
    });
  }
);

// Facebook authentication routes
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Successful authentication
    res.json({
      success: true,
      message: 'Facebook authentication successful',
      user: req.user
    });
  }
);

// Microsoft authentication routes
app.get('/auth/microsoft',
  passport.authenticate('microsoft', {
    scope: ['user.read']
  })
);

app.get('/auth/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Successful authentication
    res.json({
      success: true,
      message: 'Microsoft authentication successful',
      user: req.user
    });
  }
);

// Get current user profile
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

// Logout route
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

// Failure route
app.get('/auth/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Authentication failed'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Authentication microservice running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see available endpoints`);
});
