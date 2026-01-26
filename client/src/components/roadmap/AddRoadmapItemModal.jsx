import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useCreateRoadmapItem } from '../../hooks/useRoadmap';
import { useToast } from '../ui/Toast';

const categoryOptions = [
  { value: '', label: 'Select category' },
  { value: 'bug', label: 'Bug' },
  { value: 'new_feature', label: 'New Feature' },
  { value: 'optimization', label: 'Optimization' },
];

const priorityOptions = [
  { value: '', label: 'Select priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const teamOptions = [
  { value: '', label: 'Select team' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Service', label: 'Service' },
  { value: 'Energy', label: 'Energy' },
];

const regionOptions = [
  { value: '', label: 'Select region' },
  { value: 'EMEA', label: 'EMEA' },
  { value: 'North America', label: 'North America' },
  { value: 'APAC', label: 'APAC' },
  { value: 'Global', label: 'Global' },
];

const columnOptions = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'released', label: 'Released' },
];

export function AddRoadmapItemModal({ isOpen, onClose, defaultColumn = 'backlog' }) {
  const toast = useToast();
  const createItem = useCreateRoadmapItem();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    team: '',
    region: '',
    column_status: defaultColumn === 'discovery' ? 'backlog' : defaultColumn,
    is_discovery: false,
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  const handleOpen = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      priority: '',
      team: '',
      region: '',
      column_status: defaultColumn === 'discovery' ? 'backlog' : defaultColumn,
      is_discovery: false,
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createItem.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category || undefined,
        priority: formData.priority || undefined,
        team: formData.team || undefined,
        region: formData.region || undefined,
        column_status: formData.column_status,
        is_discovery: formData.is_discovery,
      });
      toast.success('Item added to roadmap');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create item');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onOpen={handleOpen}
      title="Add Roadmap Item"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Item title"
          error={errors.title}
        />

        <Textarea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional description"
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            options={categoryOptions}
          />
          <Select
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            options={priorityOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Team"
            name="team"
            value={formData.team}
            onChange={handleChange}
            options={teamOptions}
          />
          <Select
            label="Region"
            name="region"
            value={formData.region}
            onChange={handleChange}
            options={regionOptions}
          />
        </div>

        <Select
          label="Column"
          name="column_status"
          value={formData.column_status}
          onChange={handleChange}
          options={columnOptions}
        />

        {/* Discovery Toggle */}
        <label className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
          <div className="relative">
            <input
              type="checkbox"
              name="is_discovery"
              checked={formData.is_discovery}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-neutral-300 dark:bg-neutral-600 rounded-full peer-checked:bg-blue-500 dark:peer-checked:bg-blue-500 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">In Discovery</span>
            <p className="text-xs text-blue-700 dark:text-blue-300">Mark this item as being in the discovery/research phase</p>
          </div>
        </label>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createItem.isPending}>
            {createItem.isPending ? 'Adding...' : 'Add Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddRoadmapItemModal;
