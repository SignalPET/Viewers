import React, { useState, useRef, useEffect } from 'react';

const InlineEdit = ({
  value,
  onSave,
  onCancel,
  placeholder = '',
  className = '',
}: InlineEditProps) => {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== value) {
      onSave(trimmedValue);
    } else {
      onCancel?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  return (
    <div className={`rounded-md bg-white/5 px-2 py-1 ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#b2bdc1]/50"
      />
    </div>
  );
};

type InlineEditProps = {
  value: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
};

export default InlineEdit;
