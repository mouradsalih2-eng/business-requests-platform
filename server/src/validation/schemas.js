import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Request schemas
export const requestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  category: z.enum(['bug', 'new_feature', 'optimization'], {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Invalid priority' }),
  }),
  team: z.enum(['Manufacturing', 'Sales', 'Service', 'Energy']).optional(),
  region: z.enum(['EMEA', 'North America', 'APAC', 'Global']).optional(),
  business_problem: z.string().optional(),
  problem_size: z.string().optional(),
  business_expectations: z.string().optional(),
  expected_impact: z.string().optional(),
  on_behalf_of_user_id: z.coerce.number().int().positive().optional(),
  on_behalf_of_name: z.string().max(200).optional(),
});

export const requestUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(['bug', 'new_feature', 'optimization']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'backlog', 'in_progress', 'completed', 'rejected', 'duplicate', 'archived']).optional(),
  team: z.enum(['Manufacturing', 'Sales', 'Service', 'Energy']).optional(),
  region: z.enum(['EMEA', 'North America', 'APAC', 'Global']).optional(),
  business_problem: z.string().optional(),
  problem_size: z.string().optional(),
  business_expectations: z.string().optional(),
  expected_impact: z.string().optional(),
});

// Comment schemas
export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment too long'),
});

// Vote schema
export const voteSchema = z.object({
  type: z.enum(['upvote', 'like'], {
    errorMap: () => ({ message: 'Invalid vote type' }),
  }),
});

// Roadmap schemas
export const roadmapItemSchema = z.object({
  request_id: z.number().int().positive().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000).optional(),
  category: z.enum(['bug', 'new_feature', 'optimization']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  team: z.enum(['Manufacturing', 'Sales', 'Service', 'Energy']).optional(),
  region: z.enum(['EMEA', 'North America', 'APAC', 'Global']).optional(),
  column_status: z.enum(['backlog', 'discovery', 'in_progress', 'released']).optional(),
});

export const roadmapMoveSchema = z.object({
  column_status: z.enum(['backlog', 'discovery', 'in_progress', 'released']),
  position: z.number().int().min(0),
});

// Merge schema
export const mergeRequestSchema = z.object({
  target_id: z.number().int().positive('Invalid target request ID'),
  merge_votes: z.boolean().optional().default(true),
  merge_comments: z.boolean().optional().default(false),
});
