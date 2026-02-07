import { requestRepository } from '../repositories/requestRepository.js';
import { voteRepository } from '../repositories/voteRepository.js';
import { commentRepository } from '../repositories/commentRepository.js';
import { activityRepository } from '../repositories/activityRepository.js';
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

    return {
      trendData: data,
      summary: {
        total: requests.length,
        pending: count(r => r.status === 'pending'),
        completed: count(r => r.status === 'completed'),
        inProgress: count(r => r.status === 'in_progress'),
        archived: count(r => r.status === 'archived'),
      },
      categoryBreakdown: {
        bug: count(r => r.category === 'bug'),
        new_feature: count(r => r.category === 'new_feature'),
        optimization: count(r => r.category === 'optimization'),
      },
      priorityBreakdown: {
        high: count(r => r.priority === 'high'),
        medium: count(r => r.priority === 'medium'),
        low: count(r => r.priority === 'low'),
      },
      teamBreakdown: {
        Manufacturing: count(r => r.team === 'Manufacturing'),
        Sales: count(r => r.team === 'Sales'),
        Service: count(r => r.team === 'Service'),
        Energy: count(r => r.team === 'Energy'),
      },
      regionBreakdown: {
        EMEA: count(r => r.region === 'EMEA'),
        'North America': count(r => r.region === 'North America'),
        APAC: count(r => r.region === 'APAC'),
        Global: count(r => r.region === 'Global'),
      },
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
