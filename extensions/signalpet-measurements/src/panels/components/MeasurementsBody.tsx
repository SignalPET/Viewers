import React from 'react';
import MeasurementItem from './MeasurementItem/MeasurementItem';
import type { Measurement } from '../../types';

const EmptyState = () => (
  <div className="flex items-center justify-center py-12 text-sm text-[#bfcbce]/70">
    No measurements available
  </div>
);

const MeasurementsBody = ({
  measurements,
  onAction,
  editingMeasurement,
  setEditingMeasurement,
}: MeasurementsBodyProps) => {
  if (!measurements || measurements.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="border-t border-[#0c3b46] bg-[#08252c]">
      <div className="flex flex-col gap-3 p-2">
        {measurements.map((measurement, index) => (
          <MeasurementItem
            key={measurement.uid}
            measurement={measurement}
            index={index}
            onAction={onAction}
            editingMeasurement={editingMeasurement}
            setEditingMeasurement={setEditingMeasurement}
          />
        ))}
      </div>
    </div>
  );
};

type MeasurementsBodyProps = {
  measurements: Measurement[];
  onAction: (command: string, uid: string, value?: string) => void;
  editingMeasurement: string | null;
  setEditingMeasurement: (uid: string | null) => void;
};

export default MeasurementsBody;
