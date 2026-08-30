import { Response, NextFunction } from 'express';
import Attendance from '../models/Attendance';
import Employee from '../models/Employee';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// Helper function to calculate distance using Haversine formula (returns meters)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
};

// Helper: Get local date string in YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Record daily clock-in
// @route   POST /api/attendance/clock-in
// @access  Private (Employee)
export const clockIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { latitude, longitude } = req.body;

  try {
    const employee = await Employee.findOne({ user: req.user?._id }).lean();
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const todayStr = getLocalDateString();

    // Check if already clocked in today
    const existingLog = await Attendance.findOne({ employee: employee._id, dateString: todayStr });
    if (existingLog) {
      return next(new ErrorResponse('You have already clocked in today', 400));
    }

    // Geofencing enforcement (Office is located at: lat 37.7749, lon -122.4194 with 150m radius)
    const officeLat = 37.7749;
    const officeLon = -122.4194;
    
    if (latitude === undefined || longitude === undefined) {
      return next(new ErrorResponse('Geolocation coordinates are required to verify geofencing', 400));
    }

    const distance = getDistance(latitude, longitude, officeLat, officeLon);
    if (distance > 150) {
      return next(
        new ErrorResponse(
          `Not within office geofence range. Distance: ${Math.round(distance)}m (Maximum permitted: 150m)`,
          400
        )
      );
    }

    // Define Late Threshold: 09:15 AM today
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(9, 15, 0, 0);
    const status = now > cutoff ? 'Late' : 'On Time';

    const attendance = await Attendance.create({
      employee: employee._id,
      dateString: todayStr,
      clockIn: now,
      status,
      clockInLat: latitude,
      clockInLon: longitude,
      clockInIp: req.ip
    });

    res.status(201).json({
      success: true,
      data: attendance
    });

    // Log clock-in audit trail
    createAuditLog({
      action: 'ATTENDANCE_CLOCK_IN',
      targetModel: 'Attendance',
      targetId: attendance._id.toString(),
      details: `Checked in at: ${now.toLocaleTimeString()}, status: ${status}, distance: ${Math.round(distance)}m`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record daily clock-out
// @route   POST /api/attendance/clock-out
// @access  Private (Employee)
export const clockOut = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { latitude, longitude } = req.body;

  try {
    const employee = await Employee.findOne({ user: req.user?._id }).lean();
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const todayStr = getLocalDateString();

    const attendance = await Attendance.findOne({ employee: employee._id, dateString: todayStr });
    if (!attendance) {
      return next(new ErrorResponse('You have not clocked in today', 400));
    }

    if (attendance.clockOut) {
      return next(new ErrorResponse('You have already clocked out today', 400));
    }

    const now = new Date();
    attendance.clockOut = now;
    if (latitude !== undefined) attendance.clockOutLat = latitude;
    if (longitude !== undefined) attendance.clockOutLon = longitude;
    attendance.clockOutIp = req.ip;
    
    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance
    });

    // Log clock-out audit trail
    createAuditLog({
      action: 'ATTENDANCE_CLOCK_OUT',
      targetModel: 'Attendance',
      targetId: attendance._id.toString(),
      details: `Checked out at: ${now.toLocaleTimeString()}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current day's clock-in status for active user
// @route   GET /api/attendance/today
// @access  Private
export const getTodayStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await Employee.findOne({ user: req.user?._id }).lean();
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const todayStr = getLocalDateString();
    const attendance = await Attendance.findOne({ employee: employee._id, dateString: todayStr }).lean();

    res.status(200).json({
      success: true,
      data: attendance || null
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get active employee's historical logs
// @route   GET /api/attendance/my-logs
// @access  Private
export const getMyAttendanceLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const employee = await Employee.findOne({ user: req.user?._id }).lean();
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const logs = await Attendance.find({ employee: employee._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all attendance logs (Admin / HR Manager only)
// @route   GET /api/attendance/all
// @access  Private (Admin / HR Manager only)
export const getAllAttendanceLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await Attendance.find()
      .populate('employee', 'firstName lastName employeeId jobTitle')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};
