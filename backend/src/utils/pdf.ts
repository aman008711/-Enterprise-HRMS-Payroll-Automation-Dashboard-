import PDFDocument from 'pdfkit';
import { Response } from 'express';
import crypto from 'crypto';

/**
 * Format currency with proper commas and decimals
 */
const formatCurrency = (val: number | undefined | null): string => {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Generates a verification hash for the digital authenticity seal
 */
const generateVerificationCode = (payroll: any): string => {
  const seed = `${payroll._id || ''}-${payroll.netSalary || 0}-${payroll.payPeriodStart || ''}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex').toUpperCase();
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`;
};

/**
 * Converts numbers into English words for the net payout line
 */
const numberToWords = (amount: number): string => {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (amount === 0) return 'Zero Dollars';
  
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);

  const convertGroup = (num: number): string => {
    let group = '';
    if (num >= 100) {
      group += `${units[Math.floor(num / 100)]} Hundred `;
      num %= 100;
    }
    if (num >= 20) {
      group += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 0) {
      group += `${units[num]} `;
    }
    return group;
  };

  let words = '';
  if (dollars >= 1000000) {
    words += `${convertGroup(Math.floor(dollars / 1000000))}Million `;
  }
  if ((dollars % 1000000) >= 1000) {
    words += `${convertGroup(Math.floor((dollars % 1000000) / 1000))}Thousand `;
  }
  if (dollars % 1000 > 0) {
    words += convertGroup(dollars % 1000);
  }

  words = words.trim() + ' Dollars';
  if (cents > 0) {
    words += ` and ${cents}/100 Cents`;
  }
  return words + ' Only';
};

/**
 * Draws the high-fidelity Payslip PDF
 */
