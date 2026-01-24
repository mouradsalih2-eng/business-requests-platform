/**
 * Seed script - Populates database with sample data for testing
 * Run: node src/db/seed.js
 */

import { initializeDatabase, run, get, all } from './database.js';
import bcrypt from 'bcryptjs';

// Sample users
const users = [
  { email: 'sarah@company.com', name: 'Sarah Johnson', role: 'employee' },
  { email: 'mike@company.com', name: 'Mike Chen', role: 'employee' },
  { email: 'emily@company.com', name: 'Emily Davis', role: 'employee' },
  { email: 'james@company.com', name: 'James Wilson', role: 'employee' },
  { email: 'lisa@company.com', name: 'Lisa Park', role: 'employee' },
];

// Sample requests - realistic business scenarios
const requests = [
  {
    title: 'Mobile App Performance Issues on Android',
    category: 'bug',
    priority: 'high',
    status: 'in_progress',
    business_problem: 'The Android app is experiencing significant lag when loading the dashboard. Users report 5-10 second delays which is causing frustration and increased support tickets.',
    problem_size: 'Affects approximately 40% of our user base (Android users). We receive about 50 support tickets per week related to this issue.',
    business_expectations: 'App should load within 2 seconds maximum. This should match our iOS app performance.',
    expected_impact: 'Reducing support tickets by 30%, improving user retention on Android by 15%, and achieving parity with iOS experience.',
  },
  {
    title: 'Add Dark Mode to Dashboard',
    category: 'new_feature',
    priority: 'medium',
    status: 'backlog',
    business_problem: 'Many users work late hours and have requested dark mode to reduce eye strain. This is a common feature request in our feedback surveys.',
    problem_size: 'Requested by 200+ users in the last quarter. 35% of survey respondents listed this as a top-3 wanted feature.',
    business_expectations: 'Full dark mode support across all dashboard pages with a toggle in settings.',
    expected_impact: 'Improved user satisfaction scores, reduced churn among power users who work extended hours.',
  },
  {
    title: 'Optimize Database Query Performance',
    category: 'optimization',
    priority: 'high',
    status: 'pending',
    business_problem: 'Report generation is taking over 30 seconds for large datasets. This blocks users from accessing critical business intelligence.',
    problem_size: 'Enterprise customers generating reports with 100k+ records are most affected. This represents our highest-value customer segment.',
    business_expectations: 'Reports should generate within 5 seconds regardless of dataset size.',
    expected_impact: 'Improved enterprise customer satisfaction, potential upsell opportunities, reduced server costs from optimized queries.',
  },
  {
    title: 'Export Data to Excel Feature',
    category: 'new_feature',
    priority: 'medium',
    status: 'completed',
    business_problem: 'Users currently have to manually copy data from tables to create Excel reports. This is time-consuming and error-prone.',
    problem_size: 'All users performing data analysis are affected. Estimated 2-3 hours per week per user spent on manual data export.',
    business_expectations: 'One-click export to .xlsx format with proper formatting preserved.',
    expected_impact: 'Time savings of 2+ hours per user per week, improved data accuracy, better user productivity.',
  },
  {
    title: 'Login Page Shows Error for Valid Credentials',
    category: 'bug',
    priority: 'high',
    status: 'pending',
    business_problem: 'Some users are unable to log in despite entering correct credentials. They see a generic error message with no clear guidance.',
    problem_size: 'Approximately 5% of login attempts fail incorrectly. This affects roughly 100 users daily.',
    business_expectations: 'Login should work reliably with clear error messages when there are actual issues.',
    expected_impact: 'Reduced support tickets, improved first-time user experience, decreased user frustration.',
  },
  {
    title: 'Add Two-Factor Authentication',
    category: 'new_feature',
    priority: 'high',
    status: 'backlog',
    business_problem: 'Security-conscious enterprise clients require 2FA for compliance. We are losing deals because we lack this feature.',
    problem_size: 'Lost 3 enterprise deals worth $500k+ in the last quarter due to missing 2FA requirement.',
    business_expectations: 'Support for authenticator apps (Google Auth, Authy) and SMS-based 2FA.',
    expected_impact: 'Unlock enterprise sales pipeline, improve overall platform security, meet SOC2 requirements.',
  },
  {
    title: 'Reduce Page Load Time on Dashboard',
    category: 'optimization',
    priority: 'medium',
    status: 'in_progress',
    business_problem: 'The main dashboard takes 4-5 seconds to fully load. Users are complaining about sluggish performance.',
    problem_size: 'Affects all users. Analytics show 15% bounce rate from slow load times.',
    business_expectations: 'Dashboard should be interactive within 1.5 seconds (First Contentful Paint).',
    expected_impact: 'Improved user engagement, reduced bounce rate, better conversion from trial to paid.',
  },
  {
    title: 'Notification Center Not Showing All Alerts',
    category: 'bug',
    priority: 'medium',
    status: 'pending',
    business_problem: 'Users report missing notifications for important events. Some alerts appear in email but not in the app.',
    problem_size: 'Estimated 20% of notifications are not displaying correctly. Most critical for time-sensitive alerts.',
    business_expectations: 'All notifications should appear in the notification center within 30 seconds of the event.',
    expected_impact: 'Users can rely on in-app notifications, reduced missed deadlines, improved trust in the platform.',
  },
  {
    title: 'Add Bulk User Import via CSV',
    category: 'new_feature',
    priority: 'low',
    status: 'pending',
    business_problem: 'Onboarding large teams requires manually creating user accounts one by one. This is tedious for admins.',
    problem_size: 'Affects enterprise admins onboarding 50+ users. Current process takes 2-3 hours per large team.',
    business_expectations: 'Upload a CSV file with user details and create all accounts automatically with email invites.',
    expected_impact: 'Faster enterprise onboarding, reduced admin burden, improved time-to-value for new customers.',
  },
  {
    title: 'Memory Leak in Real-time Updates',
    category: 'bug',
    priority: 'high',
    status: 'rejected',
    business_problem: 'Browser memory usage grows continuously when the dashboard is open, eventually causing crashes.',
    problem_size: 'Users with dashboard open for 4+ hours experience browser slowdown. Power users are most affected.',
    business_expectations: 'Memory usage should remain stable regardless of how long the page is open.',
    expected_impact: 'Improved stability for power users, reduced crash reports, better overall performance perception.',
  },
  {
    title: 'Improve Search Functionality',
    category: 'optimization',
    priority: 'medium',
    status: 'completed',
    business_problem: 'Current search only matches exact terms. Users cannot find items with partial matches or typos.',
    problem_size: 'Search is used 500+ times daily. User feedback indicates 40% of searches fail to find expected results.',
    business_expectations: 'Fuzzy matching, partial word search, and recently searched items.',
    expected_impact: 'Higher search success rate, improved user productivity, better content discoverability.',
  },
  {
    title: 'Add Keyboard Shortcuts',
    category: 'new_feature',
    priority: 'low',
    status: 'duplicate',
    business_problem: 'Power users want keyboard navigation for faster workflows without reaching for the mouse.',
    problem_size: 'Requested by approximately 50 power users. These users generate 30% of our revenue.',
    business_expectations: 'Common shortcuts like Cmd+K for search, Cmd+N for new item, arrow key navigation.',
    expected_impact: 'Improved power user satisfaction and retention, competitive parity with similar tools.',
  },
  {
    title: 'API Rate Limiting for Third-party Integrations',
    category: 'new_feature',
    priority: 'medium',
    status: 'backlog',
    business_problem: 'Poorly implemented third-party integrations sometimes overwhelm our API, affecting other users.',
    problem_size: 'Two major incidents in the past month where API abuse caused 30-minute outages.',
    business_expectations: 'Per-client rate limiting with clear error messages and documentation.',
    expected_impact: 'Improved platform stability, protection against accidental API abuse, better developer experience.',
  },
  {
    title: 'Fix Timezone Display in Reports',
    category: 'bug',
    priority: 'low',
    status: 'completed',
    business_problem: 'Reports show times in UTC instead of the user\'s local timezone, causing confusion.',
    problem_size: 'Affects all users outside UTC timezone. Causes particular issues for US-based users.',
    business_expectations: 'All times should display in the user\'s configured timezone with clear timezone indicator.',
    expected_impact: 'Reduced confusion, fewer support tickets about "wrong" times, improved international user experience.',
  },
  {
    title: 'Streamline Onboarding Flow',
    category: 'optimization',
    priority: 'medium',
    status: 'pending',
    business_problem: 'New users take an average of 15 minutes to complete onboarding. Many drop off before finishing.',
    problem_size: '40% of new signups do not complete onboarding. This directly impacts conversion to paid plans.',
    business_expectations: 'Reduce onboarding to 5 minutes with option to skip and complete later.',
    expected_impact: 'Higher conversion rate, better user activation, increased trial-to-paid conversion.',
  },
];

