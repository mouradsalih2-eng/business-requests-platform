import { roadmapRepository } from '../repositories/roadmapRepository.js';
import { requestRepository } from '../repositories/requestRepository.js';
import { activityRepository } from '../repositories/activityRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors/AppError.js';

const STATUS_MAP = {
  backlog: 'backlog',
  in_progress: 'in_progress',
  released: 'completed',
};

export const roadmapService = {
  /**
   * Get all roadmap items grouped by column, including auto-synced requests.
   */
  async getGrouped() {
    const roadmapItems = await roadmapRepository.findAll();

    const linkedRequestIds = roadmapItems
      .filter(i => i.request_id)
      .map(i => i.request_id);

    const requests = await roadmapRepository.findSyncableRequests(linkedRequestIds);

    const statusToColumn = { pending: 'backlog', backlog: 'backlog', in_progress: 'in_progress', completed: 'released' };

    const grouped = { backlog: [], in_progress: [], released: [] };

    for (const item of roadmapItems) {
      if (grouped[item.column_status]) grouped[item.column_status].push(item);
    }

    for (const req of requests) {
      const column = statusToColumn[req.status] || 'backlog';
      if (grouped[column]) {
        grouped[column].push({
          id: `request-${req.id}`,
          request_id: req.id,
          title: req.title,
          description: req.description,
          category: req.category,
          priority: req.priority,
          team: req.team,
          region: req.region,
          column_status: column,
          position: 999999,
          created_at: req.created_at,
          updated_at: req.updated_at,
          created_by_name: req.created_by_name,
          source: 'request',
          is_synced: true,
        });
      }
    }

    return grouped;
  },

  async create(body, adminUserId) {
    const { request_id, title, description, category, priority, team, region, column_status = 'backlog', is_discovery = false } = body;

    const validColumns = ['backlog', 'in_progress', 'released'];
    const finalColumn = validColumns.includes(column_status) ? column_status : 'backlog';

    const maxPos = await roadmapRepository.getMaxPosition(finalColumn);

    const item = await roadmapRepository.create({
      request_id: request_id || null,
      title,
      description: description || null,
      category: category || null,
      priority: priority || null,
      team: team || null,
      region: region || null,
      column_status: finalColumn,
      position: maxPos + 1,
      created_by: adminUserId,
      is_discovery: is_discovery ? 1 : 0,
    });

    if (request_id && finalColumn !== 'backlog' && STATUS_MAP[finalColumn]) {
      await requestRepository.update(request_id, { status: STATUS_MAP[finalColumn] });
    }

    return item;
  },

  async move(id, columnStatus, position, adminUserId) {
    const existing = await roadmapRepository.findByIdOrFail(id);
    const oldColumn = existing.column_status;
    const oldPosition = existing.position;

    if (oldColumn === columnStatus) {
      if (position > oldPosition) {
        await roadmapRepository.updatePositionsInRange(columnStatus, oldPosition + 1, position, -1);
      } else if (position < oldPosition) {
        await roadmapRepository.updatePositionsInRange(columnStatus, position, oldPosition - 1, 1);
      }
    } else {
      await roadmapRepository.updatePositionsInColumn(oldColumn, oldPosition, -1);
      await roadmapRepository.updatePositionsInRange(columnStatus, position, 999999, 1);
    }

    const item = await roadmapRepository.update(id, { column_status: columnStatus, position });

    if (existing.request_id && STATUS_MAP[columnStatus]) {
      await requestRepository.update(existing.request_id, { status: STATUS_MAP[columnStatus] });
      const oldStatus = STATUS_MAP[oldColumn] || oldColumn;
      await activityRepository.create({
        requestId: existing.request_id,
        userId: adminUserId,
        action: 'status_change',
        oldValue: oldStatus,
        newValue: STATUS_MAP[columnStatus],
      });
    }

    return item;
  },

  async promote(requestId, columnStatus, position, adminUserId) {
    if (!requestId) throw new ValidationError('request_id is required');

    const request = await requestRepository.findByIdOrFail(requestId);

    const existing = await roadmapRepository.findByRequestId(requestId);
    if (existing) throw new ConflictError('Request is already a roadmap item');

    const targetColumn = columnStatus || 'backlog';
    const targetPosition = position ?? 0;

    await roadmapRepository.updatePositionsInRange(targetColumn, targetPosition, 999999, 1);

    const item = await roadmapRepository.create({
      request_id: requestId,
      title: request.title,
      description: request.business_problem || null,
      category: request.category,
      priority: request.priority,
      team: request.team,
      region: request.region,
      column_status: targetColumn,
      position: targetPosition,
      created_by: adminUserId,
    });

    if (STATUS_MAP[targetColumn]) {
      await requestRepository.update(requestId, { status: STATUS_MAP[targetColumn] });
      await activityRepository.create({
        requestId,
        userId: adminUserId,
        action: 'status_change',
        oldValue: request.status,
        newValue: STATUS_MAP[targetColumn],
      });
    }

    return await roadmapRepository.findByIdWithCreator(item.id);
  },
};
