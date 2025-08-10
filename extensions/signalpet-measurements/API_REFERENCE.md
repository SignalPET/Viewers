# SignalPET Measurements Extension - API Reference

## Quick Start

```typescript
// In your UI extension
import { SRVersion } from '@signalpet/extension-signalpet-measurements';
const { commandsManager } = useSystem();

// Load latest SR
const sr = await commandsManager.runCommand('signalpetLoadLatestSR');

// Get all versions
const versions = await commandsManager.runCommand('signalpetGetAllSRVersions');

// Save current measurements
const newSR = await commandsManager.runCommand('signalpetSaveSR', {
  imageDisplaySetInstanceUID: 'required-image-uid'
});

// Apply specific version
const appliedSR = await commandsManager.runCommand('signalpetApplySR', {
  displaySetInstanceUID: 'uid123'
});
```

## Available Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `signalpetLoadLatestSR` | none | `Promise<SRVersion \| null>` | Loads the most recent SR |
| `signalpetGetAllSRVersions` | none | `Promise<SRVersion[]>` | Gets all SR versions (lightweight, metadata only) |
| `signalpetGetSRVersionsForImage` | `{ imageDisplaySetInstanceUID: string }` | `Promise<SRVersion[]>` | Gets SR versions for specific image (for dropdowns) |
| `signalpetSaveSR` | `{ description?: string }` | `Promise<SRVersion>` | Saves current measurements as new SR |
| `signalpetApplySR` | `{ displaySetInstanceUID: string }` | `Promise<SRVersion>` | Applies specific SR version |
| `signalpetGetCurrentMeasurements` | none | `any[]` | Gets current measurements |
| `signalpetClearCurrentMeasurements` | none | `void` | Clears all current measurements |
| `signalpetGetSRService` | none | `SRManagementService` | Gets service instance for direct access |

## SRVersion Interface

```typescript
interface SRVersion {
  displaySetInstanceUID: string;     // Unique identifier for this SR
  SeriesInstanceUID: string;         // DICOM Series Instance UID
  SOPInstanceUID: string;            // DICOM SOP Instance UID
  SeriesDate?: string;               // Date in DICOM format
  SeriesTime?: string;               // Time in DICOM format
  SeriesNumber?: number;             // Series number
  SeriesDescription?: string;        // Human-readable description
  isLoaded: boolean;                 // Whether SR data is loaded
  isHydrated: boolean;              // Whether measurements are loaded
  isRehydratable: boolean;          // Whether can be loaded
  measurements?: any[];             // Array of measurements
  StudyInstanceUID: string;         // Parent study UID
}
```

## Error Handling

All commands throw descriptive errors:

```typescript
try {
  const sr = await commandsManager.runCommand('signalpetLoadLatestSR');
} catch (error) {
  console.error('Operation failed:', error.message);
  // Handle specific cases:
  // - "No SRs found"
  // - "SR with displaySetInstanceUID xxx not found"
  // - "No measurements to save"
  // - "Failed to apply SR: xxx"
}
```

## Automatic Features

The extension automatically:
1. **Detects new SRs** as they are added to studies
2. **Loads the latest SR** when a study is opened
3. **Monitors displaySet changes** and viewport events
4. **Logs operations** with `[SignalPET Measurements]` prefix

## Integration Patterns

### React Hook Pattern
```typescript
function useSRManager() {
  const { commandsManager } = useSystem();
  const [srs, setSRs] = useState<SRVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const versions = await commandsManager.runCommand('signalpetGetAllSRVersions');
      setSRs(versions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [commandsManager]);

  return { srs, loading, loadAll, commandsManager };
}
```

### Event-Driven Updates
```typescript
// Listen for displaySet changes to refresh SR list
useEffect(() => {
  const { displaySetService } = servicesManager.services;

  const unsubscribe = displaySetService.subscribe(
    displaySetService.EVENTS.DISPLAY_SETS_ADDED,
    ({ displaySetsAdded }) => {
      const newSRs = displaySetsAdded.filter(ds => ds.Modality === 'SR');
      if (newSRs.length > 0) {
        refreshSRList();
      }
    }
  );

  return unsubscribe;
}, []);
```

## Best Practices

1. **Always handle errors** - SR operations can fail
2. **Refresh lists after saves** - New SRs won't appear automatically
3. **Check isRehydratable** before applying SRs
4. **Use descriptive names** when saving SRs
5. **Clear measurements** before applying different SRs if needed
6. **Monitor loading states** for better UX

## Dependencies Required

- `@ohif/extension-cornerstone-dicom-sr`
- `@ohif/extension-measurement-tracking`
- `@ohif/extension-cornerstone`
