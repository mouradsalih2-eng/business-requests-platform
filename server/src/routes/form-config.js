import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireProject, requireProjectAdmin } from '../middleware/project.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { formConfigRepository } from '../repositories/formConfigRepository.js';
import { requestRepository } from '../repositories/requestRepository.js';
import { ValidationError, NotFoundError } from '../errors/AppError.js';

const router = Router();

const VALID_FIELD_TYPES = ['text', 'textarea', 'select', 'multi_select', 'number', 'date', 'checkbox', 'rating', 'url', 'user_picker'];

// ── Form Config (Level 1 + 2) ────────────────────────────

// Get form config for current project
router.get('/', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  let config = await formConfigRepository.getConfig(req.project.id);
  if (!config) {
    // Create default config
    config = await formConfigRepository.upsertConfig(req.project.id, {});
  }

  // Also return custom fields
  const customFields = await formConfigRepository.getCustomFields(req.project.id);

  res.json({ config, customFields });
}));

// Get impact count (how many requests in this project)
router.get('/impact', authenticateToken, requireProject, asyncHandler(async (req, res) => {
  const count = await requestRepository.countByProject(req.project.id);
  res.json({ requestCount: count });
}));

// Update form config (admin)
router.patch('/', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const {
    show_category, show_priority,
    show_team, show_region, show_business_problem, show_problem_size,
    show_business_expectations, show_expected_impact,
    custom_categories, custom_priorities, custom_teams, custom_regions, custom_statuses,
    field_order, card_fields, analytics_fields,
  } = req.body;

  const updates = {};
  if (show_category !== undefined) updates.show_category = show_category;
  if (show_priority !== undefined) updates.show_priority = show_priority;
  if (show_team !== undefined) updates.show_team = show_team;
  if (show_region !== undefined) updates.show_region = show_region;
  if (show_business_problem !== undefined) updates.show_business_problem = show_business_problem;
  if (show_problem_size !== undefined) updates.show_problem_size = show_problem_size;
  if (show_business_expectations !== undefined) updates.show_business_expectations = show_business_expectations;
  if (show_expected_impact !== undefined) updates.show_expected_impact = show_expected_impact;
  if (custom_categories !== undefined) updates.custom_categories = custom_categories;
  if (custom_priorities !== undefined) updates.custom_priorities = custom_priorities;
  if (custom_teams !== undefined) updates.custom_teams = custom_teams;
  if (custom_regions !== undefined) updates.custom_regions = custom_regions;
  if (custom_statuses !== undefined) updates.custom_statuses = custom_statuses;
  if (field_order !== undefined) updates.field_order = field_order;
  if (card_fields !== undefined) updates.card_fields = card_fields;
  if (analytics_fields !== undefined) updates.analytics_fields = analytics_fields;

  const config = await formConfigRepository.upsertConfig(req.project.id, updates);
  res.json(config);
}));

// Bulk save form config + custom fields (for onboarding stepper)
router.put('/bulk', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const { config, customFields } = req.body;
  const result = await formConfigRepository.bulkSave(req.project.id, { config, customFields });
  res.json(result);
}));

// Reorder custom fields
router.patch('/fields/reorder', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) throw new ValidationError('orderedIds must be an array');
  await formConfigRepository.reorderFields(req.project.id, orderedIds);
  res.json({ message: 'Fields reordered' });
}));

// ── Custom Fields (Level 3) ──────────────────────────────

// Create custom field
router.post('/fields', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const { name, label, field_type, options, is_required, sort_order, visibility, show_on_card, icon, color } = req.body;

  if (!name?.trim()) throw new ValidationError('Field name is required');
  if (!label?.trim()) throw new ValidationError('Field label is required');
  if (!VALID_FIELD_TYPES.includes(field_type)) {
    throw new ValidationError(`Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`);
  }

  // Validate name format (slug-like)
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new ValidationError('Field name must contain only lowercase letters, numbers, and underscores');
  }

  const field = await formConfigRepository.createCustomField(req.project.id, {
    name: name.trim(),
    label: label.trim(),
    field_type,
    options: options || null,
    is_required: is_required || false,
    sort_order: sort_order || 0,
    visibility: visibility || 'all',
    show_on_card: show_on_card || false,
    icon: icon || null,
    color: color || null,
  });

  res.status(201).json(field);
}));

// Update custom field
router.patch('/fields/:fieldId', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const fieldId = parseInt(req.params.fieldId, 10);
  const existing = await formConfigRepository.getCustomField(fieldId);
  if (!existing) throw new NotFoundError('Custom field');
  if (existing.project_id !== req.project.id) throw new NotFoundError('Custom field');

  const { label, options, is_required, sort_order, visibility, show_on_card, icon, color, is_enabled } = req.body;
  const updates = {};
  if (label !== undefined) updates.label = label;
  if (options !== undefined) updates.options = options;
  if (is_required !== undefined) updates.is_required = is_required;
  if (sort_order !== undefined) updates.sort_order = sort_order;
  if (visibility !== undefined) updates.visibility = visibility;
  if (show_on_card !== undefined) updates.show_on_card = show_on_card;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (is_enabled !== undefined) updates.is_enabled = is_enabled;

  const field = await formConfigRepository.updateCustomField(fieldId, updates);
  res.json(field);
}));

// Delete custom field (soft-delete: sets is_enabled = false to preserve existing data)
router.delete('/fields/:fieldId', authenticateToken, requireProject, requireProjectAdmin, asyncHandler(async (req, res) => {
  const fieldId = parseInt(req.params.fieldId, 10);
  const existing = await formConfigRepository.getCustomField(fieldId);
  if (!existing) throw new NotFoundError('Custom field');
  if (existing.project_id !== req.project.id) throw new NotFoundError('Custom field');

  // Soft-delete: disable the field but preserve existing request data
  await formConfigRepository.updateCustomField(fieldId, { is_enabled: false });
  res.json({ message: 'Custom field disabled' });
}));

export default router;
