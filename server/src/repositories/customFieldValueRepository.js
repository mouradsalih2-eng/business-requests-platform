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
