import React from 'react';
import { ExternalLinkIcon } from '../ui/icons';

const HeaderTitle = () => (
  <div className="flex w-full items-center justify-between">
    <h2 className="text-sm font-normal text-white">Measurements</h2>

    <button className="flex items-center gap-2 text-xs text-white hover:text-[#b2bdc1]">
      <span>Learn more</span>
      <ExternalLinkIcon className="h-3 w-3" />
    </button>
  </div>
);

export default HeaderTitle;
