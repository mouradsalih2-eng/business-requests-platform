/**
 * Seed 100 Requests - Creates requests distributed across all fields and time periods
 * Run: node src/db/seed-100.js
 */

import { initializeDatabase, run, get, all } from './database.js';

// Request title templates
const titles = [
  'Improve loading performance',
  'Add new dashboard widget',
  'Fix data sync issue',
  'Implement export feature',
  'Update user interface',
  'Optimize database queries',
  'Add email notifications',
  'Fix mobile layout',
  'Implement caching layer',
  'Add dark mode support',
  'Fix PDF generation',
  'Improve search functionality',
  'Add bulk import feature',
  'Fix authentication bug',
  'Optimize API responses',
  'Add keyboard shortcuts',
  'Fix timezone issues',
  'Implement rate limiting',
  'Add activity logging',
  'Fix memory leak',
  'Improve error handling',
  'Add multi-language support',
  'Fix session timeout',
  'Optimize image loading',
  'Add custom reports',
];

const categories = ['bug', 'new_feature', 'optimization'];
const priorities = ['low', 'medium', 'high'];
const statuses = ['pending', 'backlog', 'in_progress', 'completed', 'rejected'];
const teams = ['Manufacturing', 'Sales', 'Service', 'Energy'];
const regions = ['EMEA', 'North America', 'APAC', 'Global'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed100() {
  console.log('Starting 100 requests seed...\n');

  await initializeDatabase();

  // Get user IDs
  const users = all('SELECT id FROM users');
  if (users.length === 0) {
    console.log('No users found. Please run the main seed.js first.');
    process.exit(1);
  }
  const userIds = users.map(u => u.id);

  const now = new Date();
  let created = 0;

  // Distribution plan:
  // - 10 requests from today
  // - 20 requests from last 7 days (1-6 days ago)
  // - 30 requests from last 30 days (7-29 days ago)
  // - 25 requests from last 90 days (30-89 days ago)
  // - 15 requests older (90-180 days ago)

  const distributions = [
    { count: 10, minDays: 0, maxDays: 0, label: 'Today' },
    { count: 20, minDays: 1, maxDays: 6, label: 'Last 7 days' },
    { count: 30, minDays: 7, maxDays: 29, label: 'Last 30 days' },
    { count: 25, minDays: 30, maxDays: 89, label: 'Last 90 days' },
    { count: 15, minDays: 90, maxDays: 180, label: 'Older' },
  ];

  for (const dist of distributions) {
    console.log(`\nCreating ${dist.count} requests for ${dist.label}...`);

    for (let i = 0; i < dist.count; i++) {
      const daysAgo = dist.minDays === dist.maxDays
        ? dist.minDays
        : randomInt(dist.minDays, dist.maxDays);

      const hoursOffset = randomInt(0, 23);
      const minutesOffset = randomInt(0, 59);
      const createdAt = new Date(
        now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursOffset * 60 * 60 * 1000) - (minutesOffset * 60 * 1000)
      );

      const title = randomChoice(titles);
      const category = randomChoice(categories);
      const priority = randomChoice(priorities);
      const status = randomChoice(statuses);
      const team = randomChoice(teams);
      const region = randomChoice(regions);
      const userId = randomChoice(userIds);

      run(
        `INSERT INTO requests (user_id, title, category, priority, status, team, region, business_problem, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          `${title} - ${team} ${region} #${created + 1}`,
          category,
          priority,
          status,
          team,
          region,
          `This is a ${priority} priority ${category.replace('_', ' ')} request for the ${team} team in ${region}.`,
          createdAt.toISOString()
        ]
      );
      created++;

      if ((i + 1) % 5 === 0) {
        console.log(`  Created ${i + 1}/${dist.count} requests`);
      }
    }
  }

  // Summary stats
  const totalRequests = all('SELECT COUNT(*) as count FROM requests')[0].count;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const todayCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [todayStart])[0].count;
  const weekCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [sevenDaysAgo])[0].count;
  const monthCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [thirtyDaysAgo])[0].count;
  const quarterCount = all('SELECT COUNT(*) as count FROM requests WHERE created_at >= ?', [ninetyDaysAgo])[0].count;

  // Category counts
  const bugCount = all("SELECT COUNT(*) as count FROM requests WHERE category = 'bug'")[0].count;
  const featureCount = all("SELECT COUNT(*) as count FROM requests WHERE category = 'new_feature'")[0].count;
  const optimizationCount = all("SELECT COUNT(*) as count FROM requests WHERE category = 'optimization'")[0].count;

  // Team counts
  const manufacturingCount = all("SELECT COUNT(*) as count FROM requests WHERE team = 'Manufacturing'")[0].count;
  const salesCount = all("SELECT COUNT(*) as count FROM requests WHERE team = 'Sales'")[0].count;
  const serviceCount = all("SELECT COUNT(*) as count FROM requests WHERE team = 'Service'")[0].count;
  const energyCount = all("SELECT COUNT(*) as count FROM requests WHERE team = 'Energy'")[0].count;

  // Region counts
  const emeaCount = all("SELECT COUNT(*) as count FROM requests WHERE region = 'EMEA'")[0].count;
  const naCount = all("SELECT COUNT(*) as count FROM requests WHERE region = 'North America'")[0].count;
  const apacCount = all("SELECT COUNT(*) as count FROM requests WHERE region = 'APAC'")[0].count;
  const globalCount = all("SELECT COUNT(*) as count FROM requests WHERE region = 'Global'")[0].count;

  console.log('\n--- Seed Complete ---');
  console.log(`Total requests in database: ${totalRequests}`);
  console.log(`New requests created: ${created}`);

  console.log('\nBy Time Period:');
  console.log(`  Today: ${todayCount}`);
  console.log(`  Last 7 days: ${weekCount}`);
  console.log(`  Last 30 days: ${monthCount}`);
  console.log(`  Last 90 days: ${quarterCount}`);

  console.log('\nBy Category:');
  console.log(`  Bug: ${bugCount}`);
  console.log(`  New Feature: ${featureCount}`);
  console.log(`  Optimization: ${optimizationCount}`);

  console.log('\nBy Team:');
  console.log(`  Manufacturing: ${manufacturingCount}`);
  console.log(`  Sales: ${salesCount}`);
  console.log(`  Service: ${serviceCount}`);
  console.log(`  Energy: ${energyCount}`);

  console.log('\nBy Region:');
  console.log(`  EMEA: ${emeaCount}`);
  console.log(`  North America: ${naCount}`);
  console.log(`  APAC: ${apacCount}`);
  console.log(`  Global: ${globalCount}`);
}

seed100().catch(console.error);
