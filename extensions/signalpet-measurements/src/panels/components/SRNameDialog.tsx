import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input } from '@ohif/ui-next';

interface SRNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
  loading?: boolean;
}

const SRNameDialog: React.FC<SRNameDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await onConfirm(name.trim());
      setName(''); // Clear the input after successful submission
    }
  };

  const handleClose = () => {
    setName(''); // Clear the input when closing
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => !open && handleClose()}
    >
      <DialogContent className="max-w-lg border-0 bg-[#08252c] p-0 sm:max-w-xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 text-white/70 transition-colors hover:text-white"
          disabled={loading}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>

        {/* Dialog content */}
        <div className="p-6 sm:p-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Header section */}
            <div className="space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-xl font-normal leading-tight text-white sm:text-2xl">
                  Name your SR
                </h2>
                <p className="text-sm font-normal leading-relaxed text-[#b4c0c2]">
                  Share medical cases with colleagues and clients via email.
                </p>
              </div>

              {/* Input field */}
              <div className="flex justify-center">
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter SR name..."
                  className="w-full max-w-xs rounded border-0 bg-[#092c34] px-3 py-2 text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/30"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                size="lg"
                className="border-[#2e5f6d] bg-transparent px-6 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                size="lg"
                className="bg-[#097293] px-6 text-white hover:bg-[#0a7fa6] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create SR'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SRNameDialog;
