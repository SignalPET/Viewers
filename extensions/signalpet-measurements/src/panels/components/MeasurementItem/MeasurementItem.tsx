import React, { useState, useMemo } from 'react';
import { useMeasurements as useMeasurementsDisplayText } from '@ohif/extension-cornerstone';
import MeasurementNameEditor from './MeasurementNameEditor';
import MeasurementActions from './MeasurementActions';
import MeasurementValues from './MeasurementValues';
import DeleteAnnotationDialog from '../DeleteAnnotationDialog';
import type { Measurement } from '../../../types';

const MeasurementItem = ({
  measurement,
  index,
  onAction,
  editingMeasurement,
  setEditingMeasurement,
}: MeasurementItemProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isEditing = editingMeasurement === measurement.uid;
  const defaultName = `Measurement ${index + 1}`;

  // Use OHIF's cornerstone hook to get measurements with processed displayText for UI rendering
  const allDisplayMeasurements = useMeasurementsDisplayText();

  // Find the display-processed version of this specific measurement
  const mappedMeasurement = useMemo(() => {
    return allDisplayMeasurements.find(m => m.uid === measurement.uid) || measurement;
  }, [allDisplayMeasurements, measurement]);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('button') && !target.closest('input')) {
      onAction('jumpToMeasurement', measurement.uid);
    }
  };

  const handleSaveName = (value: string) => {
    onAction('updateMeasurementLabel', measurement.uid, value);
    setEditingMeasurement(null);
  };

  const handleCancelEdit = () => {
    setEditingMeasurement(null);
  };

  const handleStartEdit = () => {
    setEditingMeasurement(measurement.uid);
  };

  const handleToggleVisibility = () => {
    onAction('toggleVisibilityMeasurement', measurement.uid);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    onAction('removeMeasurement', measurement.uid);
    setIsDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  // Use the visibility state from the local measurement data
  const isCurrentlyVisible = measurement.isVisible !== false;

  // Extract display values from the OHIF-mapped measurement
  const primaryValue = mappedMeasurement.displayText?.primary?.join('').trim() || undefined;
  const secondaryValue = mappedMeasurement.displayText?.secondary?.join('').trim() || undefined;

  return (
    <div className="w-full rounded">
      <div
        className="flex w-full cursor-pointer flex-col rounded transition-colors hover:bg-[#0c3b46]/40"
        onClick={handleClick}
      >
        <div className="flex w-full items-center">
          <div className="flex h-9 w-8 items-center justify-center rounded-tl border border-[#0c3b46] bg-[#092c34]">
            <span className="text-xs text-[#bfcbce]">{index + 1}</span>
          </div>

          <div className="flex h-9 flex-1 items-center justify-between rounded-tr border border-l-0 border-[#0c3b46] bg-[#092c34] px-2">
            <MeasurementNameEditor
              isEditing={isEditing}
              label={measurement.label}
              defaultName={defaultName}
              onSave={handleSaveName}
              onCancel={handleCancelEdit}
              onStartEdit={handleStartEdit}
            />

            <MeasurementActions
              isVisible={isCurrentlyVisible}
              onToggleVisibility={handleToggleVisibility}
              onDelete={handleDelete}
            />
          </div>
        </div>

        <MeasurementValues
          toolName={measurement.toolName}
          primaryValue={primaryValue}
          secondaryValue={secondaryValue}
        />
      </div>

      {isDeleteDialogOpen && (
        <DeleteAnnotationDialog
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

type MeasurementItemProps = {
  measurement: Measurement;
  index: number;
  onAction: (command: string, uid: string, value?: string) => void;
  editingMeasurement: string | null;
  setEditingMeasurement: (uid: string | null) => void;
};

export default MeasurementItem;
