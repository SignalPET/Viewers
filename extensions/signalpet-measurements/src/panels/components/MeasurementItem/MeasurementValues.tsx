import React from 'react';
import ToolIcon from '../../../utils/toolIcons.utils';

const MeasurementValues = ({ toolName, primaryValue, secondaryValue }: MeasurementValuesProps) => (
  <div className="flex min-h-[36px] w-full items-center gap-3 rounded-b border border-t-0 border-[#0c3b46] px-2 py-1">
    {/* Tool Icon */}
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#092c34] text-white">
      <ToolIcon
        toolName={toolName}
        className="h-4 w-4"
      />
    </div>

    {/* Measurement Values */}
    <div className="flex flex-1 items-start pt-1 text-sm text-[#bfcbce]">
      {primaryValue || secondaryValue ? (
        <div className="flex items-start gap-2">
          {primaryValue && (
            <div className="flex flex-col gap-0.5">
              {primaryValue.split('\n').map((line, index) => (
                <span
                  key={index}
                  className="leading-tight"
                >
                  {line}
                </span>
              ))}
            </div>
          )}
          {secondaryValue && <span>{secondaryValue}</span>}
        </div>
      ) : (
        <span className="italic opacity-60">No measurement data</span>
      )}
    </div>
  </div>
);

type MeasurementValuesProps = {
  toolName?: string;
  primaryValue?: string;
  secondaryValue?: string;
};

export default MeasurementValues;
