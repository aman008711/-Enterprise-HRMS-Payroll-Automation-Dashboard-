import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Middleware to validate request payload against Zod Schema
export const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Parse req.body asynchronously
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Collect and format error messages
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        res.status(400).json({
          success: false,
          error: 'Validation Failed',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
};
