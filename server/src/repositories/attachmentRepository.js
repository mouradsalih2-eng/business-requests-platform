import { supabase } from '../db/supabase.js';
import { AppError } from '../errors/AppError.js';

function handleError(error, context) {
  console.error(`attachmentRepository.${context}:`, error.message);
  throw new AppError(`Database error in ${context}`, 500);
}

export const attachmentRepository = {
  async findByRequest(requestId) {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('request_id', requestId);
    if (error) handleError(error, 'findByRequest');
    return data;
  },

  async create(requestId, filename, filepath) {
    const { error } = await supabase
      .from('attachments')
      .insert({ request_id: requestId, filename, filepath });
    if (error) handleError(error, 'create');
  },
};
