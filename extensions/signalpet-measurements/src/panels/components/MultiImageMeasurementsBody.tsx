import React, { useState, useEffect } from 'react';
import MeasurementItem from './MeasurementItem/MeasurementItem';
import { Badge, Dropdown, Button } from './ui';
import { SaveIcon } from './ui/icons';
import type { Measurement, SRVersion } from '../../types';
import type { ImageData } from '../../hooks/useMeasurementsPanel';
import { getSRDisplayName } from '../../utils/sr.utils';

interface MultiImageMeasurementsBodyProps {
  imagesMeasurements: ImageData[];
  onAction: (command: string, uid: string, value?: string) => void;
  editingMeasurement: string | null;
  setEditingMeasurement: (uid: string | null) => void;
  onSRSelection: (imageIndex: number, sr: SRVersion) => void;
  onSaveImage?: (imageIndex: number) => void;
  loading?: boolean;
}

const ImageSection = ({
  imageData,
  imageIndex,
  onAction,
  editingMeasurement,
  setEditingMeasurement,
  onSRSelection,
  isSingleImage,
  onSaveImage,
  loading,
}: {
  imageData: ImageData;
  imageIndex: number;
  onAction: (command: string, uid: string, value?: string) => void;
  editingMeasurement: string | null;
  setEditingMeasurement: (uid: string | null) => void;
  onSRSelection: (imageIndex: number, sr: SRVersion) => void;
  isSingleImage: boolean;
  onSaveImage?: (imageIndex: number) => void;
  loading?: boolean;
}) => {
  // Expanded by default in single image mode, collapsed in multi-image mode
  const [isExpanded, setIsExpanded] = useState(isSingleImage);

  // Update expanded state when layout mode changes
  // Single image: always expanded, Multi-image: always collapsed
  useEffect(() => {
    setIsExpanded(isSingleImage);
  }, [isSingleImage]);

  const handleToggleExpansion = () => {
    // Don't allow collapsing in single image mode
    if (isSingleImage) return;

    setIsExpanded(!isExpanded);
  };

  const handleSRSelection = (option: { value: SRVersion; label: string }) => {
    onSRSelection(imageIndex, option.value);
  };

  return (
    <div className="border-b border-[#0c3b46] bg-[#08252c]">
      {/* Image Header */}
      <div
        className="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-[#0c3b46]/50"
        onClick={handleToggleExpansion}
      >
        <div className="flex items-center gap-3">
          <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M4.5 2L8.5 6L4.5 10"
                stroke="#bfcbce"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex flex-col">
            <div className="text-sm font-medium text-[#bfcbce]">
              {imageData.displaySetDescription}
            </div>
            <div className="text-xs text-[#bfcbce]/70">Series: {imageData.displaySetLabel}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="default"
            className="text-xs"
          >
            {imageData.measurements.length}
          </Badge>
          {!isSingleImage && onSaveImage && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering header collapse
                onSaveImage(imageIndex);
              }}
              disabled={loading}
              className="gap-1 text-xs"
            >
              <span>{loading ? 'Saving...' : 'Save Version'}</span>
              <SaveIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* SR Version Selector */}
      {isExpanded && imageData.srVersions.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex w-full flex-col gap-2">
            <label className="text-xs font-normal text-white/75">Version</label>
            <Dropdown
              options={imageData.srVersions.map(sr => ({
                value: sr,
                label: getSRDisplayName(sr),
              }))}
              value={imageData.selectedSR}
              onSelect={handleSRSelection}
              placeholder={
                imageData.srVersions.length === 0 ? 'No versions available' : 'Select version...'
              }
              disabled={imageData.loading || imageData.srVersions.length === 0}
              getOptionKey={option => option.value?.displaySetInstanceUID || String(option.value)}
            />
          </div>
          {imageData.loading && (
            <div className="mt-1 text-xs text-[#bfcbce]/70">Loading measurements...</div>
          )}
        </div>
      )}

      {/* Measurements List */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {imageData.measurements.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-[#bfcbce]/70">
              No measurements for this image
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {imageData.measurements.map((measurement, measurementIndex) => (
                <MeasurementItem
                  key={measurement.uid}
                  measurement={measurement}
                  index={measurementIndex}
                  onAction={onAction}
                  editingMeasurement={editingMeasurement}
                  setEditingMeasurement={setEditingMeasurement}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MultiImageMeasurementsBody = ({
  imagesMeasurements,
  onAction,
  editingMeasurement,
  setEditingMeasurement,
  onSRSelection,
  onSaveImage,
  loading,
}: MultiImageMeasurementsBodyProps) => {
  if (!imagesMeasurements || imagesMeasurements.length === 0) {
    return (
      <div className="border-t border-[#0c3b46] bg-[#08252c]">
        <div className="flex items-center justify-center py-12 text-sm text-[#bfcbce]/70">
          No images found in current layout
        </div>
      </div>
    );
  }

  const isSingleImage = imagesMeasurements.length === 1;

  return (
    <div className="border-t border-[#0c3b46] bg-[#08252c]">
      <div className="flex flex-col">
        {imagesMeasurements.map((imageData, index) => (
          <ImageSection
            key={`${imageData.displaySetInstanceUID}-${index}`}
            imageData={imageData}
            imageIndex={index}
            onAction={onAction}
            editingMeasurement={editingMeasurement}
            setEditingMeasurement={setEditingMeasurement}
            onSRSelection={onSRSelection}
            isSingleImage={isSingleImage}
            onSaveImage={onSaveImage}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
};

export default MultiImageMeasurementsBody;
