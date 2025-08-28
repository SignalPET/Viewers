/**
 * Simple OHIF-specific messaging for unsaved changes flow
 */

// Message types
export interface OhifNavigationAttemptMessage {
  type: 'OHIF_NAVIGATION_ATTEMPT';
  destination: string;
}

export interface OhifDialogResponseMessage {
  type: 'OHIF_DIALOG_RESPONSE';
  action: 'cancel' | 'continue';
}

export type OhifMessage = OhifNavigationAttemptMessage | OhifDialogResponseMessage;

/**
 * Send dialog response from OHIF to parent
 */
export function sendDialogResponse(action: 'cancel' | 'continue'): void {
  const message: OhifDialogResponseMessage = {
    type: 'OHIF_DIALOG_RESPONSE',
    action,
  };
  window.parent.postMessage(message, '*');
}

/**
 * Check if message is OHIF message
 */
export function isOhifMessage(data: any): data is OhifMessage {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.type === 'string' &&
    (data.type === 'OHIF_NAVIGATION_ATTEMPT' || data.type === 'OHIF_DIALOG_RESPONSE')
  );
}
