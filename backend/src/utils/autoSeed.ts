import User from '../models/User';
import Employee from '../models/Employee';
import Department from '../models/Department';
import Payroll from '../models/Payroll';

export const autoSeedIfEmpty = async (): Promise<void> => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return; // Database already has users, do not overwrite
    }

    console.log('Database is empty. Running automatic initial seeding for production/Atlas...');

    // 1. Create base corporate departments
    let engineering = await Department.findOne({ code: 'ENG' });
    if (!engineering) {
      engineering = await Department.create({ name: 'Engineering', code: 'ENG' });
    }

    let hr = await Department.findOne({ code: 'HR' });
    if (!hr) {
      hr = await Department.create({ name: 'Human Resources', code: 'HR' });
    }

    let finance = await Department.findOne({ code: 'FIN' });
    if (!finance) {
      finance = await Department.create({ name: 'Finance', code: 'FIN' });
    }

    // 2. Create initial Admin credentials
    const adminUser = await User.create({
      email: 'admin@company.com',
      password: 'password123',
      role: 'Admin'
    });

    // 3. Create initial HR Manager credentials
    const hrUser = await User.create({
      email: 'hr@company.com',
      password: 'password123',
      role: 'HR Manager'
    });

    // 4. Create employee profiles
    const adminEmployee = await Employee.create({
      user: adminUser._id,
      firstName: 'Alice',
      lastName: 'Smith',
      employeeId: 'EMP001',
      phone: '+1 555-0101',
      jobTitle: 'Director of Technology',
      department: engineering._id,
      status: 'Active',
      baseSalary: 12000,
      hireDate: new Date()
    });

    const hrEmployee = await Employee.create({
      user: hrUser._id,
      firstName: 'Bob',
      lastName: 'Jones',
      employeeId: 'EMP002',
      phone: '+1 555-0102',
      jobTitle: 'HR Manager',
      department: hr._id,
      manager: adminEmployee._id,
      status: 'Active',
      baseSalary: 8500,
      hireDate: new Date()
    });

    // 5. Link manager back to departments
    engineering.manager = adminEmployee._id as any;
    await engineering.save();
    hr.manager = hrEmployee._id as any;
    await hr.save();

    // 6. Seed sample Payroll records
    await Payroll.create([
      {
        employee: adminEmployee._id,
        payPeriodStart: new Date('2026-08-01'),
        payPeriodEnd: new Date('2026-08-31'),
        baseSalary: 12000,
        allowances: 1500,
        deductions: 800,
        netSalary: 12700,
        status: 'Paid',
        paymentMethod: 'Bank Transfer',
        paymentDate: new Date('2026-08-31')
      },
      {
        employee: hrEmployee._id,
        payPeriodStart: new Date('2026-08-01'),
        payPeriodEnd: new Date('2026-08-31'),
        baseSalary: 8500,
        allowances: 600,
        deductions: 450,
        netSalary: 8650,
        status: 'Paid',
        paymentMethod: 'Bank Transfer',
        paymentDate: new Date('2026-08-31')
      }
    ]);

    console.log('--------------------------------------------------');
    console.log('Database Auto-Seeded Successfully!');
    console.log('Credentials: admin@company.com / password123');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('Auto-seed failed:', error);
  }
};
