import React from 'react';
import { SignalPETMeasurementsPanel } from './panels';

function getPanelModule({ commandsManager, extensionManager, servicesManager }: any): any[] {
  console.log('[SignalPET] Panel module loading - registering trackedMeasurements panel');
  return [
    {
      name: 'trackedMeasurements',
      iconName: 'tab-linear',
      iconLabel: 'Measure',
      label: 'Measurements',
      component: (props: any) => {
        console.log(
          '[SignalPET] Rendering SignalPETMeasurementsPanel component with props:',
          props
        );
        return (
          <SignalPETMeasurementsPanel
            {...props}
            key="signalpet-measurements-panel"
            commandsManager={commandsManager}
            extensionManager={extensionManager}
            servicesManager={servicesManager}
          />
        );
      },
    },
  ];
}

export default getPanelModule;
