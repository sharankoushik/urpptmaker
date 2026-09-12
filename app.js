require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Presentation = require('./models/Presentation');

const app = express();

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// MongoDB Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    seedAdmin();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Auto-seed Admin Account on Startup
async function seedAdmin() {
  try {
    let admin = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!admin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASS_PLAIN, 10);
      admin = new User({
        displayName: 'System Admin',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        isAdmin: true
      });
      await admin.save();
      console.log('Admin account created successfully.');
    }
  } catch (err) {
    console.error('Error seeding admin account:', err);
  }
}

// Express Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport Session
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy Setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          displayName: profile.displayName,
          email: profile.emails[0].value,
          isAdmin: profile.emails[0].value.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Authentication Guard Middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/auth/google');
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  res.status(403).send('Access Denied: Admin Privileges Required');
}

// --- ROUTES ---

// Public Home
app.get('/', (req, res) => res.render('index', { user: req.user }));

// Google Auth Trigger & Callback
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    if (req.user.isAdmin) {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect('/dashboard');
    }
  }
);

// Admin Direct Login Portal
app.get('/admin/login', (req, res) => res.render('admin-login', { error: null }));

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && user.isAdmin && user.password && await bcrypt.compare(password, user.password)) {
    req.login(user, (err) => {
      if (err) return res.render('admin-login', { error: 'Login session error.' });
      return res.redirect('/admin/dashboard');
    });
  } else {
    res.render('admin-login', { error: 'Invalid admin credentials.' });
  }
});

// User Dashboard & Presentation Creation
app.get('/dashboard', ensureAuth, async (req, res) => {
  const presentations = await Presentation.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.render('dashboard', { user: req.user, presentations });
});

app.post('/ppt/create', ensureAuth, async (req, res) => {
  const { topic, designStyle, slideCount } = req.body;
  const count = parseInt(slideCount) || 5;
  const calculatedAmount = count * 5; // Pricing model: $5 per slide

  const newPPT = new Presentation({
    userId: req.user._id,
    topic,
    designStyle,
    slideCount: count,
    amount: calculatedAmount
  });

  await newPPT.save();
  res.redirect(`/ppt/preview/${newPPT._id}`);
});

// Presentation Preview & Payment Submission
app.get('/ppt/preview/:id', ensureAuth, async (req, res) => {
  const ppt = await Presentation.findById(req.params.id);
  if (!ppt) return res.status(404).send('Presentation record not found.');
  res.render('preview', { ppt });
});

app.post('/ppt/pay/:id', ensureAuth, async (req, res) => {
  const { txnId } = req.body;
  await Presentation.findByIdAndUpdate(req.params.id, {
    paymentStatus: 'Completed',
    paymentTxnId: txnId || 'TXN_' + Date.now(),
    status: 'Processing'
  });
  res.redirect('/dashboard');
});

// Admin Control Center Dashboard
app.get('/admin/dashboard', ensureAdmin, async (req, res) => {
  const requests = await Presentation.find().populate('userId', 'displayName email').sort({ createdAt: -1 });
  const totalRevenue = requests
    .filter(r => r.paymentStatus === 'Completed')
    .reduce((sum, r) => sum + r.amount, 0);

  res.render('admin', { requests, totalRevenue });
});

// Admin Status Toggle
app.post('/admin/update-status/:id', ensureAdmin, async (req, res) => {
  const { paymentStatus, status } = req.body;
  await Presentation.findByIdAndUpdate(req.params.id, { paymentStatus, status });
  res.redirect('/admin/dashboard');
});

// Session Logout
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// Start Node Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`urpptmaker server running at http://localhost:${PORT}`));
