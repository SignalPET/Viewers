# SignalPET Measurements Extension

A comprehensive OHIF extension for advanced measurement management with automatic SR (Structured Report) handling, version control, and robust data visualization.

## 🚀 Features

### Core Functionality
- **Automatic SR Detection & Loading**: Per-image SR detection with automatic loading of the latest version
- **SR Version Management**: Complete version control with dropdown selection and status indicators
- **Multi-Image Layout Support**: Automatic detection of multi-viewport layouts with per-image measurement sections
- **Measurement Persistence**: Save and restore measurements across sessions
- **Real-time Display**: Dynamic measurement text with retry mechanisms for data reliability
- **Robust Error Handling**: Exponential backoff retry logic for timing-sensitive operations

### Supported Measurement Tools
- **Length**: Linear measurements with units
- **CircleROI**: Area, mean, standard deviation, perimeter calculations
- **RectangleROI**: Area and statistical analysis
- **EllipticalROI**: Area and statistical measurements
- **PlanarFreehandROI**: Complex region analysis
- **Probe**: Point measurements with HU values

## 📦 Installation

This extension is part of the SignalPET OHIF viewer and is automatically included in the platform configuration.

### Dependencies
- `@ohif/core`
- `@ohif/ui-next`
- `exponential-backoff` - For robust retry mechanisms

## 🔧 Configuration

### Extension Registration
```javascript
// In your OHIF configuration
{
  extensionId: '@signalpet/measurements',
  version: '^1.0.0'
}
```

### Panel Integration
```javascript
// Add to your mode configuration
{
  id: 'signalpet-measurements-panel',
  component: 'SignalPETMeasurementsPanel'
}
```

## 📖 API Reference

### Commands

#### Core SR Management
```javascript
// Get SR versions for specific image
const versions = await commandsManager.runCommand('signalpetGetSRVersionsForImage', {
  imageDisplaySetInstanceUID: 'image-uid-123'
});

// Apply specific SR version (works for both single and multi-image modes)
await commandsManager.runCommand('signalpetApplySR', {
  displaySetInstanceUID: 'sr-uid-456'
});

// Save current measurements as SR
await commandsManager.runCommand('signalpetSaveSR', {
  imageDisplaySetInstanceUID: 'image-uid-123'
});
```

#### Utility Commands
```javascript
// Get current measurements
const measurements = commandsManager.runCommand('signalpetGetCurrentMeasurements');

// Cleanup measurements for images not currently displayed
commandsManager.runCommand('signalpetCleanupMeasurements');

// Get service instance
const srService = commandsManager.runCommand('signalpetGetSRService');
```

### Hooks

#### useSRVersions
Manages SR version state and operations:
```typescript
const { srVersions, selectedSR, loading, applySR } = useSRVersions({
  servicesManager,
  commandsManager,
  onSRApplied: (sr) => {
    // Handle SR application
  }
});
```

#### useMeasurements
Handles measurement data and actions:
```typescript
const {
  measurements,
  editingMeasurement,
  setEditingMeasurement,
  loadMeasurementsFromService,
  handleMeasurementAction,
  hideAllMeasurements
} = useMeasurements({
  servicesManager,
  commandsManager,
  onMeasurementChange: () => {
    // Handle measurement changes
  }
});
```

#### useMultiImageMeasurements
Handles measurements for multi-image layouts with per-image sections:
```typescript
const {
  multiImageState,
  setActiveImageIndex,
  applySRForImage,
  totalMeasurementsCount,
} = useMultiImageMeasurements({
  servicesManager,
  commandsManager,
  onMeasurementChange: () => {
    // Handle measurement changes across all images
  }
});
```

#### useUnsavedChanges
Manages unsaved state tracking:
```typescript
const {
  hasUnsavedChanges,
  showUnsavedDialog,
  markAsUnsaved,
  markAsSaved,
  handleUnsavedDialogSave,
  handleUnsavedDialogLeave,
  handleUnsavedDialogClose
} = useUnsavedChanges();
```

## 🏗️ Architecture

### Service Layer
- **SRManagementService**: Core SR operations with retry mechanisms and automatic cleanup
- **Measurement utilities**: Data processing and validation
- **Display text utilities**: Format measurement values for UI
- **Automatic event handling**: Layout and viewport change detection in `init.ts`

### Component Structure
```
SignalPETMeasurementsPanel/
├── MeasurementHeader/
│   ├── VersionSelector (single-image mode)
│   └── SaveButton
├── MeasurementsBody/ (single-image mode)
│   └── MeasurementItem/
│       ├── MeasurementNameEditor
│       ├── MeasurementActions
│       └── MeasurementValues
├── MultiImageMeasurementsBody/ (multi-image mode)
│   └── ImageSection/
│       ├── ImageHeader
│       ├── SRVersionSelector
│       └── MeasurementsList
└── UnsavedAnnotationsDialog
```

