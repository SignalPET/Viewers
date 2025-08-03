# Per-Image SR Dropdown Implementation

## Overview

This example shows how to implement a dropdown for each image that shows available SR versions specific to that image. The dropdown shows the latest SR by default and allows switching between different versions.

## Complete Implementation

### 1. Image Component with SR Dropdown

```typescript
import React, { useState, useEffect } from 'react';
import { useSystem } from '@ohif/core/src/contextProviders/SystemProvider';
import { SRVersion } from '@signalpet/extension-signalpet-measurements';

interface ImageWithSRDropdownProps {
  imageDisplaySetInstanceUID: string;
  imageDisplaySet: any;
}

function ImageWithSRDropdown({ imageDisplaySetInstanceUID, imageDisplaySet }: ImageWithSRDropdownProps) {
  const { commandsManager } = useSystem();
  const [srVersions, setSRVersions] = useState<SRVersion[]>([]);
  const [selectedSR, setSelectedSR] = useState<SRVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Load SR versions for this image
  useEffect(() => {
    loadSRVersionsForImage();
  }, [imageDisplaySetInstanceUID]);

  const loadSRVersionsForImage = async () => {
    try {
      console.log('Loading SR versions for image:', imageDisplaySetInstanceUID);

      // Get SR versions that reference this specific image
      const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
        imageDisplaySetInstanceUID
      });

      setSRVersions(versions);

      // Set the latest (first) SR as selected by default
      if (versions.length > 0) {
        setSelectedSR(versions[0]);
      }

      console.log(`Found ${versions.length} SR versions for this image`);
    } catch (error) {
      console.error('Failed to load SR versions:', error);
    }
  };

  const handleSRSelection = async (srVersion: SRVersion) => {
    if (srVersion.displaySetInstanceUID === selectedSR?.displaySetInstanceUID) {
      return; // Same version selected
    }

    setLoading(true);
    setDropdownOpen(false);

    try {
      console.log('Applying SR version:', srVersion.SeriesDescription);

      // Apply the selected SR version
      const appliedSR = await commandsManager.runCommand('signalpetApplySR', {
        displaySetInstanceUID: srVersion.displaySetInstanceUID
      });

      setSelectedSR(appliedSR);

      // Refresh the versions list to get updated hydration status
      await loadSRVersionsForImage();

      console.log('Successfully applied SR:', appliedSR.SeriesDescription);
    } catch (error) {
      console.error('Failed to apply SR:', error);
      alert(`Failed to apply SR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSRDisplayName = (sr: SRVersion): string => {
    const date = sr.SeriesDate ? sr.SeriesDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '';
    const time = sr.SeriesTime ? sr.SeriesTime.substr(0, 6) : '';
    const series = sr.SeriesNumber ? `#${sr.SeriesNumber}` : '';

    return `${sr.SeriesDescription || 'SR'} ${date} ${time} ${series}`.trim();
  };

  const getSRStatusIndicator = (sr: SRVersion): string => {
    if (sr.isHydrated) return '✓'; // Loaded and hydrated
    if (sr.isRehydratable) return '○'; // Available to load
    return '●'; // Not available
  };

  return (
    <div className="image-with-sr-dropdown">
      {/* Image display area */}
      <div className="image-container">
        <div className="image-info">
          <h3>{imageDisplaySet.SeriesDescription}</h3>
          <p>Series: {imageDisplaySet.SeriesNumber}</p>
        </div>

        {/* SR Dropdown */}
        {srVersions.length > 0 && (
          <div className="sr-dropdown-container">
            <div className="sr-current-selection">
              <span className="sr-label">Measurements:</span>
              <button
                className="sr-dropdown-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loading}
              >
                {selectedSR ? (
                  <>
                    {getSRStatusIndicator(selectedSR)} {formatSRDisplayName(selectedSR)}
                    {selectedSR.measurements && ` (${selectedSR.measurements.length} measurements)`}
                  </>
                ) : (
                  'Select SR Version'
                )}
                <span className="dropdown-arrow">{dropdownOpen ? '▼' : '▶'}</span>
              </button>
            </div>

            {dropdownOpen && (
              <div className="sr-dropdown-menu">
                <div className="sr-dropdown-header">
                  Available Versions ({srVersions.length})
                </div>
                {srVersions.map((sr) => (
                  <button
                    key={sr.displaySetInstanceUID}
                    className={`sr-dropdown-item ${
                      selectedSR?.displaySetInstanceUID === sr.displaySetInstanceUID ? 'selected' : ''
                    }`}
                    onClick={() => handleSRSelection(sr)}
                    disabled={loading}
                  >
                    <div className="sr-item-main">
                      <span className="sr-status">{getSRStatusIndicator(sr)}</span>
                      <span className="sr-name">{formatSRDisplayName(sr)}</span>
                    </div>
                    <div className="sr-item-details">
                      <small>
                        {sr.measurements ? `${sr.measurements.length} measurements` : 'No measurements'}
                        {sr.isHydrated && ' • Currently loaded'}
                      </small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {srVersions.length === 0 && (
          <div className="no-sr-message">
            <span>No measurements available for this image</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <span>Loading measurements...</span>
        </div>
      )}
    </div>
  );
}

export default ImageWithSRDropdown;
```

### 2. CSS Styles

```css
.image-with-sr-dropdown {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin: 8px;
}

.image-container {
  position: relative;
}

.image-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
}

.image-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.sr-dropdown-container {
  margin-top: 12px;
  position: relative;
}

.sr-current-selection {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sr-label {
  font-weight: bold;
  font-size: 14px;
}

.sr-dropdown-trigger {
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  flex-grow: 1;
  text-align: left;
}

.sr-dropdown-trigger:hover {
  background: #e9e9e9;
}

.sr-dropdown-trigger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dropdown-arrow {
  margin-left: auto;
  font-size: 12px;
}

.sr-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.sr-dropdown-header {
  padding: 8px 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #eee;
  font-weight: bold;
  font-size: 12px;
  color: #666;
}

.sr-dropdown-item {
  width: 100%;
  padding: 12px;
  border: none;
  background: white;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.sr-dropdown-item:hover {
  background: #f0f0f0;
}

.sr-dropdown-item.selected {
  background: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.sr-dropdown-item:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sr-item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.sr-status {
  font-weight: bold;
  color: #2196f3;
}

.sr-name {
  font-weight: 500;
}

.sr-item-details {
  color: #666;
  font-size: 12px;
}

.no-sr-message {
  margin-top: 12px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 4px;
  text-align: center;
  color: #666;
  font-style: italic;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}
```

### 3. Usage in Your Extension

```typescript
// In your main component that displays multiple images
function StudyViewer() {
  const { servicesManager } = useSystem();
  const [imageDisplaySets, setImageDisplaySets] = useState([]);

  useEffect(() => {
    const { displaySetService } = servicesManager.services;

    // Get all image display sets
    const allDisplaySets = displaySetService.getActiveDisplaySets();
    const imageDisplaySets = allDisplaySets.filter(ds =>
      ds.Modality !== 'SR' && ds.Modality !== 'PR'
    );

    setImageDisplaySets(imageDisplaySets);
  }, []);

  return (
    <div className="study-viewer">
      {imageDisplaySets.map((imageDisplaySet) => (
        <ImageWithSRDropdown
          key={imageDisplaySet.displaySetInstanceUID}
          imageDisplaySetInstanceUID={imageDisplaySet.displaySetInstanceUID}
          imageDisplaySet={imageDisplaySet}
        />
      ))}
    </div>
  );
}
```

## Key Features

1. **Lightweight Loading**: `getSRVersionsForImage` only loads metadata, not full measurements
2. **Per-Image Filtering**: Only shows SRs that reference the specific image
3. **Latest First**: Automatically selects the most recent SR
4. **Status Indicators**: Shows if SR is loaded (✓), available (○), or unavailable (●)
5. **Measurement Count**: Shows number of measurements in each SR version
6. **Error Handling**: Graceful handling of load failures
7. **Loading States**: Visual feedback during operations

## Performance Optimizations

- Metadata-only loading for dropdown population
- Full loading only happens when user selects an SR
- Caching of loaded SRs
- Efficient filtering based on image references
