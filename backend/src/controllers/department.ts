import { Request, Response, NextFunction } from 'express';
import Department from '../models/Department';
import { ErrorResponse } from '../middleware/error';

// @desc    Get department hierarchy, manager profile details, and employee counts via aggregation
// @route   GET /api/departments/hierarchy
// @access  Private (Admin / HR Manager)
export const getDepartmentHierarchy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hierarchy = await Department.aggregate([
      // 1. Join with employees collection to fetch manager profile
      {
        $lookup: {
          from: 'employees',
          localField: 'manager',
          foreignField: '_id',
          as: 'manager'
        }
      },
      // 2. Unwind the manager array (since it's a 1-to-1 relationship, keeping empty if none exists)
      {
        $unwind: {
          path: '$manager',
          preserveNullAndEmptyArrays: true
        }
      },
      // 3. Join with employees collection again to find all members assigned to this department
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'department',
          as: 'employees'
        }
      },
      // 4. Project clean output shape and suppress internal Mongoose fields
      {
        $project: {
          _id: 1,
          name: 1,
          code: 1,
          createdAt: 1,
          manager: {
            $cond: {
              if: { $not: ['$manager._id'] },
              then: '$$REMOVE',
              else: {
                _id: '$manager._id',
                firstName: '$manager.firstName',
                lastName: '$manager.lastName',
                employeeId: '$manager.employeeId',
                jobTitle: '$manager.jobTitle'
              }
            }
          },
          totalEmployees: { $size: '$employees' },
          employees: {
            $map: {
              input: '$employees',
              as: 'emp',
              in: {
                _id: '$$emp._id',
                firstName: '$$emp.firstName',
                lastName: '$$emp.lastName',
                employeeId: '$$emp.employeeId',
                jobTitle: '$$emp.jobTitle',
                status: '$$emp.status'
              }
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: hierarchy.length,
      data: hierarchy
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get list of all departments
// @route   GET /api/departments
// @access  Private (Any authenticated user)
export const getDepartments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departments = await Department.find().sort('name').lean();
    res.status(200).json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private (Admin)
export const createDepartment = async (req: Request, res: Response, next: NextFunction) => {
  const { name, code, manager } = req.body;

  try {
    const department = await Department.create({
      name,
      code,
      manager
    });

    res.status(201).json({
      success: true,
      data: department
    });
  } catch (err) {
    next(err);
  }
};
