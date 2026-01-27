import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Textarea } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Card, CardBody } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { requests as requestsApi } from '../../lib/api';
import { debounce } from '../../lib/utils';
import { useFeatureFlag } from '../../context/FeatureFlagContext';

const categoryOptions = [
  { value: 'bug', label: 'Bug' },
  { value: 'new_feature', label: 'New Feature' },
  { value: 'optimization', label: 'Optimization' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const teamOptions = [
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Service', label: 'Service' },
  { value: 'Energy', label: 'Energy' },
];

const regionOptions = [
  { value: 'EMEA', label: 'EMEA' },
  { value: 'North America', label: 'North America' },
  { value: 'APAC', label: 'APAC' },
  { value: 'Global', label: 'Global' },
];

export function RequestForm({ onSubmit, loading = false }) {
  const navigate = useNavigate();
  const duplicateDetectionEnabled = useFeatureFlag('duplicate_detection');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    priority: '',
    team: '',
    region: '',
    business_problem: '',
    problem_size: '',
    business_expectations: '',
    expected_impact: '',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  // Duplicate detection state
  const [similarRequests, setSimilarRequests] = useState([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const titleInputRef = useRef(null);

  // Debounced search for similar requests
  const searchSimilar = useCallback(
    debounce(async (title) => {
      if (title.length < 5) {
        setSimilarRequests([]);
        return;
      }

      setSearchingDuplicates(true);
      try {
        const results = await requestsApi.search(title, 5);
        setSimilarRequests(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        console.error('Failed to search similar requests:', err);
        setSimilarRequests([]);
      } finally {
        setSearchingDuplicates(false);
      }
    }, 500),
    []
  );

  // Search when title changes (only if duplicate detection is enabled)
  useEffect(() => {
    if (duplicateDetectionEnabled && formData.title.length >= 5) {
      searchSimilar(formData.title);
    } else {
      setSimilarRequests([]);
      setShowSuggestions(false);
    }
  }, [formData.title, searchSimilar, duplicateDetectionEnabled]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleTitleFocus = () => {
    if (similarRequests.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleTitleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleSuggestionClick = (request) => {
    setShowSuggestions(false);
    navigate(`/requests/${request.id}`);
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    files.forEach((file) => {
      data.append('attachments', file);
    });

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <Card>
        <CardBody className="space-y-4">
          {/* Title with duplicate detection */}
          <div className="relative">
            <Input
              ref={titleInputRef}
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              onFocus={handleTitleFocus}
              onBlur={handleTitleBlur}
              placeholder="Brief summary of your request"
              error={errors.title}
            />

            {/* Similar requests dropdown */}
            {showSuggestions && similarRequests.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden">
                <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/30 border-b border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                    Similar requests found - click to view instead of creating duplicate
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {similarRequests.map((request) => (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => handleSuggestionClick(request)}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-100 dark:border-neutral-700 last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {request.title}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            by {request.author_name}
                          </p>
                        </div>
                        <StatusBadge status={request.status} size="sm" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {searchingDuplicates && formData.title.length >= 5 && (
              <div className="absolute right-3 top-8">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Stack on mobile, side by side on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={categoryOptions}
              placeholder="Select category"
              error={errors.category}
            />
            <Select
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={priorityOptions}
              placeholder="Select priority"
              error={errors.priority}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Team"
              name="team"
              value={formData.team}
              onChange={handleChange}
              options={teamOptions}
              placeholder="Select team"
            />
            <Select
              label="Region"
              name="region"
              value={formData.region}
              onChange={handleChange}
              options={regionOptions}
              placeholder="Select region"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">Business Context</h3>

          <Textarea
            label="Business Problem"
            name="business_problem"
            value={formData.business_problem}
            onChange={handleChange}
            placeholder="What issue are you facing?"
            rows={3}
          />

          <Textarea
            label="Problem Size"
            name="problem_size"
            value={formData.problem_size}
            onChange={handleChange}
            placeholder="How big is this problem? Who/what is affected?"
            rows={3}
          />

          <Textarea
            label="Business Expectations"
            name="business_expectations"
            value={formData.business_expectations}
            onChange={handleChange}
            placeholder="What outcome do you expect?"
            rows={3}
          />

          <Textarea
            label="Expected Business Impact"
            name="expected_impact"
            value={formData.expected_impact}
            onChange={handleChange}
            placeholder="What value will this bring if resolved?"
            rows={3}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Attachments
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 active:bg-neutral-300 dark:active:bg-neutral-500 transition-colors text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                Add Files
              </span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {files.length} file(s) selected
              </span>
            )}
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-neutral-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sticky submit button on mobile */}
      <div className="sticky bottom-0 bg-neutral-50 dark:bg-neutral-900 -mx-4 px-4 py-4 sm:static sm:bg-transparent sm:mx-0 sm:px-0 sm:py-0 sm:flex sm:justify-end border-t border-neutral-100 dark:border-neutral-800 sm:border-0">
        <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </form>
  );
}
