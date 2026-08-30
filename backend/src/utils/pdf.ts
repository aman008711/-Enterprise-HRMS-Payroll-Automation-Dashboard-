import PDFDocument from 'pdfkit';
import { Response } from 'express';

/**
 * Draws the visual elements of the payslip onto the PDFDocument
 */
const drawPayslip = (doc: PDFKit.PDFDocument, payroll: any) => {
  // 1. Corporate Header Header
  doc.fillColor('#1e1b4b'); // Deep corporate blue
  doc.font('Helvetica-Bold').fontSize(18).text('ENTERPRISE HRMS & PAYROLL', 50, 50);
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('123 Corporate Boulevard, Tech Plaza, Suite 400', 50, 72);
  
  // Payslip Title & Period
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#7c3aed').text('PAYSLIP', 450, 50, { align: 'right', width: 95 });
  
  const periodStart = new Date(payroll.payPeriodStart).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const periodEnd = new Date(payroll.payPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(`Period: ${periodStart} - ${periodEnd}`, 300, 72, { align: 'right', width: 245 });

  // Header divider line
  doc.strokeColor('#e5e7eb').lineWidth(1.5).moveTo(50, 95).lineTo(545, 95).stroke();

  // 2. Employee Profile Section
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#7c3aed').text('EMPLOYEE PROFILE DETAILS', 50, 112);
  
  // Left Grid Columns
  doc.font('Helvetica').fontSize(9.5).fillColor('#374151');
  doc.text('Employee ID:', 55, 132);
  doc.text('Full Name:', 55, 147);
  doc.text('Job Title:', 55, 162);
  doc.text('Department:', 55, 177);

  // Left Grid Values
  doc.font('Helvetica-Bold').fillColor('#111827');
  doc.text(payroll.employee?.employeeId || '-', 135, 132);
  doc.text(`${payroll.employee?.firstName} ${payroll.employee?.lastName}`, 135, 147);
  doc.text(payroll.employee?.jobTitle || '-', 135, 162);
  doc.text(payroll.department?.name || payroll.employee?.department?.name || '-', 135, 177);

  // Right Grid Columns
  doc.font('Helvetica').fillColor('#374151');
  doc.text('Payment Method:', 305, 132);
  doc.text('Status:', 305, 147);
  doc.text('Processed Date:', 305, 162);

  // Right Grid Values
  doc.font('Helvetica-Bold').fillColor('#111827');
  doc.text(payroll.paymentMethod || 'Bank Transfer', 395, 132);
  doc.text(payroll.status || 'Paid', 395, 147);
  const dateStr = payroll.processedAt 
    ? new Date(payroll.processedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.text(dateStr, 395, 162);

  // Grid divider line
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, 202).lineTo(545, 202).stroke();

  // 3. Ledger Breakdown Earnings vs Deductions Table
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#7c3aed').text('EARNINGS & DEDUCTIONS SUMMARY', 50, 218);

  // Table Column Headers
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#4b5563');
  doc.text('EARNINGS', 55, 240);
  doc.text('AMOUNT', 225, 240, { align: 'right', width: 60 });
  doc.text('DEDUCTIONS', 305, 240);
  doc.text('AMOUNT', 480, 240, { align: 'right', width: 60 });

  doc.strokeColor('#d1d5db').lineWidth(1.5).moveTo(50, 253).lineTo(545, 253).stroke();

  const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Row 1: Base Salary vs Deductions
  doc.font('Helvetica').fontSize(9.5).fillColor('#111827');
  doc.text('Base Salary', 55, 268);
  doc.text(formatCurrency(payroll.baseSalary), 225, 268, { align: 'right', width: 60 });
  doc.text('Ledger Deductions', 305, 268);
  doc.font('Helvetica-Bold').fillColor('#ef4444'); // Red color for deductions
  doc.text(formatCurrency(payroll.deductions), 480, 268, { align: 'right', width: 60 });

  // Row 2: Allowances vs Nil
  doc.font('Helvetica').fillColor('#111827');
  doc.text('Allowances', 55, 288);
  doc.font('Helvetica-Bold').fillColor('#10b981'); // Green color for allowances
  doc.text(formatCurrency(payroll.allowances), 225, 288, { align: 'right', width: 60 });
  doc.font('Helvetica').fillColor('#374151');
  doc.text('-', 305, 288);
  doc.text(formatCurrency(0), 480, 288, { align: 'right', width: 60 });

  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, 308).lineTo(545, 308).stroke();

  // 4. Net Payout Total Box
  doc.rect(50, 323, 495, 42).fill('#f5f3ff'); // Light brand background box
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#7c3aed').text('TOTAL NET PAYOUT', 70, 339);
  doc.fontSize(14).text(formatCurrency(payroll.netSalary), 380, 337, { align: 'right', width: 145 });

  // 5. Verification notice & security footer
  doc.font('Helvetica').fontSize(8).fillColor('#9ca3af');
  doc.text('This is an automatically generated corporate payslip and does not require a physical signature.', 50, 395, { align: 'center', width: 495 });
  doc.text('Protected under corporate security policies & verified in audit ledger systems.', 50, 407, { align: 'center', width: 495 });
};

/**
 * Generates a branded, professional PDF payslip and streams it directly to the Express response
 */
export const generatePayslipPDF = (payroll: any, res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Create A4 PDF Document with 50px margins
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Pipe the doc data directly into the response
    doc.pipe(res);

    // Bind resolve/reject to PDF stream lifecycle hooks
    doc.on('end', () => resolve());
    doc.on('error', (err) => reject(err));

    // Draw payslip contents and close
    drawPayslip(doc, payroll);
    doc.end();
  });
};

/**
 * Generates a branded PDF payslip in-memory and returns it as a Buffer
 */
export const generatePayslipPDFBuffer = (payroll: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    drawPayslip(doc, payroll);
    doc.end();
  });
};
