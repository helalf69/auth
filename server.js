require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const db = require('./config/database');
const RememberToken = require('./models/RememberToken');

const app = express();
const PORT = 3030;

// Connect to MariaDB and initialize tables
(async () => {
  const connected = await db.testConnection();
  if (connected) {
    try {
      await RememberToken.initializeTable();
    } catch (error) {
      console.error('Error initializing database tables:', error);
    }
  } else {
    console.log('Continuing without database (remember me feature will not work)');
  }
})();

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

// Cookie parser middleware
app.use(cookieParser());

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
      privacy: '/privacy-policy',
      deleteAccount: '/delete-account',
      terms: '/terms-of-service',
      iframe: '/login'
    },
    privacyPolicy: '/privacy-policy',
    deleteAccount: '/delete-account',
    termsOfService: '/terms-of-service',
    iframeLogin: '/login'
  });
});

// Iframe login page route
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// Privacy Policy route
app.get('/privacy-policy', (req, res) => {
  res.sendFile(__dirname + '/public/privacy-policy.html');
});

// Delete Account page route
app.get('/delete-account', (req, res) => {
  res.sendFile(__dirname + '/public/delete-account.html');
});

// Terms of Service route
app.get('/terms-of-service', (req, res) => {
  res.sendFile(__dirname + '/public/terms-of-service.html');
});

// Google authentication routes
app.get('/auth/google',
  (req, res, next) => {
    // Store remember me preference in session
    req.session.rememberMe = req.query.remember === 'true';
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const rememberMe = req.session.rememberMe || false;
      
      if (rememberMe) {
        const token = await RememberToken.createToken(req.user);
        // Set cookie for 30 days
        res.cookie('remember_token', token, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      // Redirect to login page for iframe, or return JSON for API
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.redirect('/login?success=true');
      } else {
        res.json({
          success: true,
          message: 'Google authentication successful',
          user: req.user,
          rememberMe: rememberMe
        });
      }
    } catch (error) {
      console.error('Error creating remember token:', error);
      res.json({
        success: true,
        message: 'Google authentication successful',
        user: req.user,
        rememberMe: false
      });
    }
  }
);

// Facebook authentication routes
app.get('/auth/facebook',
  (req, res, next) => {
    req.session.rememberMe = req.query.remember === 'true';
    next();
  },
  passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const rememberMe = req.session.rememberMe || false;
      
      if (rememberMe) {
        const token = await RememberToken.createToken(req.user);
        res.cookie('remember_token', token, {
          maxAge: 30 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.redirect('/login?success=true');
      } else {
        res.json({
          success: true,
          message: 'Facebook authentication successful',
          user: req.user,
          rememberMe: rememberMe
        });
      }
    } catch (error) {
      console.error('Error creating remember token:', error);
      res.json({
        success: true,
        message: 'Facebook authentication successful',
        user: req.user,
        rememberMe: false
      });
    }
  }
);

// Microsoft authentication routes
app.get('/auth/microsoft',
  (req, res, next) => {
    req.session.rememberMe = req.query.remember === 'true';
    next();
  },
  passport.authenticate('microsoft', {
    scope: ['user.read']
  })
);

app.get('/auth/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    try {
      const rememberMe = req.session.rememberMe || false;
      
      if (rememberMe) {
        const token = await RememberToken.createToken(req.user);
        res.cookie('remember_token', token, {
          maxAge: 30 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }

      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.redirect('/login?success=true');
      } else {
        res.json({
          success: true,
          message: 'Microsoft authentication successful',
          user: req.user,
          rememberMe: rememberMe
        });
      }
    } catch (error) {
      console.error('Error creating remember token:', error);
      res.json({
        success: true,
        message: 'Microsoft authentication successful',
        user: req.user,
        rememberMe: false
      });
    }
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
app.get('/auth/logout', async (req, res) => {
  // Delete remember token if exists
  const rememberToken = req.cookies.remember_token;
  if (rememberToken) {
    try {
      await RememberToken.deleteToken(rememberToken);
      res.clearCookie('remember_token');
    } catch (error) {
      console.error('Error deleting remember token:', error);
    }
  }

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

// Remember token check endpoint
app.post('/auth/remember-check', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        authenticated: false,
        message: 'Token is required'
      });
    }

    const user = await RememberToken.validateToken(token);
    
    if (user) {
      // Create session for the user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            authenticated: false,
            message: 'Error creating session'
          });
        }
        res.json({
          authenticated: true,
          user: user
        });
      });
    } else {
      res.status(401).json({
        authenticated: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Remember token check error:', error);
    res.status(500).json({
      authenticated: false,
      message: 'Error validating token'
    });
  }
});

// Remember token delete endpoint
app.post('/auth/remember-delete', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (token) {
      await RememberToken.deleteToken(token);
    }
    
    res.json({
      success: true,
      message: 'Token deleted'
    });
  } catch (error) {
    console.error('Remember token delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting token'
    });
  }
});

// Delete account request endpoint
app.post('/auth/delete-account', (req, res) => {
  const { email, provider, reason } = req.body;

  // Validate required fields
  if (!email || !provider) {
    return res.status(400).json({
      success: false,
      message: 'Email and provider are required fields'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email address format'
    });
  }

  // Log the deletion request (in production, you would store this in a database)
  console.log('=== ACCOUNT DELETION REQUEST ===');
  console.log(`Email: ${email}`);
  console.log(`Provider: ${provider}`);
  console.log(`Reason: ${reason || 'Not provided'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`IP Address: ${req.ip || req.connection.remoteAddress}`);
  console.log('================================');

  // If user is currently authenticated, destroy their session
  if (req.isAuthenticated() && req.user) {
    // Check if the email matches the authenticated user
    if (req.user.email && req.user.email.toLowerCase() === email.toLowerCase()) {
      req.logout((err) => {
        if (err) {
          console.error('Error logging out user during deletion:', err);
        }
      });
    }
  }

  // In a production environment with a database, you would:
  // 1. Find the user by email and provider
  // 2. Delete all associated data
  // 3. Log the deletion for audit purposes
  // 4. Send a confirmation email to the user
  
  // For now, we acknowledge the request
  res.json({
    success: true,
    message: 'Your deletion request has been received and will be processed within 30 days as required by data protection regulations.',
    requestId: `DEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Authentication microservice running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to see available endpoints`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and database connections');
  server.close(async () => {
    await db.closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server and database connections');
  server.close(async () => {
    await db.closePool();
    process.exit(0);
  });
});
