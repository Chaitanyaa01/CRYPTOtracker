import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Mock user storage (in a real app, this would be in database)
let mockUsers = [];
let userIdCounter = 1;

// Mock JWT functions
const generateMockToken = (userId) => {
  return `mock-token-${userId}-${Date.now()}`;
};

const hashPassword = (password) => {
  return `hashed-${password}`;
};

const comparePassword = (password, hashedPassword) => {
  return hashedPassword === `hashed-${password}`;
};

// Auth routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide username, email, and password' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = mockUsers.find(user => 
      user.email === email || user.username === username
    );

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user
    const newUser = {
      id: userIdCounter++,
      username,
      email,
      password: hashPassword(password),
      createdAt: new Date().toISOString()
    };

    mockUsers.push(newUser);

    const token = generateMockToken(newUser.id);

    console.log('🔐 User registered:', username);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Find user by email
    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    const token = generateMockToken(user.id);

    console.log('🔑 User logged in:', user.username);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Temporary mock data for testing
const mockCoins = [
  {
    _id: '507f1f77bcf86cd799439011',
    coin_id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'btc',
    price_usd: 43250.50,
    change_24h_pct: 2.5,
    market_cap: 850000000000,
    total_volume: 25000000000,
    timestamp: new Date().toISOString()
  },
  {
    _id: '507f1f77bcf86cd799439012',
    coin_id: 'ethereum',
    name: 'Ethereum',
    symbol: 'eth',
    price_usd: 2650.75,
    change_24h_pct: -1.2,
    market_cap: 320000000000,
    total_volume: 12000000000,
    timestamp: new Date().toISOString()
  },
  {
    _id: '507f1f77bcf86cd799439013',
    coin_id: 'cardano',
    name: 'Cardano',
    symbol: 'ada',
    price_usd: 0.45,
    change_24h_pct: 3.8,
    market_cap: 15000000000,
    total_volume: 800000000,
    timestamp: new Date().toISOString()
  }
];

// Mock routes
app.get('/api/coins', (req, res) => {
  console.log('📊 Serving mock coin data');
  res.json(mockCoins);
});

app.get('/api/history/:coinId', (req, res) => {
  const { coinId } = req.params;
  console.log(`📈 Serving mock history for ${coinId}`);
  
  // Generate mock historical data
  const mockHistory = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const basePrice = coinId === 'bitcoin' ? 43000 : coinId === 'ethereum' ? 2600 : 0.4;
    const price = basePrice + (Math.random() - 0.5) * basePrice * 0.1;
    
    mockHistory.push({
      date: date.toISOString(),
      price: price,
      timestamp: date.getTime()
    });
  }
  
  res.json(mockHistory);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running at http://localhost:${PORT}`);
    console.log(`📊 Serving mock data for testing`);
    console.log(`🔧 To connect to real database, fix the MONGO_URI in .env file`);
});