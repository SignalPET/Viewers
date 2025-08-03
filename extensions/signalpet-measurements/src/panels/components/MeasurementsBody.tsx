import React from 'react';
import MeasurementItem from './MeasurementItem';

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

interface MeasurementsBodyProps {
  measurements: Measurement[];
  onAction: (command: string, uid: string, value?: string) => void;
  editingMeasurement: string | null;
  setEditingMeasurement: (uid: string | null) => void;
}

const EmptyComponent: React.FC = () => (
  <div className="p-6">
    <div className="text-primary-light/70 flex items-center justify-center py-8 text-sm">
      No measurements available
    </div>
  </div>
);

const MeasurementsBody: React.FC<MeasurementsBodyProps> = ({
  measurements,
  onAction,
  editingMeasurement,
  setEditingMeasurement,
}) => {
  if (!measurements || measurements.length === 0) {
    return <EmptyComponent />;
  }

  return (
    <div className="py-3">
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
  );
};

export default MeasurementsBody;
