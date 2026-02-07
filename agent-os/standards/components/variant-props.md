# Variant Props Pattern

UI components use variant/size objects for styling:

```jsx
const variants = {
  primary: 'bg-[#4F46E5] text-white hover:bg-[#4338CA]',
  secondary: 'bg-white text-neutral-900 border border-neutral-200',
  ghost: 'text-neutral-600 hover:text-neutral-900',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button className={`${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
}
```

**Why objects:** Single source of truth for styles, easy to extend, predictable output.

**Rules:**
- Define variant objects at top of file
- Set sensible defaults (`variant = 'primary'`)
- Allow `className` override for edge cases
- Spread `...props` for native attributes

