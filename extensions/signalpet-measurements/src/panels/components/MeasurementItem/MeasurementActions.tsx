import React from 'react';
import { IconButton } from '../ui';
import { VisibilityIcon, VisibilityOffIcon, DeleteIcon } from '../ui/icons';

const MeasurementActions = ({
  isVisible,
  onToggleVisibility,
  onDelete,
}: MeasurementActionsProps) => (
  <div className="flex items-center gap-1">
    <IconButton
      icon={isVisible ? <VisibilityIcon /> : <VisibilityOffIcon />}
      onClick={e => {
        e.stopPropagation();
        onToggleVisibility();
      }}
      title={isVisible ? 'Hide measurement' : 'Show measurement'}
      variant="default"
      aria-label={isVisible ? 'Hide measurement' : 'Show measurement'}
    />

    <IconButton
      icon={<DeleteIcon />}
      onClick={e => {
        e.stopPropagation();
        onDelete();
      }}
      title="Delete measurement"
      variant="danger"
      aria-label="Delete measurement"
    />
  </div>
);

type MeasurementActionsProps = {
  isVisible: boolean;
  onToggleVisibility: () => void;
  onDelete: () => void;
};

export default MeasurementActions;
