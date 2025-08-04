import React, { useState } from 'react';
import SRNameDialog from './SRNameDialog';

interface MeasurementHeaderProps {
  srVersions: any[];
  selectedSR: any;
  onSRSelection: (sr: any) => Promise<void>;
  onSaveMeasurements: (name: string) => Promise<void>;
  loading: boolean;
}

// Helper function to get SR display name
const getSRDisplayName = (sr: any) => {
  if (!sr) return 'Select version...';

  // Try to get a meaningful description
  if (sr.SeriesDescription) {
    return sr.SeriesDescription;
  }

  // If no description, try to format date/time
  const parts = [];
  if (sr.SeriesDate) {
    const date = new Date(sr.SeriesDate);
    if (!isNaN(date.getTime())) {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      parts.push(date.toLocaleDateString('en-US', options));
    }
  }

  if (sr.SeriesTime) {
    const time = sr.SeriesTime;
    // Format time if it's in HHMMSS format
    if (time.length >= 4) {
      const hours = time.substring(0, 2);
      const minutes = time.substring(2, 4);
      parts.push(`${hours}:${minutes}`);
    }
  }

  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback to series number or UID
  if (sr.SeriesNumber) {
    return `Series ${sr.SeriesNumber}`;
  }

  return sr.displaySetInstanceUID?.slice(-8) || 'Unknown version';
};

const MeasurementHeader: React.FC<MeasurementHeaderProps> = ({
  srVersions,
  selectedSR,
  onSRSelection,
  onSaveMeasurements,
  loading,
}) => {
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
    <div className="bg-primary-dark border-primary-main/10 border-b">
      {/* Title and Export Button Row */}
      <div className="border-primary-main/20 flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-primary-light text-sm font-medium">Measurement</h3>
        <button
          className="bg-primary-main/90 hover:bg-primary-main border-primary-main hover:border-primary-light flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleSaveSRClick}
          disabled={loading}
          title="Save measurements as SR"
        >
          {loading ? 'Saving...' : 'Save SR'}
        </button>
      </div>

      {/* SR Version Selector Row */}
      <div className="border-primary-main/20 border-b px-4 py-3">
        <div className="relative">
          <select
            value={selectedSR?.displaySetInstanceUID || ''}
            onChange={e => {
              const sr = srVersions.find((v: any) => v.displaySetInstanceUID === e.target.value);
              if (sr) onSRSelection(sr);
            }}
            disabled={loading || srVersions.length === 0}
            className="bg-secondary-dark border-primary-main/30 text-primary-light focus:border-primary-main w-full appearance-none rounded border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
          >
            <option
              value=""
              className="bg-secondary-dark text-primary-light"
            >
              {srVersions.length === 0 ? 'No versions available' : 'Select version...'}
            </option>
            {srVersions.map((sr: any) => (
              <option
                key={sr.displaySetInstanceUID}
                value={sr.displaySetInstanceUID}
                className="bg-secondary-dark text-primary-light"
              >
                {getSRDisplayName(sr)}
              </option>
            ))}
          </select>
          {/* Dropdown arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
            <svg
              className="text-primary-light/70 h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>
      </div>

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

export default MeasurementHeader;
