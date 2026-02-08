import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`customFieldValueRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const customFieldValueRepository = {
  async findByRequest(requestId) {
    const { data, error } = await supabase
      .from('request_custom_field_values')
      .select('*, project_custom_fields(name, label, field_type)')
      .eq('request_id', requestId);
    if (error) handleError(error, 'findByRequest');
    return data.map(v => ({
      field_id: v.field_id,
      field_name: v.project_custom_fields?.name,
      field_label: v.project_custom_fields?.label,
      field_type: v.project_custom_fields?.field_type,
      value: extractValue(v),
    }));
  },

  async upsertValues(requestId, fieldValues) {
    // fieldValues: [{ field_id, value }]
    for (const fv of fieldValues) {
      const valueColumns = getValueColumns(fv.value, fv.field_type);
      const { error } = await supabase
        .from('request_custom_field_values')
        .upsert(
          { request_id: requestId, field_id: fv.field_id, ...valueColumns },
          { onConflict: 'request_id,field_id' }
        );
      if (error) handleError(error, 'upsertValues');
    }
  },

  async deleteByRequest(requestId) {
    const { error } = await supabase
      .from('request_custom_field_values')
      .delete()
      .eq('request_id', requestId);
    if (error) handleError(error, 'deleteByRequest');
  },

  async findCardValuesForRequests(requestIds, projectId) {
    if (!requestIds.length) return {};
    // Fetch custom field values for show_on_card fields across multiple requests
    // Select without is_enabled first; column may not exist if migration 009 hasn't been applied
    let cardFields;
    const { data: cfData, error: cfError } = await supabase
      .from('project_custom_fields')
      .select('id, label, field_type, color, is_enabled')
      .eq('project_id', projectId)
      .eq('show_on_card', true);
    if (cfError) {
      // Fallback: is_enabled column may not exist yet
      if (cfError.message?.includes('is_enabled')) {
        const { data: fallback, error: fbError } = await supabase
          .from('project_custom_fields')
          .select('id, label, field_type, color')
          .eq('project_id', projectId)
          .eq('show_on_card', true);
        if (fbError) handleError(fbError, 'findCardValuesForRequests.fields');
        cardFields = (fallback || []).map(f => ({ ...f, is_enabled: true }));
      } else {
        handleError(cfError, 'findCardValuesForRequests.fields');
      }
    } else {
      cardFields = cfData || [];
    }
    if (!cardFields.length) return {};

    const fieldIds = cardFields.map(f => f.id);
    const { data: values, error: vError } = await supabase
      .from('request_custom_field_values')
      .select('request_id, field_id, value_text, value_number, value_boolean, value_date, value_json')
      .in('request_id', requestIds)
      .in('field_id', fieldIds);
    if (vError) handleError(vError, 'findCardValuesForRequests.values');

    // Build a map: { requestId: [{ field_id, field_label, field_type, color, is_enabled, value }] }
    const fieldMap = new Map(cardFields.map(f => [f.id, f]));
    const result = {};
    for (const v of (values || [])) {
      if (!result[v.request_id]) result[v.request_id] = [];
      const field = fieldMap.get(v.field_id);
      if (!field) continue;
      result[v.request_id].push({
        field_id: v.field_id,
        field_label: field.label,
        field_type: field.field_type,
        color: field.color,
        is_enabled: field.is_enabled !== false,
        value: extractValue(v),
      });
    }
    return result;
  },

  async findForAnalytics(startDate, projectId, fieldIds) {
    let query = supabase
      .from('request_custom_field_values')
      .select('field_id, value_text, value_json, requests!inner(created_at, project_id)')
      .in('field_id', fieldIds)
      .gte('requests.created_at', startDate.toISOString());
    if (projectId) query = query.eq('requests.project_id', projectId);
    const { data, error } = await query;
    if (error) handleError(error, 'findForAnalytics');
    return data;
  },
};

function extractValue(row) {
  if (row.value_json !== null && row.value_json !== undefined) return row.value_json;
  if (row.value_boolean !== null && row.value_boolean !== undefined) return row.value_boolean;
  if (row.value_number !== null && row.value_number !== undefined) return row.value_number;
  if (row.value_date !== null && row.value_date !== undefined) return row.value_date;
  return row.value_text;
}

function getValueColumns(value, fieldType) {
  const cols = { value_text: null, value_number: null, value_boolean: null, value_date: null, value_json: null };

  if (value === null || value === undefined) return cols;

  switch (fieldType) {
    case 'number':
    case 'rating':
      cols.value_number = Number(value);
      break;
    case 'checkbox':
      cols.value_boolean = Boolean(value);
      break;
    case 'date':
      cols.value_date = value;
      break;
    case 'multi_select':
      cols.value_json = Array.isArray(value) ? value : [value];
      break;
    default:
      cols.value_text = String(value);
  }

  return cols;
}
