# Form Error Handling

Form components receive error strings from parent, display inline:

```jsx
// Input component accepts error prop
export function Input({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs uppercase">{label}</label>}
      <input
        className={`w-full px-3 py-2.5 border ${error ? 'border-red-300' : 'border-neutral-200'}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Parent form manages validation state
const [errors, setErrors] = useState({});

const validate = () => {
  const newErrors = {};
  if (!formData.title.trim()) newErrors.title = 'Title is required';
  if (!formData.category) newErrors.category = 'Category is required';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

<Input label="Title" error={errors.title} value={formData.title} onChange={handleChange} />
```

**Why parent validation:** Centralized validation logic, form component stays generic.

**Rules:**
- Input components accept `error` string prop
- Parent form maintains `errors` state object
- Validate on submit, clear errors on change
- Display error text directly below input