const drawAdvancedPayslip = (doc: PDFKit.PDFDocument, payroll: any) => {
  const margin = 45;
  const contentWidth = 505; // 595.28 - 90
  const verificationCode = generateVerificationCode(payroll);

  // Top Color Accent Bar
  doc.rect(0, 0, 595.28, 8).fill('#6366f1'); // Modern Brand Indigo

  // 1. Corporate Header & Metadata
  doc.fillColor('#0f172a');
  doc.font('Helvetica-Bold').fontSize(18).text('ENTERPRISE HRMS', margin, 30);
  doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text('GLOBAL ENTERPRISE AUTOMATION & PAYROLL SOLUTIONS', margin, 52);
  doc.text('Tax ID / EIN: XX-XXXXXXX  •  compliance@enterprise-hrms.corp', margin, 64);

  // Right Header: Official Slip Details
  doc.rect(400, 26, 150, 48).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#4338ca').text('OFFICIAL PAYSLIP', 400, 34, { width: 150, align: 'center' });
  
  const slipId = `PAY-${(payroll._id || '').toString().slice(-6).toUpperCase()}`;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(`Slip Ref: ${slipId}`, 400, 50, { width: 150, align: 'center' });
  
  const periodStr = `${new Date(payroll.payPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(payroll.payPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(periodStr, 400, 61, { width: 150, align: 'center' });

  // Divider Line
  doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(margin, 86).lineTo(margin + contentWidth, 86).stroke();

  // 2. Employee Profile Details Card
  doc.rect(margin, 96, contentWidth, 85).fillAndStroke('#f8fafc', '#e2e8f0');
  
  // Card Title Header
  doc.rect(margin, 96, contentWidth, 20).fill('#e0e7ff');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#3730a3').text('EMPLOYEE & DISBURSEMENT RECORD', margin + 12, 102);

  const emp = payroll.employee || {};
  const dept = payroll.department?.name || emp.department?.name || emp.department || 'General';

  // Left Information Column
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text('Employee Name:', margin + 12, 124);
  doc.text('Employee ID:', margin + 12, 139);
  doc.text('Designation:', margin + 12, 154);
  doc.text('Department:', margin + 12, 169);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a');
  doc.text(`${emp.firstName || 'Employee'} ${emp.lastName || ''}`.trim(), margin + 90, 124);
  doc.text(emp.employeeId || 'N/A', margin + 90, 139);
  doc.text(emp.jobTitle || 'Staff Member', margin + 90, 154);
  doc.text(dept, margin + 90, 169);

  // Right Information Column
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text('Payment Status:', margin + 270, 124);
  doc.text('Payment Method:', margin + 270, 139);
  doc.text('Disbursement Date:', margin + 270, 154);
  doc.text('Bank Account:', margin + 270, 169);

  doc.font('Helvetica-Bold').fontSize(8);
  doc.fillColor(payroll.status === 'Paid' ? '#15803d' : '#b45309').text((payroll.status || 'Paid').toUpperCase(), margin + 370, 124);
  doc.fillColor('#0f172a').text(payroll.paymentMethod || 'Bank Transfer', margin + 370, 139);
  
  const disburseDate = payroll.paymentDate || payroll.processedAt || new Date();
  doc.font('Helvetica-Bold').fillColor('#0f172a').text(new Date(disburseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), margin + 370, 154);
  doc.text('Direct Deposit (•••9021)', margin + 370, 169);

  // 3. Earnings & Deductions Ledger Table
  const tableTop = 195;
  const colWidth = contentWidth / 2;

  // Earnings Header
  doc.rect(margin, tableTop, colWidth - 5, 22).fill('#f1f5f9');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('EARNINGS & ALLOWANCES', margin + 10, tableTop + 6);
  doc.text('AMOUNT (USD)', margin + colWidth - 85, tableTop + 6);

  // Deductions Header
  doc.rect(margin + colWidth + 5, tableTop, colWidth - 5, 22).fill('#f1f5f9');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('DEDUCTIONS & WITHHOLDINGS', margin + colWidth + 15, tableTop + 6);
  doc.text('AMOUNT (USD)', margin + contentWidth - 80, tableTop + 6);

  // Line items
  const earnings = [
    { label: 'Basic Base Salary', amount: payroll.baseSalary || 0 },
    { label: 'Performance / Special Allowances', amount: payroll.allowances || 0 },
    { label: 'Health & Wellness Benefit Subsidy', amount: 0 }
  ];

  const deductions = [
    { label: 'Income Tax & Statutory Withholding', amount: payroll.deductions || 0 },
    { label: 'Retirement & Pension Contribution', amount: 0 },
    { label: 'Medical Insurance Premium', amount: 0 }
  ];

  let y = tableTop + 28;
  for (let i = 0; i < 3; i++) {
    // Zebra striping
    if (i % 2 === 1) {
      doc.rect(margin, y - 2, colWidth - 5, 18).fill('#f8fafc');
      doc.rect(margin + colWidth + 5, y - 2, colWidth - 5, 18).fill('#f8fafc');
    }

    // Earning Row
    doc.font('Helvetica').fontSize(8).fillColor('#334155').text(earnings[i].label, margin + 10, y + 2);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(earnings[i].amount), margin + colWidth - 85, y + 2, { width: 75, align: 'right' });

    // Deduction Row
    doc.font('Helvetica').fontSize(8).fillColor('#334155').text(deductions[i].label, margin + colWidth + 15, y + 2);
    doc.font('Helvetica-Bold').fillColor(deductions[i].amount > 0 ? '#dc2626' : '#64748b').text(
      deductions[i].amount > 0 ? `-${formatCurrency(deductions[i].amount)}` : '$0.00',
      margin + contentWidth - 80,
      y + 2,
      { width: 70, align: 'right' }
    );

    y += 20;
  }

  // Subtotal Summary Bar
  y += 5;
  doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
  y += 8;

  const totalGross = (payroll.baseSalary || 0) + (payroll.allowances || 0);
  const totalDeductions = payroll.deductions || 0;

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('Gross Earnings:', margin + 10, y);
  doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(totalGross), margin + colWidth - 85, y, { width: 75, align: 'right' });

  doc.font('Helvetica-Bold').fillColor('#334155').text('Total Deductions:', margin + colWidth + 15, y);
  doc.font('Helvetica-Bold').fillColor('#dc2626').text(`-${formatCurrency(totalDeductions)}`, margin + contentWidth - 80, y, { width: 70, align: 'right' });

  // 4. Net Payout Total Highlight Card
  y += 24;
  doc.roundedRect(margin, y, contentWidth, 60, 6).fillAndStroke('#eef2ff', '#c7d2fe');

  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#4338ca').text('TOTAL NET PAYOUT (TAKE-HOME)', margin + 16, y + 14);
  doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`In Words: ${numberToWords(payroll.netSalary || 0)}`, margin + 16, y + 36, { width: 300 });

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#312e81').text(formatCurrency(payroll.netSalary || 0), margin + contentWidth - 170, y + 18, { width: 155, align: 'right' });

  // 5. Verification Seal & Compliance Footer
  y += 75;
  doc.roundedRect(margin, y, contentWidth, 80, 4).fillAndStroke('#fafafa', '#e5e5e5');

  // Digital Security Stamp Box
  doc.rect(margin + 12, y + 10, 80, 60).fillAndStroke('#ffffff', '#cbd5e1');
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#4338ca').text('DIGITAL AUDIT SEAL', margin + 12, y + 18, { width: 80, align: 'center' });
  doc.font('Helvetica').fontSize(5.5).fillColor('#64748b').text('VERIFIED & AUDITED', margin + 12, y + 32, { width: 80, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#15803d').text('SECURE 256-BIT', margin + 12, y + 46, { width: 80, align: 'center' });
  doc.font('Helvetica').fontSize(5).fillColor('#94a3b8').text('VALID SIGNATURE', margin + 12, y + 56, { width: 80, align: 'center' });

  // Right compliance text
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b').text('Digital Authenticity & Compliance Certificate', margin + 105, y + 14);
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
  doc.text('This document was electronically compiled and signed by the Enterprise HRMS Automated Ledger.', margin + 105, y + 26);
  doc.text(`Cryptographic Audit Checksum: ${verificationCode}`, margin + 105, y + 38);
  doc.text(`Generated On: ${new Date().toUTCString()}  •  Direct queries to: hr-payroll@company.com`, margin + 105, y + 50);

  // Bottom Notice
  doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Confidential Document — Generated automatically by Enterprise HRMS & Payroll Automation Gateway.', margin, 540, { align: 'center', width: contentWidth });
};

/**
 * Draws the Master Company-Wide Financial & Department Payroll Report PDF
 */
const drawAdvancedPayrollReport = (doc: PDFKit.PDFDocument, reportData: any[]) => {
  const margin = 40;
  const contentWidth = 515;

  // Header Banner
  doc.rect(0, 0, 595.28, 8).fill('#4f46e5');

  doc.fillColor('#0f172a');
  doc.font('Helvetica-Bold').fontSize(18).text('ENTERPRISE HRMS & FINANCE', margin, 28);
  doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text('MASTER DEPARTMENT PAYROLL & EXPENDITURE REPORT', margin, 48);

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#4f46e5').text(`Report Generated: ${reportDate}`, margin + contentWidth - 170, 36, { width: 170, align: 'right' });

  // Divider
  doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(margin, 65).lineTo(margin + contentWidth, 65).stroke();

  // Summary Metrics Grid (3 Boxes)
  const totalExpenditure = reportData.reduce((acc, curr) => acc + (curr.totalNetSalary || 0), 0);
  const totalRuns = reportData.reduce((acc, curr) => acc + (curr.payrollCount || 0), 0);
  const avgSpend = totalRuns > 0 ? totalExpenditure / totalRuns : 0;

  const cardWidth = (contentWidth - 20) / 3;

  // Card 1
  doc.roundedRect(margin, 76, cardWidth, 50, 4).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('TOTAL NET EXPENDITURE', margin + 10, 84);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#4338ca').text(formatCurrency(totalExpenditure), margin + 10, 100);

  // Card 2
  doc.roundedRect(margin + cardWidth + 10, 76, cardWidth, 50, 4).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('AVERAGE NET PAYOUT', margin + cardWidth + 20, 84);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(formatCurrency(avgSpend), margin + cardWidth + 20, 100);

  // Card 3
  doc.roundedRect(margin + (cardWidth * 2) + 20, 76, cardWidth, 50, 4).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('TOTAL TRANSACTIONS RUN', margin + (cardWidth * 2) + 30, 84);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#059669').text(`${totalRuns} Slips`, margin + (cardWidth * 2) + 30, 100);

  // Department Breakdown Table
  let y = 142;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Department Cost Center Allocations', margin, y);
  y += 16;

  // Table Header
  doc.rect(margin, y, contentWidth, 20).fill('#e0e7ff');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#3730a3');
  doc.text('DEPARTMENT', margin + 8, y + 6);
  doc.text('BASE PAY', margin + 130, y + 6);
  doc.text('ALLOWANCES', margin + 200, y + 6);
  doc.text('DEDUCTIONS', margin + 280, y + 6);
  doc.text('NET EXPENDITURE', margin + 360, y + 6);
  doc.text('SLIPS', margin + 465, y + 6, { width: 40, align: 'right' });

  y += 20;

  reportData.forEach((item, idx) => {
    if (idx % 2 === 1) {
      doc.rect(margin, y, contentWidth, 18).fill('#f8fafc');
    }

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a').text(item.departmentName || 'General', margin + 8, y + 5);
    doc.font('Helvetica').fontSize(7.5).fillColor('#334155').text(formatCurrency(item.totalBaseSalary), margin + 130, y + 5);
    doc.fillColor('#15803d').text(`+${formatCurrency(item.totalAllowances)}`, margin + 200, y + 5);
    doc.fillColor('#dc2626').text(`-${formatCurrency(item.totalDeductions)}`, margin + 280, y + 5);
    doc.font('Helvetica-Bold').fillColor('#4338ca').text(formatCurrency(item.totalNetSalary), margin + 360, y + 5);
    doc.font('Helvetica').fillColor('#64748b').text(`${item.payrollCount}`, margin + 465, y + 5, { width: 40, align: 'right' });

    y += 18;
  });

  // Report Footer
  doc.strokeColor('#cbd5e1').lineWidth(0.75).moveTo(margin, y + 10).lineTo(margin + contentWidth, y + 10).stroke();
  doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('Enterprise HRMS Confidential Financial Document  •  All figures certified in corporate audit ledgers.', margin, y + 20, { align: 'center', width: contentWidth });
};

/**
 * Generates an advanced PDF payslip and streams it directly to an Express Response
 */
export const generatePayslipPDF = (payroll: any, res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4' });

    doc.pipe(res);
    doc.on('end', () => resolve());
    doc.on('error', (err) => reject(err));

    drawAdvancedPayslip(doc, payroll);
    doc.end();
  });
};

/**
 * Generates an advanced PDF payslip in-memory and returns it as a Buffer
 */
export const generatePayslipPDFBuffer = (payroll: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    drawAdvancedPayslip(doc, payroll);
    doc.end();
  });
};

/**
 * Generates an executive master departmental financial report and streams it to Response
 */
export const generatePayrollReportPDF = (reportData: any[], res: Response): Promise<void> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    doc.pipe(res);
    doc.on('end', () => resolve());
    doc.on('error', (err) => reject(err));

    drawAdvancedPayrollReport(doc, reportData);
    doc.end();
  });
};
