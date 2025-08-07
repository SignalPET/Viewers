import React from 'react';
import { Button, Badge } from '../ui';
import { VisibilityOffIcon, SaveIcon } from '../ui/icons';
import ToolIcon from '../../../utils/toolIcons.utils';

const Toolbar = ({ measurementCount, onHideAll, onSaveMeasurements, loading }: ToolbarProps) => (
  <div className="flex h-9 items-center justify-between border-t border-[#0c3b46] bg-[#08252c] px-2">
    <div className="flex items-center gap-2">
      <Badge>
        <ToolIcon
          toolName="arrow"
          className="h-3 w-3"
        />
        <span>({measurementCount})</span>
      </Badge>
    </div>

    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={onHideAll}
        className="gap-1"
      >
        <span>Hide All</span>
        <VisibilityOffIcon />
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={onSaveMeasurements}
        disabled={loading}
        className="gap-1"
      >
        <span>{loading ? 'Saving...' : 'Save Version'}</span>
        <SaveIcon />
      </Button>
    </div>
  </div>
);

type ToolbarProps = {
  measurementCount: number;
  onHideAll: () => void;
  onSaveMeasurements: () => void;
  loading: boolean;
};

export default Toolbar;
