import { Response, NextFunction } from 'express';
import Document from '../models/Document';
import Employee from '../models/Employee';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get document lists (scoped by permissions)
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {};

    // Standard employees are restricted to reading their own documents
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.employee = employee._id;
    }

    const documents = await Document.find(query)
      .populate('employee', 'firstName lastName employeeId jobTitle')
      .populate('uploadedBy', 'email')
      .lean();

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create or upload a new document/template
// @route   POST /api/documents
// @access  Private
export const createDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { employeeId, title, category, content, fileUrl, needsSignature } = req.body;

  if (!title || !category) {
    return next(new ErrorResponse('Please provide a document title and category', 400));
  }

  try {
    let targetEmployeeId = employeeId;

    // Standard employees can only file/upload documents for themselves
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) {
        return next(new ErrorResponse('Employee profile not found', 404));
      }
      targetEmployeeId = employee._id;
      
      // Restrict employee categories
      if (category === 'NDA' || category === 'Employment Contract') {
        return next(new ErrorResponse('Employees cannot self-issue contracts or NDAs', 403));
      }
    }

    if (!targetEmployeeId) {
      return next(new ErrorResponse('Please specify a target employee', 400));
    }

    const employee = await Employee.findById(targetEmployeeId);
    if (!employee) {
      return next(new ErrorResponse('Target employee profile not found', 404));
    }

    // Determine initial status: if needs signature, status is 'Pending Signature'
    const status = needsSignature ? 'Pending Signature' : 'Submitted';

    const document = await Document.create({
      employee: targetEmployeeId,
      title,
      category,
      content: content || '',
      fileUrl: fileUrl || '',
      needsSignature: !!needsSignature,
      status,
      uploadedBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: document
    });

    createAuditLog({
      action: 'DOCUMENT_UPLOADED',
      targetModel: 'Document',
      targetId: document._id.toString(),
      details: `Created document "${title}" under category "${category}" for ${employee.firstName} ${employee.lastName}. Status: ${status}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Sign an NDA or Contract (E-Signature)
// @route   POST /api/documents/:id/sign
// @access  Private (Employee only)
export const signDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { signatureName } = req.body;

  if (!signatureName || !signatureName.trim()) {
    return next(new ErrorResponse('Please provide a legal name signature', 400));
  }

  try {
    const document = await Document.findById(id);
    if (!document) {
      return next(new ErrorResponse('Document not found', 404));
    }

    const employee = await Employee.findOne({ user: req.user?._id });
    if (!employee || document.employee.toString() !== employee._id.toString()) {
      return next(new ErrorResponse('Not authorized to sign this document', 403));
    }

    if (!document.needsSignature || document.status !== 'Pending Signature') {
      return next(new ErrorResponse('This document does not require signature, or has already been signed', 400));
    }

    // Validate signature legal name matches employee's profile name
    const legalName = `${employee.firstName} ${employee.lastName}`.trim().toLowerCase();
    const typedName = signatureName.trim().toLowerCase();

    if (legalName !== typedName) {
      return next(new ErrorResponse(`Signature verification failed: typed signature name must match your legal name: "${employee.firstName} ${employee.lastName}"`, 400));
    }

    // Collect signing IP address
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

    // Apply signing payload
    document.status = 'Signed';
    document.signatureName = signatureName.trim();
    document.signatureIp = clientIp;
    document.signedAt = new Date();

    await document.save();

    res.status(200).json({
      success: true,
      message: 'Document signed successfully!',
      data: document
    });

    createAuditLog({
      action: 'DOCUMENT_SIGNED',
      targetModel: 'Document',
      targetId: id,
      details: `Electronically signed document "${document.title}". Signee IP: ${clientIp}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or Reject an uploaded document
// @route   PUT /api/documents/:id/status
// @access  Private (Admin / HR Manager only)
export const updateDocumentStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return next(new ErrorResponse('Please provide a valid status: Approved or Rejected', 400));
  }

  try {
    const document = await Document.findById(id).populate('employee', 'firstName lastName');
    if (!document) {
      return next(new ErrorResponse('Document not found', 404));
    }

    document.status = status;
    await document.save();

    res.status(200).json({
      success: true,
      data: document
    });

    const empName = document.employee ? `${(document.employee as any).firstName} ${(document.employee as any).lastName}` : 'Staff';
    createAuditLog({
      action: `DOCUMENT_${status.toUpperCase()}`,
      targetModel: 'Document',
      targetId: id,
      details: `${status} document "${document.title}" for ${empName}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const document = await Document.findById(id);
    if (!document) {
      return next(new ErrorResponse('Document not found', 404));
    }

    // Role-Scoping checks
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee || document.employee.toString() !== employee._id.toString()) {
        return next(new ErrorResponse('Not authorized to delete this document', 403));
      }
      
      // Restrict deleting signed contracts or approved files
      if (document.status === 'Approved' || document.status === 'Signed') {
        return next(new ErrorResponse('Cannot delete signed contracts or approved files', 400));
      }
    }

    await Document.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Document successfully removed from cabinet'
    });

    createAuditLog({
      action: 'DOCUMENT_DELETED',
      targetModel: 'Document',
      targetId: id,
      details: `Removed document "${document.title}" from index`,
      req
    });
  } catch (err) {
    next(err);
  }
};
