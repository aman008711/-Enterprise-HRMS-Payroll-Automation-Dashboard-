import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ErrorResponse } from './error';
import User, { IUser } from '../models/User';

// Extend Express Request interface specifically for routes containing authentication
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface DecodedToken {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

// Middleware to protect routes against unauthenticated users
export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined;

  // Check headers for Authorization: Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Fallback to cookie
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this endpoint', 401));
  }

  try {
    // Verify token validity
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretkey'
    ) as DecodedToken;

    // Retrieve user details from Database
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ErrorResponse('User account not found', 401));
    }

    // Attach user to Request context
    req.user = user;
    next();
  } catch (err) {
    return next(new ErrorResponse('Not authorized to access this endpoint', 401));
  }
};

// Middleware factory to enforce role permissions
export const authorizeRoles = (...roles: ('Admin' | 'HR Manager' | 'Employee')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authenticated', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role '${req.user.role}' is unauthorized to perform this action`,
          403
        )
      );
    }

    next();
  };
};
