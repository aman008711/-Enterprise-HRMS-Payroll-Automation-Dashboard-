import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// Helper function to sign JWT
const signToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'supersecretkey', {
    expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any
  });
};

// Helper function to sign JWT, set cookie, and send response
const sendTokenResponse = (user: any, statusCode: number, res: Response) => {
  const token = signToken(user._id.toString(), user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day expiration
    httpOnly: true, // Prevent client-side scripting (XSS) from reading the cookie
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'strict' as const // Shield against CSRF attacks
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Typically restricted, open for initial setup)
export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password, role } = req.body;

  try {
    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorResponse('User already registered with this email', 400));
    }

    // Create user
    const user = await User.create({
      email,
      password,
      role: role || 'Employee'
    });

    sendTokenResponse(user, 201, res);
    
    // Log registration audit trail
    createAuditLog({
      userId: user._id,
      action: 'USER_REGISTER',
      details: `Role assigned: ${user.role}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  try {
    // Validate request inputs
    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Find user and explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Compare input password with database hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);

    // Log login audit trail
    createAuditLog({
      userId: user._id,
      action: 'USER_LOGIN',
      req
    });
  } catch (err) {
    next(err);
  }
};

