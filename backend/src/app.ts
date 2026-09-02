import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { errorHandler } from './middleware/error';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employee';
import departmentRoutes from './routes/department';
import leaveRoutes from './routes/leave';
import payrollRoutes from './routes/payroll';
import expenseRoutes from './routes/expense';
import attendanceRoutes from './routes/attendance';
import settingsRoutes from './routes/settings';
import shiftRoutes from './routes/shift';
import reviewRoutes from './routes/review';
import documentRoutes from './routes/document';
import auditRoutes from './routes/audit';
import bulletinRoutes from './routes/bulletin';
import resignationRoutes from './routes/resignation';
import grievanceRoutes from './routes/grievance';

const app = express();

// 1. Security Headers via Helmet
app.use(helmet());

// 2. Payload Response Compression
app.use(compression());

// 3. NoSQL Injection Prevention
app.use(mongoSanitize());

// 4. Cross-Origin Resource Sharing (CORS) Configuration
const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) 
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin or matching local development ports (e.g., localhost:5173, 5174, 3000, 127.0.0.1:*)
    if (
      !origin || 
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// 5. Global Rate Limiter (Brute-force protection)
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
app.use(cookieParser());

// Mounting routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/bulletins', bulletinRoutes);
app.use('/api/resignations', resignationRoutes);
app.use('/api/grievances', grievanceRoutes);

// Basic health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'HRMS & Payroll Automation API is running'
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

export default app;


