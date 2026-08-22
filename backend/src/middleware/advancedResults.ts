import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

// Middleware to automate filtering, sorting, selecting, and paginating queries
export const advancedResults = (model: any, populate?: any) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let query;

    // Copy req.query parameters
    const reqQuery = { ...req.query };

    // Exclude fields used for control parameters
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach((param) => delete reqQuery[param]);

    // Convert query object to JSON string to inject Mongoose operators
    let queryStr = JSON.stringify(reqQuery);

    // Match and prepend '$' to standard operators (e.g. gt, gte, lt, lte, in, regex)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in|regex)\b/g, (match) => `$${match}`);

    const queryObj = JSON.parse(queryStr);

    // Apply default case-insensitive flag for matching regex queries
    for (const key in queryObj) {
      if (queryObj[key] && queryObj[key].$regex) {
        queryObj[key].$options = 'i';
      }
    }

    // Build the query
    query = model.find(queryObj);

    // 1. SELECT query option
    if (req.query.select) {
      const fields = (req.query.select as string).split(',').join(' ');
      query = query.select(fields);
    }

    // 2. SORT query option
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt'); // Default sorting: newest first
    }

    // 3. PAGINATION query option
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await model.countDocuments(queryObj);

    query = query.skip(startIndex).limit(limit);

    // Populate relations if provided
    if (populate) {
      query = query.populate(populate);
    }

    // Execute Mongoose Query
    const results = await query;

    // Build paging results summary
    const pagination: any = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    // Bind results to response object
    (res as any).advancedResults = {
      success: true,
      count: results.length,
      total,
      pagination,
      data: results
    };

    next();
  };
};
