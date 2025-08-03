export interface Measurement {
  uid: string;
  label?: string | null; // Can be null when no custom label is set
  toolName?: string;
  primaryValue?: string;
  secondaryValue?: string;
  isVisible?: boolean;
  sequenceNumber?: number;
  rawData?: any;
}

export interface SignalPETMeasurementsPanelProps {
  servicesManager: any;
  commandsManager: any;
  [key: string]: any; // Allow any additional props
}
