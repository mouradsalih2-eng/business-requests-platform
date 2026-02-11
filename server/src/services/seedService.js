import { supabase } from '../db/supabase.js';
import { userRepository } from '../repositories/userRepository.js';
import { requestRepository } from '../repositories/requestRepository.js';
import { voteRepository } from '../repositories/voteRepository.js';
import { commentRepository } from '../repositories/commentRepository.js';
import { projectMemberRepository } from '../repositories/projectMemberRepository.js';

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const SEED_USERS = [
  { email: 'sarah@company.com', name: 'Sarah Johnson' },
  { email: 'mike@company.com', name: 'Mike Chen' },
  { email: 'emily@company.com', name: 'Emily Davis' },
  { email: 'james@company.com', name: 'James Wilson' },
  { email: 'lisa@company.com', name: 'Lisa Park' },
  { email: 'alex@company.com', name: 'Alex Rodriguez' },
  { email: 'jessica@company.com', name: 'Jessica Lee' },
  { email: 'david@company.com', name: 'David Kim' },
  { email: 'rachel@company.com', name: 'Rachel Green' },
  { email: 'tom@company.com', name: 'Tom Anderson' },
];

const DETAILED_REQUESTS = [
  { title: 'Mobile App Performance Issues on Android', category: 'bug', priority: 'high', status: 'in_progress', business_problem: 'The Android app is experiencing significant lag when loading the dashboard.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Add Dark Mode to Dashboard', category: 'new_feature', priority: 'medium', status: 'backlog', business_problem: 'Many users work late hours and have requested dark mode.', team: 'Sales', region: 'North America' },
  { title: 'Optimize Database Query Performance', category: 'optimization', priority: 'high', status: 'pending', business_problem: 'Report generation is taking over 30 seconds for large datasets.', team: 'Service', region: 'APAC' },
  { title: 'Export Data to Excel Feature', category: 'new_feature', priority: 'medium', status: 'completed', business_problem: 'Users currently have to manually copy data.', team: 'Energy', region: 'Global' },
  { title: 'Login Page Shows Error for Valid Credentials', category: 'bug', priority: 'high', status: 'pending', business_problem: 'Some users are unable to log in.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Add Two-Factor Authentication', category: 'new_feature', priority: 'high', status: 'backlog', business_problem: 'Enterprise clients require 2FA for compliance.', team: 'Sales', region: 'North America' },
  { title: 'Reduce Page Load Time on Dashboard', category: 'optimization', priority: 'medium', status: 'in_progress', business_problem: 'Main dashboard takes 4-5 seconds to load.', team: 'Service', region: 'APAC' },
  { title: 'Notification Center Not Showing All Alerts', category: 'bug', priority: 'medium', status: 'pending', business_problem: 'Users report missing notifications.', team: 'Energy', region: 'Global' },
  { title: 'Add Bulk User Import via CSV', category: 'new_feature', priority: 'low', status: 'pending', business_problem: 'Onboarding large teams requires manual account creation.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Memory Leak in Real-time Updates', category: 'bug', priority: 'high', status: 'rejected', business_problem: 'Browser memory usage grows continuously.', team: 'Sales', region: 'North America' },
  { title: 'Improve Search Functionality', category: 'optimization', priority: 'medium', status: 'completed', business_problem: 'Current search only matches exact terms.', team: 'Service', region: 'APAC' },
  { title: 'Add Keyboard Shortcuts', category: 'new_feature', priority: 'low', status: 'duplicate', business_problem: 'Power users want keyboard navigation.', team: 'Energy', region: 'Global' },
  { title: 'API Rate Limiting for Third-party Integrations', category: 'new_feature', priority: 'medium', status: 'backlog', business_problem: 'Third-party integrations sometimes overwhelm our API.', team: 'Manufacturing', region: 'EMEA' },
  { title: 'Fix Timezone Display in Reports', category: 'bug', priority: 'low', status: 'completed', business_problem: 'Reports show times in UTC.', team: 'Sales', region: 'North America' },
  { title: 'Streamline Onboarding Flow', category: 'optimization', priority: 'medium', status: 'pending', business_problem: 'New users take 15 minutes to complete onboarding.', team: 'Service', region: 'APAC' },
];

const REQUEST_TITLES = [
  'Improve loading performance', 'Add new dashboard widget', 'Fix data sync issue', 'Implement export feature',
  'Update user interface', 'Optimize database queries', 'Add email notifications', 'Fix mobile layout',
  'Implement caching layer', 'Add dark mode support', 'Fix PDF generation', 'Improve search functionality',
  'Add bulk import feature', 'Fix authentication bug', 'Optimize API responses', 'Add keyboard shortcuts',
  'Fix timezone issues', 'Implement rate limiting', 'Add activity logging', 'Fix memory leak',
  'Improve error handling', 'Add multi-language support', 'Fix session timeout', 'Optimize image loading', 'Add custom reports',
];

