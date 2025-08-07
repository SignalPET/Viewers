import React from 'react';
import { Dialog, DialogContent, Button } from '@ohif/ui-next';

type UnsavedAnnotationsDialogProps = {
  onClose: () => void;
  onSave: () => Promise<void>;
  onLeaveWithoutSaving: () => void;
  loading?: boolean;
};

type DialogCloseButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

const DialogCloseButton = ({ onClick, disabled = false }: DialogCloseButtonProps) => (
  <button
    onClick={onClick}
    className="absolute right-3 top-3 z-10 text-white/70 transition-colors hover:text-white"
    disabled={disabled}
    aria-label="Close dialog"
  >
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  </button>
);

const DialogHeader = () => (
  <header className="space-y-3 text-center">
    <h2 className="text-[22px] font-normal leading-[30px] text-white">Unsaved Annotations</h2>
    <p className="text-[14px] font-normal leading-[20px] text-[#b4c0c2]">
      You have unsaved annotations.
      <br />
      Would you like to save them before leaving this page?
    </p>
  </header>
);

type DialogActionsProps = {
  onSave: () => void;
  onLeaveWithoutSaving: () => void;
  loading?: boolean;
};

const DialogActions = ({ onSave, onLeaveWithoutSaving, loading = false }: DialogActionsProps) => (
  <footer className="flex gap-3">
    <Button
      type="button"
      variant="outline"
      onClick={onLeaveWithoutSaving}
      disabled={loading}
      className="h-11 rounded-md border-[#2e5f6d] bg-transparent px-4 py-2 text-white hover:bg-white/10"
    >
      Leave Without Saving
    </Button>
    <Button
      type="button"
      onClick={onSave}
      disabled={loading}
      className="h-11 rounded-md bg-[#097293] px-4 py-2 text-white hover:bg-[#0a7fa6] disabled:opacity-50"
    >
      {loading ? 'Saving...' : 'Save'}
    </Button>
  </footer>
);

const UnsavedAnnotationsDialog = ({
  onClose,
  onSave,
  onLeaveWithoutSaving,
  loading = false,
}: UnsavedAnnotationsDialogProps) => {
  const handleSave = async () => {
    await onSave();
  };

  return (
    <Dialog
      open={true}
      onOpenChange={open => !open && onClose()}
    >
      <DialogContent className="max-w-lg rounded-xl border-0 bg-[#08252c] p-0">
        <DialogCloseButton
          onClick={onClose}
          disabled={loading}
        />

        <div className="flex flex-col items-center gap-8 px-6 py-8">
          <DialogHeader />
          <DialogActions
            onSave={handleSave}
            onLeaveWithoutSaving={onLeaveWithoutSaving}
            loading={loading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnsavedAnnotationsDialog;
