import React, { useState } from 'react';
import SaveAnnotationsDialog from '../SaveAnnotationsDialog';
import HeaderTitle from './HeaderTitle';
import VersionSelector from './VersionSelector';
import Toolbar from './Toolbar';

const MeasurementHeader = ({
  srVersions,
  selectedSR,
  onSRSelection,
  onSaveMeasurements,
  loading,
  measurementCount,
  onHideAll,
}: MeasurementHeaderProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSaveSRClick = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleSRConfirm = async () => {
    try {
      await onSaveMeasurements();
      setIsDialogOpen(false);
    } catch (error) {
      // Keep dialog open on error so user can retry
      console.error('Failed to save SR:', error);
    }
  };

  return (
    <div className="bg-[#08252c]">
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-3">
        <HeaderTitle />

        <VersionSelector
          srVersions={srVersions}
          selectedSR={selectedSR}
          onSRSelection={onSRSelection}
          loading={loading}
        />
      </div>

      {/* Toolbar Section */}
      <Toolbar
        measurementCount={measurementCount}
        onHideAll={onHideAll}
        onSaveMeasurements={handleSaveSRClick}
        loading={loading}
      />

      {/* Save Annotations Dialog */}
      {isDialogOpen && (
        <SaveAnnotationsDialog
          onClose={handleDialogClose}
          onConfirm={handleSRConfirm}
          loading={loading}
        />
      )}
    </div>
  );
};

type MeasurementHeaderProps = {
  srVersions: any[];
  selectedSR: any;
  onSRSelection: (sr: any) => Promise<void>;
  onSaveMeasurements: () => Promise<void>;
  loading: boolean;
  measurementCount: number;
  onHideAll: () => void;
};

export default MeasurementHeader;
