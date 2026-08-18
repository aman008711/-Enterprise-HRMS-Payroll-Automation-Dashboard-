import express, { Request, Response } from 'express';

const app = express();

// Standard middleware
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
