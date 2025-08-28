import { Types } from '@ohif/core';

export interface SRVersion {
  displaySetInstanceUID: string;
  SeriesInstanceUID: string;
  SOPInstanceUID: string;
  SeriesDate?: string;
  SeriesTime?: string;
  SeriesNumber?: number;
  SeriesDescription?: string;
  StudyInstanceUID: string;
}

// Extended DisplaySet interface for SR-specific properties that exist at runtime
export interface SRDisplaySet extends Types.DisplaySet {
  isLoaded?: boolean;
  isHydrated?: boolean;
  isRehydratable?: boolean;
  load?: () => Promise<void>;
  SOPClassUID?: string;
  SOPClassHandlerId?: string;
  referencedImages?: {
    ReferencedSOPInstanceUID: string;
    ReferencedSOPClassUID: string;
  }[];
}

export interface SRManagementAPI {
  // Get SR versions for a specific image/series
  getSRVersionsForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion[]>;

  // Save SR for specific image display set
  saveSR(imageDisplaySetInstanceUID: string): Promise<void>;

  // Apply specific SR
  applySR(displaySetInstanceUID: string): Promise<void>;

  // Utility methods
  getCurrentMeasurements(): any[];
  clearMeasurementsNotInCurrentDisplay(): void;
}
