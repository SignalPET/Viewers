import React from 'react';
import ConfirmationDialog from './ConfirmationDialog';

const SaveAnnotationsDialog = ({
  onClose,
  onConfirm,
  loading = false,
}: SaveAnnotationsDialogProps) => {
  const message = (
    <p>
      You're about to save your annotations for this study.
      <br />
      Make sure all measurements and notes are complete.
      <br />
      Would you like to proceed?
    </p>
  );

  return (
    <ConfirmationDialog
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title="Save Annotations"
      message={message}
      confirmText="Save SR"
      cancelText="Cancel"
      loadingText="Saving..."
    />
  );
};

type SaveAnnotationsDialogProps = {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
};

export default SaveAnnotationsDialog;
