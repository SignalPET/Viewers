import { useEffect, useCallback } from 'react';
import { isOhifMessage } from '../utils/simple-messaging';

interface UseUnsavedChangesOptions {
  onNavigationAttempt: () => void;
}

/**
 * Hook for handling navigation attempts from parent and showing dialog
 * Parent app now handles measurementService subscriptions and unsaved state
 */

export const useUnsavedChanges = ({ onNavigationAttempt }: UseUnsavedChangesOptions) => {};
