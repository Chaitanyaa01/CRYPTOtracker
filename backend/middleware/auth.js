import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const LEGACY_JWT_SECRET = 'your-secret-key-change-in-production';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  const secrets = JWT_SECRET === LEGACY_JWT_SECRET
    ? [JWT_SECRET]
    : [JWT_SECRET, LEGACY_JWT_SECRET];

  let decodedToken = null;
  let verifyError = null;

  for (const secret of secrets) {
    try {
      decodedToken = jwt.verify(token, secret);
      verifyError = null;
      break;
    } catch (err) {
      verifyError = err;
    }
  }

  if (verifyError || !decodedToken) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid token' 
      });
  }

  req.userId = decodedToken.userId;
  next();
};
