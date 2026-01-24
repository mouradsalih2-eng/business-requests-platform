/**
 * Seed Analytics Data - Creates requests spread across different time periods
 * Run: node src/db/seed-analytics.js
 */

import { initializeDatabase, run, get, all } from './database.js';
import bcrypt from 'bcryptjs';

// Request templates
const requestTemplates = [
  { title: 'Performance improvement request', category: 'optimization', priority: 'high' },
  { title: 'New dashboard widget', category: 'new_feature', priority: 'medium' },
  { title: 'Bug in user profile page', category: 'bug', priority: 'high' },
  { title: 'Add export functionality', category: 'new_feature', priority: 'low' },
  { title: 'Fix login timeout issue', category: 'bug', priority: 'high' },
  { title: 'Optimize search queries', category: 'optimization', priority: 'medium' },
  { title: 'Mobile responsive fixes', category: 'bug', priority: 'medium' },
  { title: 'Add notification preferences', category: 'new_feature', priority: 'low' },
  { title: 'Cache optimization', category: 'optimization', priority: 'high' },
  { title: 'Dark mode support', category: 'new_feature', priority: 'medium' },
  { title: 'Fix PDF export bug', category: 'bug', priority: 'low' },
  { title: 'Database query optimization', category: 'optimization', priority: 'high' },
];

const statuses = ['pending', 'backlog', 'in_progress', 'completed', 'rejected'];
const teams = ['Manufacturing', 'Sales', 'Service', 'Energy'];
const regions = ['EMEA', 'North America', 'APAC', 'Global'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedAnalyticsData() {
  console.log('Starting analytics data seed...\n');

  await initializeDatabase();

  // Get user IDs
  const users = all('SELECT id FROM users');
  if (users.length === 0) {
    console.log('No users found. Please run the main seed.js first.');
    process.exit(1);
  }
  const userIds = users.map(u => u.id);

  console.log('Creating requests for different time periods...\n');

  const now = new Date();
  let created = 0;

  // Today - create 3 requests
  console.log('Creating requests for TODAY...');
  for (let i = 0; i < 3; i++) {
    const hoursAgo = Math.floor(Math.random() * 12);
    const createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const template = randomChoice(requestTemplates);

    const result = run(
      `INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomChoice(userIds),
        `[Today] ${template.title} #${created + 1}`,
        template.category,
        template.priority,
        randomChoice(statuses),
        randomChoice(teams),
        randomChoice(regions),
        'This is a test request for analytics demonstration.',
        createdAt.toISOString()
      ]
    );
    created++;
    console.log(`  Created: [Today] ${template.title}`);
  }

  // Last 7 days - create 8 requests (spread across days)
  console.log('\nCreating requests for LAST 7 DAYS...');
  for (let day = 1; day <= 6; day++) {
    const numRequests = day <= 3 ? 2 : 1; // More requests in recent days
    for (let i = 0; i < numRequests; i++) {
      const daysAgo = day;
      const hoursOffset = Math.floor(Math.random() * 24);
      const createdAt = new Date(now.getTime() - (daysAgo * 24 + hoursOffset) * 60 * 60 * 1000);
      const template = randomChoice(requestTemplates);

      run(
        `INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomChoice(userIds),
          `[${day}d ago] ${template.title} #${created + 1}`,
          template.category,
          template.priority,
          randomChoice(statuses),
          randomChoice(teams),
          randomChoice(regions),
          'This is a test request for analytics demonstration.',
          createdAt.toISOString()
        ]
      );
      created++;
      console.log(`  Created: [${day}d ago] ${template.title}`);
    }
  }

  // Last 30 days (8-30 days ago) - create 15 requests
  console.log('\nCreating requests for LAST 30 DAYS (week 2-4)...');
  for (let i = 0; i < 15; i++) {
    const daysAgo = 8 + Math.floor(Math.random() * 22); // 8-29 days ago
    const hoursOffset = Math.floor(Math.random() * 24);
    const createdAt = new Date(now.getTime() - (daysAgo * 24 + hoursOffset) * 60 * 60 * 1000);
    const template = randomChoice(requestTemplates);

    run(
      `INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomChoice(userIds),
        `[${daysAgo}d ago] ${template.title} #${created + 1}`,
        template.category,
        template.priority,
        randomChoice(statuses),
        randomChoice(teams),
        randomChoice(regions),
        'This is a test request for analytics demonstration.',
        createdAt.toISOString()
      ]
    );
    created++;
    console.log(`  Created: [${daysAgo}d ago] ${template.title}`);
  }

  // Last 90 days (31-90 days ago) - create 20 requests
  console.log('\nCreating requests for LAST 90 DAYS (months 2-3)...');
  for (let i = 0; i < 20; i++) {
    const daysAgo = 31 + Math.floor(Math.random() * 59); // 31-89 days ago
    const hoursOffset = Math.floor(Math.random() * 24);
    const createdAt = new Date(now.getTime() - (daysAgo * 24 + hoursOffset) * 60 * 60 * 1000);
    const template = randomChoice(requestTemplates);

    run(
      `INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomChoice(userIds),
        `[${daysAgo}d ago] ${template.title} #${created + 1}`,
        template.category,
        template.priority,
        randomChoice(statuses),
        randomChoice(teams),
        randomChoice(regions),
        'This is a test request for analytics demonstration.',
        createdAt.toISOString()
      ]
    );
    created++;
    console.log(`  Created: [${daysAgo}d ago] ${template.title}`);
  }

  // Older requests (91-180 days ago) - create 10 requests
  console.log('\nCreating OLDER requests (3-6 months ago)...');
  for (let i = 0; i < 10; i++) {
    const daysAgo = 91 + Math.floor(Math.random() * 89); // 91-179 days ago
    const hoursOffset = Math.floor(Math.random() * 24);
    const createdAt = new Date(now.getTime() - (daysAgo * 24 + hoursOffset) * 60 * 60 * 1000);
    const template = randomChoice(requestTemplates);

    run(
      `INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomChoice(userIds),
        `[${daysAgo}d ago] ${template.title} #${created + 1}`,
        template.category,
        template.priority,
        randomChoice(statuses),
        randomChoice(teams),
        randomChoice(regions),
        'This is a test request for analytics demonstration.',
        createdAt.toISOString()
      ]
    );
    created++;
    console.log(`  Created: [${daysAgo}d ago] ${template.title}`);
  }

  // Summary
  const totalRequests = all('SELECT COUNT(*) as count FROM requests')[0].count;

  // Count by time period
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const todayCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [todayStart])[0].count;
  const weekCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [sevenDaysAgo])[0].count;
  const monthCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [thirtyDaysAgo])[0].count;
  const quarterCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [ninetyDaysAgo])[0].count;

  console.log('\n--- Analytics Seed Complete ---');
  console.log(`Total requests in database: ${totalRequests}`);
  console.log(`\nRequests by time period:`);
  console.log(`  Today: ${todayCount}`);
  console.log(`  Last 7 days: ${weekCount}`);
  console.log(`  Last 30 days: ${monthCount}`);
  console.log(`  Last 90 days: ${quarterCount}`);
  console.log(`\nNew requests created: ${created}`);
}

seedAnalyticsData().catch(console.error);