const CATEGORIES = ['bug', 'new_feature', 'optimization'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['pending', 'backlog', 'in_progress', 'completed', 'rejected'];
const TEAMS = ['Manufacturing', 'Sales', 'Service', 'Energy'];
const REGIONS = ['EMEA', 'North America', 'APAC', 'Global'];
const COMMENTS = [
  'This is really affecting our daily workflow. Hope this gets prioritized!',
  'We have a workaround for now but would love a proper fix.',
  'Our team has been waiting for this feature for months.',
  'Great suggestion! This would save us so much time.',
  '+1 from our department. This is a pain point for us too.',
  'Is there an ETA on this? We need to plan around it.',
  'Thanks for raising this. We experience the same issue.',
  'Would be great to have this before Q2.',
];
const TAG_OPTIONS = ['urgent', 'quick-win', 'customer-request', 'technical-debt', 'security', 'ux', 'performance', 'integration'];

const SEED_PASSWORD = 'password123';

/**
 * Creates or finds a Supabase Auth user + app user row for seeding.
 */
async function ensureSeedUser(email, name, role = 'employee') {
  // Check if app user already exists
  let existing = await userRepository.findByEmail(email, 'id, auth_id');
  if (existing) return existing;

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError) {
    // If already exists in Supabase Auth, look them up
    if (authError.message?.includes('already') || authError.status === 422) {
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const found = authUsers?.find(u => u.email === email);
      if (found) {
        // Create app user linked to existing auth user
        return userRepository.create({ email, name, role, auth_id: found.id });
      }
    }
    console.warn(`Failed to create auth user for ${email}: ${authError.message}`);
    // Fall back to creating user without auth_id
    return userRepository.create({ email, name, role });
  }

  return userRepository.create({ email, name, role, auth_id: authData.user.id });
}

export async function seedDatabase(projectId) {
  if (!projectId) throw new Error('projectId is required for seeding');

  const userIds = [];

  // Create test users with Supabase Auth accounts and add as project members
  for (const u of SEED_USERS) {
    const user = await ensureSeedUser(u.email, u.name);
    userIds.push(user.id);
    // Add as project member (ignore if already a member)
    try {
      await projectMemberRepository.addMember(projectId, user.id, 'member');
    } catch { /* already a member */ }
  }

  const admin = await userRepository.findByEmail('admin@company.com', 'id');
  if (admin) userIds.push(admin.id);

  // Create 15 detailed requests
  const allRequestIds = [];
  for (let i = 0; i < DETAILED_REQUESTS.length; i++) {
    const r = DETAILED_REQUESTS[i];
    let existing = await requestRepository.findByTitle(r.title);
    if (!existing) {
      const daysAgo = randomInt(0, 30);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      existing = await requestRepository.create({
        user_id: userIds[i % userIds.length], title: r.title, category: r.category,
        priority: r.priority, status: r.status, business_problem: r.business_problem,
        team: r.team, region: r.region, created_at: createdAt,
        project_id: projectId,
      });
    }
    allRequestIds.push(existing.id);
  }

  // Create 100 additional requests
  const now = new Date();
  const distributions = [
    { count: 10, minDays: 0, maxDays: 0 },
    { count: 20, minDays: 1, maxDays: 6 },
    { count: 30, minDays: 7, maxDays: 29 },
    { count: 25, minDays: 30, maxDays: 89 },
    { count: 15, minDays: 90, maxDays: 180 },
  ];

  let num = 1;
  for (const dist of distributions) {
    for (let i = 0; i < dist.count; i++) {
      const daysAgo = dist.minDays === dist.maxDays ? dist.minDays : randomInt(dist.minDays, dist.maxDays);
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - randomInt(0, 23) * 3600000).toISOString();
      const title = `${randomChoice(REQUEST_TITLES)} - ${randomChoice(TEAMS)} ${randomChoice(REGIONS)} #${num}`;
      let existing = await requestRepository.findByTitle(title);
      if (!existing) {
        existing = await requestRepository.create({
          user_id: randomChoice(userIds), title, category: randomChoice(CATEGORIES),
          priority: randomChoice(PRIORITIES), status: randomChoice(STATUSES),
          team: randomChoice(TEAMS), region: randomChoice(REGIONS),
          business_problem: `Request for ${randomChoice(TEAMS)} team in ${randomChoice(REGIONS)}.`,
          created_at: createdAt,
          project_id: projectId,
        });
        allRequestIds.push(existing.id);
      }
      num++;
    }
  }

  // Add votes, comments, tags
  for (const requestId of allRequestIds) {
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);

    for (let i = 0; i < randomInt(0, 8) && i < shuffled.length; i++) {
      try { await voteRepository.create(requestId, shuffled[i], 'upvote'); } catch { /* ignore duplicates */ }
    }
    for (let i = 0; i < randomInt(0, 5) && i < shuffled.length; i++) {
      try { await voteRepository.create(requestId, shuffled[i], 'like'); } catch { /* ignore duplicates */ }
    }
    for (let i = 0; i < randomInt(0, 3); i++) {
      await commentRepository.create(requestId, shuffled[i % shuffled.length], randomChoice(COMMENTS));
    }

    const tags = [...TAG_OPTIONS].sort(() => Math.random() - 0.5).slice(0, randomInt(0, 3));
    for (const tag of tags) {
      await supabase.from('request_tags').upsert({ request_id: requestId, tag }, { onConflict: 'request_id,tag', ignoreDuplicates: true });
    }
  }

  const [users, requests, votes, comments] = await Promise.all([
    userRepository.count(), requestRepository.countByProject(projectId), voteRepository.count(), commentRepository.count(),
  ]);

  return { message: 'Database seeded successfully', users, requests, votes, comments };
}

