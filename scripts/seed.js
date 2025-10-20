require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Task = require('../models/Task');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Generate random date
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate user data
const generateUsers = () => {
  const roles = ['user', 'admin', 'manager'];
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
    'Matthew', 'Betty'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
    'Harris', 'Sanchez'
  ];

  const users = [];

  for (let i = 0; i < 26; i++) {
    const firstName = firstNames[i];
    const lastName = lastNames[i];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    
    users.push({
      name: fullName,
      email: email,
      age: Math.floor(Math.random() * 50) + 18,
      role: roles[Math.floor(Math.random() * roles.length)],
      isActive: Math.random() > 0.2,
      phoneNumber: `+1-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      address: `${Math.floor(Math.random() * 9999 + 1)} ${['Main', 'Oak', 'Pine', 'Maple', 'Cedar', 'Elm', 'Lake', 'Hill'][Math.floor(Math.random() * 8)]} Street, ${['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'][Math.floor(Math.random() * 8)]}, USA`
    });
  }

  return users;
};

// Generate task data
const generateTasks = (userIds) => {
  const statuses = ['pending', 'in-progress', 'completed', 'cancelled'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const taskTemplates = [
    { title: 'Complete project documentation', description: 'Write comprehensive technical documentation and user manual' },
    { title: 'Code review', description: 'Review code submitted by team members' },
    { title: 'Fix bugs', description: 'Fix critical issues found in production' },
    { title: 'Database optimization', description: 'Optimize database query performance' },
    { title: 'API development', description: 'Develop new API endpoints' },
    { title: 'Write test cases', description: 'Write unit tests for new features' },
    { title: 'Attend meeting', description: 'Participate in project progress meeting' },
    { title: 'Requirements analysis', description: 'Analyze new requirements from client' },
    { title: 'System deployment', description: 'Deploy new version to production' },
    { title: 'Performance monitoring', description: 'Monitor system performance' },
    { title: 'Security audit', description: 'Conduct system security audit' },
    { title: 'User training', description: 'Train new users on system usage' },
    { title: 'Data backup', description: 'Perform regular data backup' },
    { title: 'UI optimization', description: 'Optimize user interface experience' },
    { title: 'Log analysis', description: 'Analyze system operation logs' },
    { title: 'Technology research', description: 'Research new technical solutions' },
    { title: 'Code refactoring', description: 'Refactor legacy code' },
    { title: 'Vulnerability fix', description: 'Fix security vulnerabilities' },
    { title: 'Feature testing', description: 'Test newly developed features' },
    { title: 'Documentation update', description: 'Update system documentation' }
  ];

  const tags = [
    ['development', 'frontend'],
    ['development', 'backend'],
    ['testing', 'unit-test'],
    ['deployment', 'devops'],
    ['documentation', 'technical'],
    ['meeting', 'communication'],
    ['urgent', 'bugfix'],
    ['optimization', 'performance'],
    ['security', 'audit'],
    ['training', 'user']
  ];

  const tasks = [];
  const now = new Date();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 3);

  for (let i = 0; i < 110; i++) {
    const template = taskTemplates[i % taskTemplates.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const dueDate = randomDate(now, futureDate);
    
    const task = {
      title: `${template.title} #${i + 1}`,
      description: template.description,
      status,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      dueDate,
      userId: userIds[Math.floor(Math.random() * userIds.length)],
      tags: tags[Math.floor(Math.random() * tags.length)],
      estimatedHours: Math.floor(Math.random() * 40) + 1
    };

    // If task is completed, add completion time and actual hours
    if (status === 'completed') {
      task.completedAt = randomDate(now, dueDate);
      task.actualHours = Math.floor(Math.random() * 50) + 1;
    }

    // If task is in progress, might have actual hours
    if (status === 'in-progress' && Math.random() > 0.5) {
      task.actualHours = Math.floor(Math.random() * task.estimatedHours);
    }

    tasks.push(task);
  }

  return tasks;
};

// Main function
const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Task.deleteMany({});

    console.log('Creating user data...');
    const usersData = generateUsers();
    const users = await User.insertMany(usersData);
    console.log(`Successfully created ${users.length} users`);

    console.log('Creating task data...');
    const userIds = users.map(user => user._id);
    const tasksData = generateTasks(userIds);
    const tasks = await Task.insertMany(tasksData);
    console.log(`Successfully created ${tasks.length} tasks`);

    console.log('Database seeding completed!');
    console.log('========================================');
    console.log('Statistics:');
    console.log(`- Total users: ${users.length}`);
    console.log(`- Total tasks: ${tasks.length}`);
    console.log(`- Active users: ${users.filter(u => u.isActive).length}`);
    
    // Count tasks by status
    const statusCount = {};
    tasks.forEach(task => {
      statusCount[task.status] = (statusCount[task.status] || 0) + 1;
    });
    console.log('- Task status distribution:', statusCount);

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Execute seeding
seedDatabase();
