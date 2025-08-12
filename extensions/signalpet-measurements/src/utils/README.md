# Custom Store Measurements Utility

## Overview

The `customStoreMeasurements.ts` utility provides a custom implementation for storing DICOM Structured Reports (SR) with the ability to add query parameters to the STOW-RS request URL.

## Key Features

- **Query Parameter Support**: Adds `SignalPETStudyID` as a query parameter to the STOW-RS URL
- **DataSource Integration**: Uses the existing `dataSource.store.dicom()` method with a custom XMLHttpRequest
- **URL Override**: Intercepts the XMLHttpRequest to modify the URL before the request is sent
- **Customization Support**: Supports the `onBeforeDicomStore` customization hook if `customizationService` is provided

## How It Works

1. **URL Construction**: Builds the STOW-RS URL and appends the `SignalPETStudyID` query parameter
2. **Request Interception**: Creates a custom XMLHttpRequest and overrides its `open()` method to use the modified URL
3. **DataSource Delegation**: Passes the custom request to `dataSource.store.dicom()` which handles all the DICOM processing
4. **Automatic Cleanup**: The dataSource automatically handles metadata store updates and cleanup

## Example Usage

```typescript
import { customStoreMeasurements } from './customStoreMeasurements';

const result = await customStoreMeasurements({
  measurementData: measurements,
  dataSource: dataSource,
  additionalFindingTypes: [],
  options: {
    SeriesDescription: 'My SR Report',
    // ... other options
  },
  signalPETStudyID: 'my-signalpet-study-id',
  customizationService: servicesManager.services.customizationService, // optional
});
```

## Generated URL Example

The utility will modify requests from:
```
POST /studies/1.2.3.4.5.6.7.8.9
```

To:
```
POST /studies/1.2.3.4.5.6.7.8.9?SignalPETStudyID=my-signalpet-study-id
```

## Integration with SRManagementService

The `SRManagementService` automatically uses this utility when calling `saveSR()`. The `SignalPETStudyID` is retrieved from the URL query parameters using:

```typescript
const signalPETStudyID = new URLSearchParams(window.location.search).get('SignalPETStudyID') || '';
```

You can modify the `getSignalPETStudyID()` method in `SRManagementService` to retrieve the ID from a different source if needed.

## Benefits

- **Minimal Code Changes**: Leverages existing OHIF/dataSource infrastructure
- **Flexible**: Easy to modify query parameter logic or add additional parameters
- **Compatible**: Works with existing customization hooks and error handling
- **Debuggable**: Console logs show URL modifications for troubleshooting
