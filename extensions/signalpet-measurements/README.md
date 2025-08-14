# SignalPET Measurements Extension

A comprehensive OHIF extension for advanced measurement management with automatic SR (Structured Report) handling, version control, and robust data visualization.

## 🚀 Features

### Core Functionality
- **Automatic SR Detection & Loading**: Per-image SR detection with automatic loading of the latest version
- **SR Version Management**: Complete version control with dropdown selection and status indicators
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

// Apply specific SR version
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

// Clear all measurements
commandsManager.runCommand('signalpetClearCurrentMeasurements');

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
- **SRManagementService**: Core SR operations with retry mechanisms
- **Measurement utilities**: Data processing and validation
- **Display text utilities**: Format measurement values for UI

### Component Structure
```
SignalPETMeasurementsPanel/
├── MeasurementHeader/
│   ├── VersionSelector
│   └── SaveButton
├── MeasurementsBody/
│   └── MeasurementItem/
│       ├── MeasurementNameEditor
│       ├── MeasurementActions
│       └── MeasurementValues
└── UnsavedAnnotationsDialog
```

### Data Flow
1. **Initialization**: Auto-loads latest SR for current image
2. **Version Change**: Applies new SR with exponential backoff retry
3. **Measurement Updates**: Real-time sync with annotation state
4. **Persistence**: Save measurements as new SR versions

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

### Debug Logging
The extension provides comprehensive logging with prefixes:
- `[SignalPET Measurements]`: General operations
- `[SRManagement]`: SR service operations
- `[getMeasurementCachedStats]`: Data retrieval attempts

## 📄 License

This extension is part of the SignalPET platform and follows the project's licensing terms.

## 🤝 Contributing

For development guidelines and contribution process, please refer to the main SignalPET project documentation.

---

**Note**: This extension requires proper OHIF environment setup and SignalPET backend services for full functionality.
