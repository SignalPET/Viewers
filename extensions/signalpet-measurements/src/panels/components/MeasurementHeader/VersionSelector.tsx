import React from 'react';
import { Dropdown } from '../ui';
import { getSRDisplayName } from '../../../utils/sr.utils';

const VersionSelector = ({
  srVersions,
  selectedSR,
  onSRSelection,
  loading,
}: VersionSelectorProps) => {
  const options = srVersions.map(sr => ({
    value: sr,
    label: getSRDisplayName(sr),
  }));

  const handleSelect = async (option: { value: any; label: string }) => {
    await onSRSelection(option.value);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="text-xs font-normal text-white/75">Version</label>

      <Dropdown
        options={options}
        value={selectedSR}
        onSelect={handleSelect}
        placeholder={srVersions.length === 0 ? 'No versions available' : 'Select version...'}
        disabled={loading || srVersions.length === 0}
        getOptionKey={option => option.value?.displaySetInstanceUID || String(option.value)}
      />
    </div>
  );
};

type VersionSelectorProps = {
  srVersions: any[];
  selectedSR: any;
  onSRSelection: (sr: any) => Promise<void>;
  loading: boolean;
};

export default VersionSelector;
