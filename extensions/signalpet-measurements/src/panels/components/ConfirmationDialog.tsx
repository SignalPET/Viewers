import React from 'react';
import { Dialog, DialogContent, Button } from '@ohif/ui-next';

type ConfirmationDialogProps = {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText: string;
  cancelText?: string;
  loadingText?: string;
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

type DialogHeaderProps = {
  title: string;
  message: string | React.ReactNode;
};

const DialogHeader = ({ title, message }: DialogHeaderProps) => (
  <header className="space-y-3 text-center">
    <h2 className="text-[22px] font-normal leading-[30px] text-white">{title}</h2>
    <div className="text-[14px] font-normal leading-[20px] text-[#b4c0c2]">
      {typeof message === 'string' ? <p>{message}</p> : message}
    </div>
  </header>
);

type DialogActionsProps = {
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  confirmText: string;
  cancelText: string;
  loadingText?: string;
};

const DialogActions = ({
  onCancel,
  onConfirm,
  loading = false,
  confirmText,
  cancelText,
  loadingText,
}: DialogActionsProps) => (
  <footer className="flex gap-3">
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={loading}
      className="h-11 rounded-md border-[#2e5f6d] bg-transparent px-4 py-2 text-white hover:bg-white/10"
    >
      {cancelText}
    </Button>
    <Button
      type="button"
      onClick={onConfirm}
      disabled={loading}
      className="h-11 rounded-md bg-[#097293] px-4 py-2 text-white hover:bg-[#0a7fa6] disabled:opacity-50"
    >
      {loading ? loadingText || `${confirmText}...` : confirmText}
    </Button>
  </footer>
);

const ConfirmationDialog = ({
  onClose,
  onConfirm,
  loading = false,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  loadingText,
}: ConfirmationDialogProps) => {
  const handleConfirm = async () => {
    await onConfirm();
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
          <DialogHeader
            title={title}
            message={message}
          />
          <DialogActions
            onCancel={onClose}
            onConfirm={handleConfirm}
            loading={loading}
            confirmText={confirmText}
            cancelText={cancelText}
            loadingText={loadingText}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationDialog;
