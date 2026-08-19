import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// 1. Security Headers via Helmet
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) Configuration
const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, or internal server-to-server requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// 3. Global Rate Limiter (Brute-force protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-7', // Set RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit headers
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use(limiter);

// Standard Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'HRMS & Payroll Automation API is running'
  });
});

export default app;

