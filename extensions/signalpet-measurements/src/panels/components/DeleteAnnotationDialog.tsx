import React from 'react';
import ConfirmationDialog from './ConfirmationDialog';

const DeleteAnnotationDialog = ({
  onClose,
  onConfirm,
  loading = false,
}: DeleteAnnotationDialogProps) => {
  const message = (
    <p>
      Are you sure you want to delete this annotation?
      <br />
      This action cannot be undone.
    </p>
  );

  return (
    <ConfirmationDialog
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title="Delete Annotation"
      message={message}
      confirmText="Delete"
      cancelText="Cancel"
      loadingText="Deleting..."
    />
  );
};

type DeleteAnnotationDialogProps = {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
};

export default DeleteAnnotationDialog;
