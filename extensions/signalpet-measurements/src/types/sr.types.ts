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
}

export interface SRManagementAPI {
  // Get SR versions for a specific image/series
  getSRVersionsForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion[]>;

  // Apply the latest SR for a specific image
  applyLatestSRForImage(imageDisplaySetInstanceUID: string): Promise<SRVersion | null>;

  // Save SR for specific image display set
  saveSR(imageDisplaySetInstanceUID: string): Promise<SRVersion>;

  // Apply specific SR
  applySR(displaySetInstanceUID: string): Promise<void>;

  // Utility methods
  getCurrentMeasurements(): any[];
  clearCurrentMeasurements(): void;
}