### Data Flow

#### Single-Image Mode
1. **Initialization**: Auto-loads latest SR for current image
2. **Version Change**: Applies new SR with exponential backoff retry
3. **Measurement Updates**: Real-time sync with annotation state
4. **Persistence**: Save measurements as new SR versions

#### Multi-Image Mode
1. **Layout Detection**: Automatically detects when layout has multiple viewports
2. **Per-Image Data**: Loads measurements and SR versions for each image independently
3. **Sectioned Display**: Shows measurements grouped by image with expandable sections
4. **Individual SR Control**: Each image has its own SR version selector
5. **Automatic Cleanup**: Measurements are automatically cleaned up when images are removed from view
6. **Active Image Tracking**: Highlights the currently active viewport's image section

## 🧹 Automatic Measurement Cleanup

The extension automatically manages measurements based on what's currently displayed:

### Cleanup Triggers
- **Layout Changes**: When viewport grid changes (4x1 → 2x2 → 1x1)
- **Grid State Changes**: When different images are loaded into viewports
- **Extension Initialization**: Initial cleanup when extension loads

### Implementation
The cleanup is handled directly in `init.ts` through event subscriptions:
- `LAYOUT_CHANGED`: Triggered when number/arrangement of viewports changes
- `GRID_STATE_CHANGED`: Triggered when viewport content changes
- Cleanup runs before SR auto-loading to ensure consistency

### Behavior
- **Keeps**: Measurements belonging to currently displayed images
- **Removes**: Measurements from images no longer visible
- **Matches**: By `displaySetInstanceUID`, `referencedImageId`, and `SOPInstanceUID`

## 🔄 Retry Mechanisms

### Exponential Backoff Configuration
- **Measurement Data**: 5 attempts, 50ms→1000ms delays
- **SR Hydration**: 10 attempts, 100ms→3000ms delays
- **Field Validation**: Retry until all required fields are present

### Field Requirements by Tool
| Tool | Required Fields |
|------|----------------|
| Length | `length`, `unit` |
| CircleROI | `mean`, `stdDev`, `max`, `area`, `areaUnit`, `modalityUnit`, `perimeter`, `radiusUnit` |
| RectangleROI | `mean`, `stdDev`, `max`, `area`, `areaUnit`, `modalityUnit` |
| EllipticalROI | `mean`, `stdDev`, `max`, `area`, `areaUnit`, `modalityUnit` |
| PlanarFreehandROI | `mean`, `stdDev`, `max`, `area`, `areaUnit`, `modalityUnit` |
| Probe | `value` |

## 🎨 UI Components

### Measurement Panel
- **Header**: Version selector and save button
- **Body**: Scrollable list of measurements with inline editing
- **Actions**: Toggle visibility, delete, jump to measurement

### Dialogs
- **UnsavedAnnotationsDialog**: Prompts for save/discard on version changes
- **DeleteAnnotationDialog**: Confirmation for measurement deletion

## 🧪 Development

### File Structure
```
src/
├── components/           # Reusable UI components
├── hooks/               # React hooks for state management
├── panels/              # Main panel components
├── services/            # Business logic services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── commandsModule.ts    # OHIF command definitions
└── index.tsx           # Extension entry point
```

### Key Utilities
- **measurement.utils.ts**: Data processing with retry logic
- **displayText.utils.ts**: Measurement value formatting
- **sr.utils.ts**: SR display name generation
- **viewport.utils.ts**: Viewport validation utilities

## 🐛 Troubleshooting

### Common Issues

#### Measurements Not Loading
- Check browser console for retry attempts
- Verify image is fully loaded before SR hydration
- Ensure viewport is properly calibrated

#### Display Text Shows "N/A"
- Measurement data may be incomplete during loading
- Retry mechanism will continue until all fields are present
- Check for numeric values returned as strings

#### SR Version Not Applying
- Verify displaySetInstanceUID exists
- Check for proper SR modality in displaySet
- Review hydration retry logs

#### Measurements Disappearing in Multi-Image Mode
- This is expected behavior when layout changes
- Check console logs for cleanup operations
- Verify measurements belong to currently displayed images
- Use `signalpetCleanupMeasurements` to manually trigger cleanup

### Debug Logging
The extension provides comprehensive logging with prefixes:
- `[SignalPET Measurements]`: General operations and event handling
- `[SRManagement]`: SR service operations and cleanup
- `[getMeasurementCachedStats]`: Data retrieval attempts
- `[Multi-Image]`: Multi-image layout specific operations

## 📄 License

This extension is part of the SignalPET platform and follows the project's licensing terms.

## 🤝 Contributing

For development guidelines and contribution process, please refer to the main SignalPET project documentation.

---

**Note**: This extension requires proper OHIF environment setup and SignalPET backend services for full functionality.
