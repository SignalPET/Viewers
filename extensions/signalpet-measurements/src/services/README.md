# SignalPET Measurements Services

This directory contains services for managing measurements and structured reports (SR) in the SignalPET viewer.

## SRManagementService

Main service for managing structured reports, including saving, loading, and applying SRs. This service uses the custom `customStoreMeasurements` utility function for all storage operations.

### Methods

- `saveSR(imageDisplaySetInstanceUID)`: Save current measurements as SR
- `applySR(displaySetInstanceUID)`: Apply an existing SR
- `getSRVersionsForImage(imageDisplaySetInstanceUID)`: Get all SR versions for an image
- `getCurrentMeasurements()`: Get current measurements
- `clearCurrentMeasurements()`: Clear all current measurements

### Custom Storage Implementation

The `saveSR` method uses the `customStoreMeasurements` utility function from `../utils/customStoreMeasurements.ts` instead of the default OHIF command. This ensures all measurement storage goes through a custom XMLHttpRequest with the SignalPETStudyID query parameter.

### SignalPETStudyID

The service includes a `getSignalPETStudyID()` method that you can customize to retrieve the SignalPETStudyID from your preferred source:

- Image display set metadata
- A service that tracks study mappings
- User input/configuration
- Study metadata fields

### Query Parameter

When storing measurements, the following query parameter is added to the STOW-RS URL:

- `SignalPETStudyID`: The identifier for the SignalPET study

### Example URL

```
POST /studies/1.2.3.4.5.6.7.8.9?SignalPETStudyID=your-signalpet-study-id
```

## Custom Storage Utility

The custom storage functionality is implemented in `../utils/customStoreMeasurements.ts` as a utility function rather than a service, providing direct control over the XMLHttpRequest for DICOM storage with the SignalPETStudyID parameter.
