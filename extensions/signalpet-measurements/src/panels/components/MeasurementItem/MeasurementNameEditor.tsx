import React from 'react';
import { InlineEdit } from '../ui';

const MeasurementNameEditor = ({
  isEditing,
  label,
  defaultName,
  onSave,
  onCancel,
  onStartEdit,
}: MeasurementNameEditorProps) => {
  const displayName = label || defaultName;

  if (isEditing) {
    return (
      <InlineEdit
        value={displayName}
        onSave={onSave}
        onCancel={onCancel}
        className="flex-1"
      />
    );
  }

  return (
    <button
      className="cursor-pointer text-left text-sm text-[#bfcbce] hover:text-white"
      onClick={e => {
        e.stopPropagation();
        onStartEdit();
      }}
      title="Click to edit name"
    >
      {displayName}
    </button>
  );
};

type MeasurementNameEditorProps = {
  isEditing: boolean;
  label: string | null;
  defaultName: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  onStartEdit: () => void;
};

export default MeasurementNameEditor;
