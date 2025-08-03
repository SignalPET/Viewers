import React from 'react';

interface Measurement {
  uid: string;
  label?: string | null;
  toolName?: string;
  primaryValue?: string;
  secondaryValue?: string;
  isVisible?: boolean;
  sequenceNumber?: number;
  rawData?: any;
}

interface MeasurementItemProps {
  measurement: Measurement;
  index: number;
  onAction: (command: string, uid: string, value?: string) => void;
  editingMeasurement: string | null;
  setEditingMeasurement: (uid: string | null) => void;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  index,
  onAction,
  editingMeasurement,
  setEditingMeasurement,
}) => (
  <div className="mx-3 mb-3">
    {/* Individual measurement container/card */}
    <div
      className="bg-secondary-dark border-primary-main/30 hover:bg-primary-main/10 group cursor-pointer rounded-lg border transition-colors"
      onClick={e => {
        // Only jump to measurement if we didn't click on a button or input
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('input')) {
          onAction('jumpToMeasurement', measurement.uid);
        }
      }}
    >
      {/* Top part: Number badge + measurement name + icons */}
      <div className="flex items-center justify-between px-4 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Circular number badge */}
          <div className="bg-primary-main/20 text-primary-light flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium">
            {index + 1}
          </div>
          {/* Measurement name/label - inline editing */}
          {editingMeasurement === measurement.uid ? (
            <input
              type="text"
              defaultValue={measurement.label || `Measurement ${index + 1}`}
              className="bg-secondary-dark border-primary-main/30 text-primary-light focus:border-primary-main w-full rounded border px-2 py-1 text-base font-normal leading-tight focus:outline-none"
              autoFocus
              onBlur={e => {
                const newLabel = (e.target as HTMLInputElement).value.trim();
                if (newLabel) {
                  onAction('updateMeasurementLabel', measurement.uid, newLabel);
                }
                setEditingMeasurement(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const newLabel = (e.target as HTMLInputElement).value.trim();
                  if (newLabel) {
                    onAction('updateMeasurementLabel', measurement.uid, newLabel);
                  }
                  setEditingMeasurement(null);
                } else if (e.key === 'Escape') {
                  setEditingMeasurement(null);
                }
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <div
              className="text-primary-light hover:text-primary-main hover:bg-primary-main/3 -mx-1 flex-1 cursor-pointer truncate rounded px-1 py-0.5 text-base font-normal leading-tight transition-colors"
              onClick={() => setEditingMeasurement(measurement.uid)}
              title="Click to edit name"
            >
              {measurement.label || `Measurement ${index + 1}`}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-2">
          {/* Visibility toggle */}
          <button
            className="hover:bg-primary-main/20 text-primary-light/80 hover:text-primary-light flex h-8 w-8 items-center justify-center rounded transition-colors"
            onClick={() => onAction('toggleVisibilityMeasurement', measurement.uid)}
            title={measurement.isVisible !== false ? 'Hide measurement' : 'Show measurement'}
          >
            {measurement.isVisible !== false ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
              </svg>
            )}
          </button>

          {/* Delete button */}
          <button
            className="text-primary-light/80 flex h-8 w-8 items-center justify-center rounded transition-colors hover:bg-red-500/20 hover:text-red-400"
            onClick={() => onAction('removeMeasurement', measurement.uid)}
            title="Delete measurement"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom part: Measurement values */}
      <div className="border-primary-main/20 border-t px-4 py-3">
        <div className="text-primary-light/80 text-sm leading-tight">
          {measurement.primaryValue || measurement.secondaryValue ? (
            <span>
              {measurement.primaryValue && <span>{measurement.primaryValue}</span>}
              {measurement.primaryValue && measurement.secondaryValue && (
                <span className="ml-3">{measurement.secondaryValue}</span>
              )}
              {!measurement.primaryValue && measurement.secondaryValue && (
                <span>{measurement.secondaryValue}</span>
              )}
            </span>
          ) : (
            <span className="italic opacity-60">No measurement data</span>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default MeasurementItem;