// Sample comments
const comments = [
  'This is really affecting our daily workflow. Hope this gets prioritized!',
  'We have a workaround for now but would love a proper fix.',
  'Our team has been waiting for this feature for months.',
  'Great suggestion! This would save us so much time.',
  '+1 from our department. This is a pain point for us too.',
  'Is there an ETA on this? We need to plan around it.',
  'Thanks for raising this. We experience the same issue.',
  'Would be great to have this before Q2.',
];

async function seed() {
  console.log('Starting database seed...\n');

  await initializeDatabase();

  // Create sample users
  console.log('Creating users...');
  const hashedPassword = bcrypt.hashSync('password123', 10);
  const userIds = [];

  for (const user of users) {
    const existing = get('SELECT id FROM users WHERE email = ?', [user.email]);
    if (!existing) {
      const result = run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [user.email, hashedPassword, user.name, user.role]
      );
      const newUser = get('SELECT id FROM users WHERE email = ?', [user.email]);
      userIds.push(newUser.id);
      console.log(`  Created: ${user.name} (${user.email})`);
    } else {
      userIds.push(existing.id);
      console.log(`  Exists: ${user.name} (${user.email})`);
    }
  }

  // Get admin user
  const admin = get('SELECT id FROM users WHERE email = ?', ['admin@company.com']);
  if (admin) {
    userIds.push(admin.id);
  }

  // Create sample requests
  console.log('\nCreating requests...');
  const requestIds = [];

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const userId = userIds[i % userIds.length];

    // Check if similar request exists
    const existing = get('SELECT id FROM requests WHERE title = ?', [req.title]);
    if (!existing) {
      // Add some date variation (last 30 days)
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      run(
        `INSERT INTO requests (user_id, title, category, priority, status, business_problem, problem_size, business_expectations, expected_impact, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, req.title, req.category, req.priority, req.status, req.business_problem, req.problem_size, req.business_expectations, req.expected_impact, createdAt]
      );
      const newReq = get('SELECT id FROM requests WHERE title = ?', [req.title]);
      requestIds.push(newReq.id);
      console.log(`  Created: ${req.title.substring(0, 50)}...`);
    } else {
      requestIds.push(existing.id);
      console.log(`  Exists: ${req.title.substring(0, 50)}...`);
    }
  }

  // Add random votes
  console.log('\nAdding votes...');
  for (const requestId of requestIds) {
    // Random number of upvotes (0-8)
    const upvoteCount = Math.floor(Math.random() * 9);
    // Random number of likes (0-5)
    const likeCount = Math.floor(Math.random() * 6);

    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < upvoteCount && i < shuffledUsers.length; i++) {
      const userId = shuffledUsers[i];
      const existing = get(
        'SELECT id FROM votes WHERE request_id = ? AND user_id = ? AND type = ?',
        [requestId, userId, 'upvote']
      );
      if (!existing) {
        run(
          'INSERT INTO votes (request_id, user_id, type) VALUES (?, ?, ?)',
          [requestId, userId, 'upvote']
        );
      }
    }

    for (let i = 0; i < likeCount && i < shuffledUsers.length; i++) {
      const userId = shuffledUsers[i];
      const existing = get(
        'SELECT id FROM votes WHERE request_id = ? AND user_id = ? AND type = ?',
        [requestId, userId, 'like']
      );
      if (!existing) {
        run(
          'INSERT INTO votes (request_id, user_id, type) VALUES (?, ?, ?)',
          [requestId, userId, 'like']
        );
      }
    }
  }
  console.log('  Added random votes to requests');

  // Add random comments
  console.log('\nAdding comments...');
  for (const requestId of requestIds) {
    // Random number of comments (0-3)
    const commentCount = Math.floor(Math.random() * 4);
    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < commentCount; i++) {
      const userId = shuffledUsers[i % shuffledUsers.length];
      const comment = comments[Math.floor(Math.random() * comments.length)];

      run(
        'INSERT INTO comments (request_id, user_id, content) VALUES (?, ?, ?)',
        [requestId, userId, comment]
      );
    }
  }
  console.log('  Added random comments to requests');

  // Summary
  const totalRequests = all('SELECT COUNT(*) as count FROM requests')[0].count;
  const totalUsers = all('SELECT COUNT(*) as count FROM users')[0].count;
  const totalVotes = all('SELECT COUNT(*) as count FROM votes')[0].count;
  const totalComments = all('SELECT COUNT(*) as count FROM comments')[0].count;

  console.log('\n--- Seed Complete ---');
  console.log(`Users: ${totalUsers}`);
  console.log(`Requests: ${totalRequests}`);
  console.log(`Votes: ${totalVotes}`);
  console.log(`Comments: ${totalComments}`);
  console.log('\nTest accounts:');
  console.log('  Admin: admin@company.com / admin123');
  console.log('  User: sarah@company.com / password123');
}

seed().catch(console.error);
