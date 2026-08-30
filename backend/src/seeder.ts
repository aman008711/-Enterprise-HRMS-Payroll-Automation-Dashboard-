import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User';
import Employee from './models/Employee';
import Department from './models/Department';
import LeaveRequest from './models/LeaveRequest';
import Payroll from './models/Payroll';
import AuditLog from './models/AuditLog';

// Load environmental variables
dotenv.config();

const seedDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrms';
    console.log(`Connecting to database at ${mongoURI}...`);
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected.');

    // 1. Clean existing records
    console.log('Clearing existing database collections...');
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Department.deleteMany({});
    await LeaveRequest.deleteMany({});
    await Payroll.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Collections cleared.');

    // 2. Create base corporate departments
    console.log('Seeding departments...');
    const engineering = await Department.create({
      name: 'Engineering',
      code: 'ENG'
    });
    const hr = await Department.create({
      name: 'Human Resources',
      code: 'HR'
    });
    const finance = await Department.create({
      name: 'Finance',
      code: 'FIN'
    });
    console.log('Departments seeded.');

    // 3. Create initial Admin credentials
    console.log('Seeding initial Admin credentials...');
    const adminUser = await User.create({
      email: 'admin@company.com',
      password: 'password123',
      role: 'Admin'
    });

    // 4. Create initial HR Manager credentials
    console.log('Seeding initial HR Manager credentials...');
    const hrUser = await User.create({
      email: 'hr@company.com',
      password: 'password123',
      role: 'HR Manager'
    });
    console.log('Credentials seeded.');

    // 5. Create employee profile details linked to Admin user credentials
    console.log('Binding Admin employee profile...');
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

    // 6. Create employee profile details linked to HR user credentials
    console.log('Binding HR employee profile...');
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

    // 7. Map manager relations back to departments
    engineering.manager = adminEmployee._id as any;
    await engineering.save();
    hr.manager = hrEmployee._id as any;
    await hr.save();

    console.log('--------------------------------------------------');
    console.log('Database Seeding Completed Successfully!');
    console.log('You can now log in using either:');
    console.log('1. Admin: admin@company.com / password123');
    console.log('2. HR Manager: hr@company.com / password123');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('Error during database seeding:', err);
    process.exit(1);
  }
};

seedDB();
