import React, { useState, useRef, useEffect } from 'react';

interface DropdownOption {
  value: any;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: any;
  onSelect: (option: DropdownOption) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  getOptionKey?: (option: DropdownOption) => string;
}

const Dropdown = ({
  options,
  value,
  onSelect,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  getOptionKey = option => String(option.value),
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleToggle = () => {
    if (disabled || options.length === 0) return;
    setIsOpen(!isOpen);
  };

  const handleSelect = (option: DropdownOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative w-full ${className}`}
    >
      <button
        onClick={handleToggle}
        disabled={disabled || options.length === 0}
        className="flex h-8 w-full items-center justify-between overflow-hidden rounded border border-[#0c3b46] bg-[#08252c] px-3 py-2 text-left text-sm text-[#b2bdc1] hover:border-[#1a5f6b] focus:outline-none focus:ring-1 focus:ring-[#1a5f6b] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{displayText}</span>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`}
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {isOpen && options.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded border border-[#0c3b46] bg-[#08252c] shadow-lg">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map(option => (
              <button
                key={getOptionKey(option)}
                onClick={() => handleSelect(option)}
                disabled={option.disabled}
                className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#0c3b46] focus:bg-[#0c3b46] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  option.value === value ? 'bg-[#0c3b46] text-white' : 'text-[#b2bdc1]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
