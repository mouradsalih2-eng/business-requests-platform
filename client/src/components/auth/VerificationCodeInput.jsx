import { useState, useRef, useEffect } from 'react';

export default function VerificationCodeInput({
  length = 6,
  onComplete,
  disabled = false,
  error = null,
}) {
  const [code, setCode] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next input if value entered
    if (value && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }

    // Check if complete
    if (newCode.every(digit => digit !== '')) {
      onComplete?.(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (code[index]) {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        // Move to previous input
        inputRefs.current[index - 1].focus();
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    if (pastedData) {
      const newCode = Array(length).fill('');
      pastedData.split('').forEach((digit, i) => {
        newCode[i] = digit;
      });
      setCode(newCode);

      // Focus appropriate input
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex].focus();

      // Check if complete
      if (newCode.every(digit => digit !== '')) {
        onComplete?.(newCode.join(''));
      }
    }
  };

  const reset = () => {
    setCode(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-2xl font-semibold
              rounded-lg border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500'
                : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus:border-neutral-900 dark:focus:border-neutral-400 focus:ring-neutral-900 dark:focus:ring-neutral-400'
              }
              text-neutral-900 dark:text-neutral-100
            `}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
