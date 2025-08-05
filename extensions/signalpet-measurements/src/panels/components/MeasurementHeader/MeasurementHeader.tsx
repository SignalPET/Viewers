import React, { useState } from 'react';
import SRNameDialog from '../SRNameDialog';
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

  const handleSRNameSubmit = async (name: string) => {
    try {
      await onSaveMeasurements(name);
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

      {/* SR Name Dialog */}
      <SRNameDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onConfirm={handleSRNameSubmit}
        loading={loading}
      />
    </div>
  );
};

type MeasurementHeaderProps = {
  srVersions: any[];
  selectedSR: any;
  onSRSelection: (sr: any) => Promise<void>;
  onSaveMeasurements: (name: string) => Promise<void>;
  loading: boolean;
  measurementCount: number;
  onHideAll: () => void;
};

export default MeasurementHeader;
