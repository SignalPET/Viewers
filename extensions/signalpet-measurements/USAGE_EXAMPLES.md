# SignalPET SR Management - Usage Examples

## Basic Usage in Your UI Extension

### 1. Setup in Your Extension

```typescript
// In your extension's component
import { useSystem } from '@ohif/core/src/contextProviders/SystemProvider';
import { SRVersion } from '@signalpet/extension-signalpet-measurements';

function MySRManagerComponent() {
  const { commandsManager } = useSystem();
  const [availableSRs, setAvailableSRs] = useState<SRVersion[]>([]);
  const [currentSR, setCurrentSR] = useState<SRVersion | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all available SRs on component mount
  useEffect(() => {
    loadAvailableSRs();
  }, []);

  const loadAvailableSRs = async () => {
    try {
      const srs = await commandsManager.runCommand('signalpetGetAllSRVersions');
      setAvailableSRs(srs);
    } catch (error) {
      console.error('Failed to load SRs:', error);
    }
  };
```

### 2. Load Latest SR

```typescript
const handleLoadLatest = async () => {
  setLoading(true);
  try {
    const sr = await commandsManager.runCommand('signalpetLoadLatestSR');
    if (sr) {
      setCurrentSR(sr);
      console.log('Loaded latest SR:', sr.SeriesDescription);
    } else {
      console.log('No SRs available');
    }
  } catch (error) {
    console.error('Failed to load latest SR:', error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Apply Specific SR Version

```typescript
const handleApplySR = async (displaySetInstanceUID: string) => {
  setLoading(true);
  try {
    const sr = await commandsManager.runCommand('signalpetApplySR', {
      displaySetInstanceUID
    });
    setCurrentSR(sr);
    console.log('Applied SR:', sr.SeriesDescription);

    // Refresh the list to get updated hydration status
    await loadAvailableSRs();
  } catch (error) {
    console.error('Failed to apply SR:', error);
  } finally {
    setLoading(false);
  }
};
```

### 4. Save Current Measurements

```typescript
const handleSaveCurrentMeasurements = async () => {
  setLoading(true);
  try {
    const newSR = await commandsManager.runCommand('signalpetSaveSR', {
      imageDisplaySetInstanceUID: activeImageUID // Assuming activeImageUID is available in context
    });
    console.log('Saved new SR:', newSR.SeriesDescription);

    // Refresh the list to include the new SR
    await loadAvailableSRs();
    setCurrentSR(newSR);
  } catch (error) {
    console.error('Failed to save SR:', error);
    alert('Failed to save SR: ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

### 5. Complete UI Component Example

```typescript
function SRManagerPanel() {
  const { commandsManager } = useSystem();
  const [availableSRs, setAvailableSRs] = useState<SRVersion[]>([]);
  const [currentSR, setCurrentSR] = useState<SRVersion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableSRs();
  }, []);

  const loadAvailableSRs = async () => {
    try {
      const srs = await commandsManager.runCommand('signalpetGetAllSRVersions');
      setAvailableSRs(srs);
    } catch (error) {
      console.error('Failed to load SRs:', error);
    }
  };

  const handleLoadLatest = async () => {
    setLoading(true);
    try {
      const sr = await commandsManager.runCommand('signalpetLoadLatestSR');
      setCurrentSR(sr);
    } catch (error) {
      console.error('Failed to load latest SR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySR = async (srVersion: SRVersion) => {
    setLoading(true);
    try {
      const sr = await commandsManager.runCommand('signalpetApplySR', {
        displaySetInstanceUID: srVersion.displaySetInstanceUID
      });
      setCurrentSR(sr);
      await loadAvailableSRs();
    } catch (error) {
      console.error('Failed to apply SR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const newSR = await commandsManager.runCommand('signalpetSaveSR', {
        imageDisplaySetInstanceUID: currentImageUID // Get from context/state
      });
      await loadAvailableSRs();
      setCurrentSR(newSR);
    } catch (error) {
      console.error('Failed to save SR:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearMeasurements = () => {
    commandsManager.runCommand('signalpetClearCurrentMeasurements');
    setCurrentSR(null);
  };

  return (
    <div className="sr-manager-panel">
      <div className="sr-actions">
        <button onClick={handleLoadLatest} disabled={loading}>
          Load Latest SR
        </button>
        <button onClick={handleSave} disabled={loading}>
          Save Current Measurements
        </button>
        <button onClick={handleClearMeasurements} disabled={loading}>
          Clear Measurements
        </button>
      </div>

      <div className="current-sr">
        <h3>Current SR</h3>
        {currentSR ? (
          <div>
            <p><strong>Description:</strong> {currentSR.SeriesDescription}</p>
            <p><strong>Date:</strong> {currentSR.SeriesDate}</p>
            <p><strong>Measurements:</strong> {currentSR.measurements?.length || 0}</p>
          </div>
        ) : (
          <p>No SR loaded</p>
        )}
      </div>

      <div className="sr-versions">
        <h3>Available SR Versions ({availableSRs.length})</h3>
        {availableSRs.map((sr) => (
          <div
            key={sr.displaySetInstanceUID}
            className={`sr-item ${currentSR?.displaySetInstanceUID === sr.displaySetInstanceUID ? 'active' : ''}`}
          >
            <div className="sr-info">
              <strong>{sr.SeriesDescription}</strong>
              <br />
              <small>
                {sr.SeriesDate} {sr.SeriesTime} | Series {sr.SeriesNumber}
              </small>
              <br />
              <small>
                Status: {sr.isHydrated ? 'Loaded' : sr.isRehydratable ? 'Available' : 'Not available'}
              </small>
            </div>
            <button
              onClick={() => handleApplySR(sr)}
              disabled={loading || sr.displaySetInstanceUID === currentSR?.displaySetInstanceUID}
            >
              {sr.displaySetInstanceUID === currentSR?.displaySetInstanceUID ? 'Current' : 'Apply'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Advanced Usage

### Using the Service Directly

```typescript
// Get direct access to the service for advanced operations
const srService = commandsManager.runCommand('signalpetGetSRService');

// Custom operations
const measurements = srService.getCurrentMeasurements();
const customSortedSRs = await srService.getAllSRVersions();

// Apply custom filtering/sorting logic
const filteredSRs = customSortedSRs.filter(sr =>
  sr.SeriesDescription?.includes('SignalPET')
);
```

### Error Handling Patterns

```typescript
const handleSROperation = async (operation: () => Promise<any>) => {
  try {
    setLoading(true);
    setError(null);
    const result = await operation();
    return result;
  } catch (error) {
    setError(error.message);
    console.error('SR operation failed:', error);
    // Show user-friendly error message
    showNotification({
      type: 'error',
      title: 'SR Operation Failed',
      message: error.message
    });
  } finally {
    setLoading(false);
  }
};

// Usage
const loadLatest = () => handleSROperation(async () => {
  const sr = await commandsManager.runCommand('signalpetLoadLatestSR');
  setCurrentSR(sr);
  return sr;
});
```

### Integration with OHIF UI Components

```typescript
import { useViewportGrid } from '@ohif/ui-next';
import { useSystem } from '@ohif/core/src/contextProviders/SystemProvider';

function SRIntegratedComponent() {
  const { commandsManager, servicesManager } = useSystem();
  const [viewportGrid] = useViewportGrid();

  // Listen for viewport changes
  useEffect(() => {
    const { viewportGridService } = servicesManager.services;

    const unsubscribe = viewportGridService.subscribe(
      viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
      ({ viewportId }) => {
        console.log('Active viewport changed:', viewportId);
        // Optionally refresh SR data when viewport changes
      }
    );

    return unsubscribe;
  }, []);

  // Rest of component...
}
```
