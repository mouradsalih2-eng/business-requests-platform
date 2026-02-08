import { requestRepository } from '../repositories/requestRepository.js';
import { voteRepository } from '../repositories/voteRepository.js';
import { commentRepository } from '../repositories/commentRepository.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { formConfigRepository } from '../repositories/formConfigRepository.js';
import { customFieldValueRepository } from '../repositories/customFieldValueRepository.js';
import { AppError, NotFoundError, ValidationError, ForbiddenError } from '../errors/AppError.js';

export const requestService = {
  /**
   * Merge a source request into a target request.
   */
  async merge({ sourceId, targetId, mergeVotes = true, mergeComments = false, adminUserId }) {
    if (sourceId === targetId) throw new ValidationError('Cannot merge request into itself');

    const source = await requestRepository.findByIdOrFail(sourceId);
    const target = await requestRepository.findByIdOrFail(targetId);

    if (source.merged_into_id) throw new ValidationError('Source request is already merged');

    // Transfer votes
    if (mergeVotes) {
      const sourceVotes = await voteRepository.findByRequest(sourceId);
      for (const vote of sourceVotes) {
        const existing = await voteRepository.findByRequestAndUser(targetId, vote.user_id, vote.type);
        if (!existing) {
          await voteRepository.create(targetId, vote.user_id, vote.type);
        }
      }
      await voteRepository.deleteByRequest(sourceId);
    }

    // Transfer comments
    if (mergeComments) {
      await commentRepository.moveToRequest(sourceId, targetId);
    }

    // Mark source as duplicate
    await requestRepository.update(sourceId, { status: 'duplicate', merged_into_id: targetId });

    // Log activity on both requests
    await activityRepository.create({
      requestId: sourceId, userId: adminUserId, action: 'merge',
      oldValue: source.status, newValue: `Merged into #${targetId}`,
    });
    await activityRepository.create({
      requestId: targetId, userId: adminUserId, action: 'merge_received',
      oldValue: null, newValue: `Merged from #${sourceId}`,
    });

    const updatedSource = await requestRepository.findById(sourceId);
    return {
      message: 'Request merged successfully',
      source: updatedSource,
      target_id: targetId,
      votes_transferred: mergeVotes,
      comments_transferred: mergeComments,
    };
  },

  /**
   * Compute analytics data for the admin dashboard.
   * If analytics_fields is configured, produces dynamic breakdowns.
   * Always includes legacy hardcoded keys for backwards compatibility.
   */
  async getAnalytics(period, projectId) {
    const now = new Date();
    let days, groupBy;

    switch (period) {
      case '7days':  days = 7;   groupBy = 'day';   break;
      case '30days': days = 30;  groupBy = 'week';  break;
      case '90days': days = 90;  groupBy = 'month'; break;
      default:       days = 3650; groupBy = 'month'; break;
    }

    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const requests = await requestRepository.findForAnalytics(startDate, projectId);

    // Group by time period
    const grouped = {};
    for (const r of requests) {
      const key = periodKey(new Date(r.created_at), groupBy);
      if (!grouped[key]) grouped[key] = { label: key, count: 0, pending: 0, completed: 0 };
      grouped[key].count++;
      if (r.status === 'pending') grouped[key].pending++;
      if (r.status === 'completed') grouped[key].completed++;
    }

    let data = Object.values(grouped);

    // Fill missing days for 7-day view
    if (groupBy === 'day') {
      const filled = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        filled.push(grouped[key] || { label: key, count: 0, pending: 0, completed: 0 });
      }
      data = filled;
    }

    const count = (fn) => requests.filter(fn).length;

    // Legacy hardcoded breakdowns (always included for backwards compat)
    const categoryBreakdown = {
      bug: count(r => r.category === 'bug'),
      new_feature: count(r => r.category === 'new_feature'),
      optimization: count(r => r.category === 'optimization'),
    };
    const priorityBreakdown = {
      high: count(r => r.priority === 'high'),
      medium: count(r => r.priority === 'medium'),
      low: count(r => r.priority === 'low'),
    };
    const teamBreakdown = {
      Manufacturing: count(r => r.team === 'Manufacturing'),
      Sales: count(r => r.team === 'Sales'),
      Service: count(r => r.team === 'Service'),
      Energy: count(r => r.team === 'Energy'),
    };
    const regionBreakdown = {
      EMEA: count(r => r.region === 'EMEA'),
      'North America': count(r => r.region === 'North America'),
      APAC: count(r => r.region === 'APAC'),
      Global: count(r => r.region === 'Global'),
    };

    // Load form config to check for analytics_fields
    let formConfig = null;
    let customFields = [];
    try {
      if (projectId) {
        formConfig = await formConfigRepository.getConfig(projectId);
        customFields = await formConfigRepository.getCustomFields(projectId);
      }
    } catch { /* ignore — fall back to hardcoded */ }

    const analyticsFieldKeys = formConfig?.analytics_fields;

    // Build dynamic breakdowns if configured
    let breakdowns;
    if (Array.isArray(analyticsFieldKeys) && analyticsFieldKeys.length > 0) {
      breakdowns = [];

      // Built-in field label/option mappings
      const builtinDefs = {
        category: {
          label: 'Category',
          getOptions: () => formConfig?.custom_categories?.length
            ? formConfig.custom_categories
            : [{ value: 'bug', label: 'Bug' }, { value: 'new_feature', label: 'New Feature' }, { value: 'optimization', label: 'Optimization' }],
          getValue: (r) => r.category,
        },
        priority: {
          label: 'Priority',
          getOptions: () => formConfig?.custom_priorities?.length
            ? formConfig.custom_priorities
            : [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }],
          getValue: (r) => r.priority,
        },
        team: {
          label: 'Team',
          getOptions: () => formConfig?.custom_teams?.length
            ? formConfig.custom_teams
            : [{ value: 'Manufacturing', label: 'Manufacturing' }, { value: 'Sales', label: 'Sales' }, { value: 'Service', label: 'Service' }, { value: 'Energy', label: 'Energy' }],
          getValue: (r) => r.team,
        },
        region: {
          label: 'Region',
          getOptions: () => formConfig?.custom_regions?.length
            ? formConfig.custom_regions
            : [{ value: 'EMEA', label: 'EMEA' }, { value: 'North America', label: 'North America' }, { value: 'APAC', label: 'APAC' }, { value: 'Global', label: 'Global' }],
          getValue: (r) => r.region,
        },
      };

      // Process built-in fields in analytics config
      for (const key of analyticsFieldKeys) {
        if (builtinDefs[key]) {
          const def = builtinDefs[key];
          const values = {};
          const opts = def.getOptions();
          for (const opt of opts) {
            const label = typeof opt === 'string' ? opt : (opt.label || opt.value);
            const val = typeof opt === 'string' ? opt : opt.value;
            values[label] = count(r => def.getValue(r) === val);
          }
          breakdowns.push({ key, label: def.label, type: 'builtin', values });
        }
      }

      // Process custom fields in analytics config
      const customFieldKeys = analyticsFieldKeys.filter(k => k.startsWith('custom_'));
      if (customFieldKeys.length > 0) {
        const customFieldIds = customFieldKeys
          .map(k => parseInt(k.replace('custom_', ''), 10))
          .filter(id => !isNaN(id));

        let customFieldValues = [];
        try {
          customFieldValues = await customFieldValueRepository.findForAnalytics(startDate, projectId, customFieldIds);
        } catch { /* ignore */ }

        for (const key of customFieldKeys) {
          const fieldId = parseInt(key.replace('custom_', ''), 10);
          const cf = customFields.find(f => f.id === fieldId);
          if (!cf) continue;

          const values = {};
          const fieldValues = customFieldValues.filter(v => v.field_id === fieldId);

          for (const v of fieldValues) {
            // multi_select: value_json is an array; select: value_text is a string
            if (Array.isArray(v.value_json)) {
              for (const item of v.value_json) {
                const label = String(item);
                values[label] = (values[label] || 0) + 1;
              }
            } else if (v.value_text) {
              values[v.value_text] = (values[v.value_text] || 0) + 1;
            }
          }

          breakdowns.push({ key, label: cf.label, type: 'custom', values });
        }
      }
    }

    return {
      trendData: data,
      summary: {
        total: requests.length,
        pending: count(r => r.status === 'pending'),
        completed: count(r => r.status === 'completed'),
        inProgress: count(r => r.status === 'in_progress'),
        archived: count(r => r.status === 'archived'),
      },
      // Dynamic breakdowns (undefined if no config)
      breakdowns,
      // Legacy keys for backwards compat
      categoryBreakdown,
      priorityBreakdown,
      teamBreakdown,
      regionBreakdown,
    };
  },

  /**
   * Search requests for autocomplete.
   */
  async search(query, limit = 10, projectId) {
    if (!query || query.length < 2) return [];

    const requests = await requestRepository.findAllBasic(projectId);
    const term = query.toLowerCase();
    const limitNum = Math.min(parseInt(limit, 10) || 10, 20);

    return requests
      .map(r => {
        const titleLower = r.title.toLowerCase();
        const authorLower = (r.author_name || '').toLowerCase();
        let score = 0;

        if (titleLower === term) score = 100;
        else if (titleLower.startsWith(term)) score = 90;
        else if (authorLower === term) score = 80;
        else if (authorLower.startsWith(term)) score = 70;
        else if (new RegExp(`\\b${term}`, 'i').test(r.title)) score = 50;
        else if (new RegExp(`\\b${term}`, 'i').test(r.author_name)) score = 40;
        else if (titleLower.includes(term)) score = 20;
        else if (authorLower.includes(term)) score = 10;

        return { ...r, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limitNum);
  },
};

// ── helpers ──────────────────────────────────────────────────

function periodKey(date, groupBy) {
  if (groupBy === 'day') return date.toISOString().split('T')[0];
  if (groupBy === 'week') {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
