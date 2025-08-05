export type Measurement = {
  uid: string;
  label?: string | null;
  toolName?: string;
  primaryValue?: string;
  secondaryValue?: string;
  sequenceNumber?: number;
  isVisible?: boolean;
  rawData?: any;
};
