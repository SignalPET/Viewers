# SignalPET Measurements Extension

This extension provides comprehensive SR (Structured Report) management functionality for OHIF, including automatic detection, version management, and saving capabilities.

## Features

### 1. Automatic Per-Image SR Detection and Loading
- Automatically detects and loads the latest SR for each image when switching between images
- Monitors for new SRs as they are added to the study
- No manual intervention required - SR data is isolated per image

### 2. Complete SR Management API
The extension provides commands for all SR management operations:

#### Get SR Versions for Specific Image (Per-image dropdowns)
```javascript
const imageSRs = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
  imageDisplaySetInstanceUID: 'image-uid-123'
});
```

#### Save Current Measurements as SR (Per-Image)
```javascript
const newSR = await commandsManager.runCommand('signalpetSaveSR', {
  imageDisplaySetInstanceUID: 'required-image-uid' // Required: the image display set UID to associate with this SR
});
```

#### Apply Specific SR
```javascript
const appliedSR = await commandsManager.runCommand('signalpetApplySR', {
  displaySetInstanceUID: 'uid123'
});
```

#### Utility Commands
```javascript
// Get current measurements
const measurements = commandsManager.runCommand('signalpetGetCurrentMeasurements');

// Clear current measurements
commandsManager.runCommand('signalpetClearCurrentMeasurements');

// Get service instance for direct access
const srService = commandsManager.runCommand('signalpetGetSRService');
```

## SR Version Object

Each SR version is represented as:

```typescript
interface SRVersion {
  displaySetInstanceUID: string;
  SeriesInstanceUID: string;
  SOPInstanceUID: string;
  SeriesDate?: string;
  SeriesTime?: string;
  SeriesNumber?: number;
  SeriesDescription?: string;
  isLoaded: boolean;
  isHydrated: boolean;
  isRehydratable: boolean;
  measurements?: any[];
  StudyInstanceUID: string;
}
```

## Integration with Custom UI

To use this extension with your own UI:

1. Import the extension types:
```typescript
import { SRVersion, SRManagementAPI } from '@signalpet/extension-signalpet-measurements';
```

2. Access the API through OHIF commands:
```javascript
// In your UI component
const { commandsManager } = useSystem();

// Get versions for current image
const handleGetVersionsForImage = async (imageUID) => {
  const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
    imageDisplaySetInstanceUID: imageUID
  });
  setAvailableVersions(versions);
};
```

## Event Logging

The extension provides comprehensive console logging with `[SignalPET Measurements]` and `[SRManagement]` prefixes to help track operations:

- Automatic SR detection and loading
- Version queries and operations
- Save and apply operations
- Error conditions

## Error Handling

All operations include proper error handling with descriptive error messages:
- Missing SRs
- Failed hydration
- Save failures
- Invalid displaySet UIDs

## Configuration

The extension respects the standard OHIF configuration patterns and requires:
- `@ohif/extension-cornerstone-dicom-sr` for SR handling
- `@ohif/extension-measurement-tracking` for measurement management

## Dependencies

- `@ohif/extension-cornerstone-dicom-sr` - For SR handling and hydration
- `@ohif/extension-measurement-tracking` - For measurement tracking integration
- `@ohif/extension-cornerstone` - For viewport and annotation management
