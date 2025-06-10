import React, { useState, useEffect } from 'react';

const Checkbox = React.forwardRef(({ 
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props 
}, ref) => {
  const [isChecked, setIsChecked] = useState(defaultChecked || checked || false);
  
  useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked);
    }
  }, [checked]);
  
  const handleChange = (e) => {
    const newChecked = e.target.checked;
    if (checked === undefined) {
      setIsChecked(newChecked);
    }
    onCheckedChange && onCheckedChange(newChecked);
  };
  
  return (
    <label className={`inline-flex items-center ${className}`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
      <div 
        className={`h-4 w-4 rounded border ${
          isChecked 
            ? 'bg-primary border-primary' 
            : 'border-input bg-background'
        } flex items-center justify-center transition-colors`}
      >
        {isChecked && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3 text-white"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </label>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox }; 