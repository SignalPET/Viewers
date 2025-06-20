import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

interface ProgressiveLoadingIndicatorProps {
  viewportId: string;
  servicesManager: any;
}

interface QualityLevelStatus {
  quality: number;
  name: string;
  loaded: boolean;
  loading: boolean;
  error?: string;
}

function ProgressiveLoadingIndicator({
  viewportId,
  servicesManager,
}: ProgressiveLoadingIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevelStatus[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);

  useEffect(() => {
    const { progressiveLoadingService } = servicesManager.services;

    if (!progressiveLoadingService || !progressiveLoadingService.EVENTS) {
      console.warn('ProgressiveLoadingService not available or not properly initialized');
      return;
    }

    // Initialize quality levels
    const initialLevels: QualityLevelStatus[] = [
      { quality: 25, name: 'Low', loaded: false, loading: false },
      { quality: 50, name: 'Medium', loaded: false, loading: false },
      { quality: 75, name: 'High', loaded: false, loading: false },
      { quality: 100, name: 'Full', loaded: false, loading: false },
    ];
    setQualityLevels(initialLevels);

    // Subscribe to progressive loading events
    const unsubscribeQualityLoaded = progressiveLoadingService.subscribe(
      progressiveLoadingService.EVENTS.QUALITY_LEVEL_LOADED,
      ({ qualityLevel, viewportId: eventViewportId }: any) => {
        if (eventViewportId !== viewportId) {
          return;
        }

        setQualityLevels(prev =>
          prev.map(level =>
            level.quality === qualityLevel.quality
              ? { ...level, loaded: true, loading: false }
              : level
          )
        );

        // Update current level
        const levelIndex = initialLevels.findIndex(l => l.quality === qualityLevel.quality);
        setCurrentLevel(levelIndex + 1);

        // Show indicator
        setIsVisible(true);

        // Auto-hide after a short delay if this is the final quality
        if (qualityLevel.quality === 100) {
          setTimeout(() => setIsVisible(false), 2000);
        }
      }
    );

    const unsubscribeComplete = progressiveLoadingService.subscribe(
      progressiveLoadingService.EVENTS.PROGRESSIVE_LOADING_COMPLETE,
      ({ viewportId: eventViewportId }: any) => {
        if (eventViewportId === viewportId) {
          setTimeout(() => setIsVisible(false), 1000);
        }
      }
    );

    const unsubscribeError = progressiveLoadingService.subscribe(
      progressiveLoadingService.EVENTS.PROGRESSIVE_LOADING_ERROR,
      ({ qualityLevel, error, viewportId: eventViewportId }: any) => {
        if (eventViewportId !== viewportId) {
          return;
        }

        setQualityLevels(prev =>
          prev.map(level =>
            level.quality === qualityLevel.quality
              ? { ...level, loading: false, error: error.message }
              : level
          )
        );
      }
    );

    return () => {
      if (unsubscribeQualityLoaded && typeof unsubscribeQualityLoaded.unsubscribe === 'function') {
        unsubscribeQualityLoaded.unsubscribe();
      }
      if (unsubscribeComplete && typeof unsubscribeComplete.unsubscribe === 'function') {
        unsubscribeComplete.unsubscribe();
      }
      if (unsubscribeError && typeof unsubscribeError.unsubscribe === 'function') {
        unsubscribeError.unsubscribe();
      }
    };
  }, [viewportId, servicesManager]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="max-w-48 absolute bottom-2 right-2 rounded-lg bg-black bg-opacity-75 p-2 font-mono text-xs text-white">
      <div className="mb-1 font-semibold">Progressive Loading</div>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 w-full rounded-full bg-gray-600">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(currentLevel / qualityLevels.length) * 100}%` }}
        />
      </div>

      {/* Quality levels */}
      <div className="space-y-1">
        {qualityLevels.map((level, index) => (
          <div
            key={level.quality}
            className="flex items-center justify-between"
          >
            <span
              className={`${level.loaded ? 'text-green-400' : level.error ? 'text-red-400' : 'text-gray-400'}`}
            >
              {level.name} ({level.quality}%)
            </span>
            <div className="ml-2">
              {level.loaded && <span className="text-green-400">✓</span>}
              {level.loading && <span className="animate-spin">⟳</span>}
              {level.error && <span className="text-red-400">✗</span>}
              {!level.loaded && !level.loading && !level.error && index <= currentLevel && (
                <span className="text-gray-500">◯</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

ProgressiveLoadingIndicator.propTypes = {
  viewportId: PropTypes.string.isRequired,
  servicesManager: PropTypes.object.isRequired,
};

export default ProgressiveLoadingIndicator;