/**
 * Removes all seed-generated users (by known SEED_USERS emails) and their
 * associated requests, votes, comments, tags, and activity log entries.
 * Does NOT delete the admin user or any real users.
 */
export async function unseedDatabase(projectId) {
  const seedEmails = SEED_USERS.map(u => u.email);

  // Find seed user IDs
  const seedUserRows = [];
  for (const email of seedEmails) {
    const user = await userRepository.findByEmail(email, 'id, auth_id');
    if (user) seedUserRows.push(user);
  }

  if (seedUserRows.length === 0) {
    return { message: 'No seed data found', deleted: { users: 0, requests: 0, votes: 0, comments: 0 } };
  }

  const seedUserIds = seedUserRows.map(u => u.id);

  // Find all requests created by seed users (scoped to project if provided)
  let seedRequestQuery = supabase
    .from('requests')
    .select('id')
    .in('user_id', seedUserIds);
  if (projectId) seedRequestQuery = seedRequestQuery.eq('project_id', projectId);
  const { data: seedRequests } = await seedRequestQuery;
  const seedRequestIds = (seedRequests || []).map(r => r.id);

  // Delete in dependency order
  let deletedVotes = 0;
  let deletedComments = 0;

  if (seedRequestIds.length > 0) {
    // Delete votes on seed requests
    const { count: vc } = await supabase
      .from('votes')
      .delete({ count: 'exact' })
      .in('request_id', seedRequestIds);
    deletedVotes = vc || 0;

    // Delete comment_mentions for comments on seed requests
    const { data: seedComments } = await supabase
      .from('comments')
      .select('id')
      .in('request_id', seedRequestIds);
    if (seedComments?.length) {
      await supabase.from('comment_mentions').delete().in('comment_id', seedComments.map(c => c.id));
    }

    // Delete comments on seed requests
    const { count: cc } = await supabase
      .from('comments')
      .delete({ count: 'exact' })
      .in('request_id', seedRequestIds);
    deletedComments = cc || 0;

    // Delete tags on seed requests
    await supabase.from('request_tags').delete().in('request_id', seedRequestIds);

    // Delete activity log for seed requests
    await supabase.from('activity_log').delete().in('request_id', seedRequestIds);

    // Delete admin_read_status for seed requests
    await supabase.from('admin_read_status').delete().in('request_id', seedRequestIds);

    // Delete request_custom_field_values for seed requests
    await supabase.from('request_custom_field_values').delete().in('request_id', seedRequestIds);

    // Delete attachments for seed requests
    await supabase.from('attachments').delete().in('request_id', seedRequestIds);

    // Delete roadmap items synced to seed requests
    await supabase.from('roadmap_items').delete().in('request_id', seedRequestIds);
  }

  // Delete the seed requests themselves (scoped to project if provided)
  let deleteRequestsQuery = supabase
    .from('requests')
    .delete({ count: 'exact' })
    .in('user_id', seedUserIds);
  if (projectId) deleteRequestsQuery = deleteRequestsQuery.eq('project_id', projectId);
  const { count: rc } = await deleteRequestsQuery;

  // Remove seed users from this project's membership
  if (projectId) {
    for (const userId of seedUserIds) {
      await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
    }
  }

  // Also delete any votes/comments seed users made on non-seed requests
  await supabase.from('votes').delete().in('user_id', seedUserIds);
  await supabase.from('comments').delete().in('user_id', seedUserIds);

  // Delete Supabase Auth accounts for seed users
  for (const u of seedUserRows) {
    if (u.auth_id) {
      await supabase.auth.admin.deleteUser(u.auth_id).catch(() => {});
    }
  }

  // Delete the seed users from app DB
  for (const u of seedUserRows) {
    await userRepository.delete(u.id);
  }

  return {
    message: 'Seed data removed successfully',
    deleted: {
      users: seedUserRows.length,
      requests: rc || 0,
      votes: deletedVotes,
      comments: deletedComments,
    },
  };
}
