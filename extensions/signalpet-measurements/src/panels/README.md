# SignalPET Measurements Panel

This directory contains the modular components for the SignalPET Measurements Panel.

## Structure

```
panels/
├── SignalPETMeasurementsPanel.tsx    # Main panel component
├── components/                       # Reusable UI components
│   ├── index.ts                     # Component exports
│   ├── MeasurementHeader.tsx        # Header with SR selector and export
│   ├── MeasurementItem.tsx          # Individual measurement card
│   └── MeasurementsBody.tsx         # Container for measurement list
├── types/                           # TypeScript interfaces
│   └── index.ts                     # Shared type definitions
└── README.md                        # This file
```

## Components

### MeasurementHeader
- Displays panel title and export button
- Contains SR version selector dropdown
- Handles SR selection and save operations

### MeasurementItem
- Individual measurement card with top/bottom layout
- Inline editing functionality for measurement names
- Visibility toggle and delete actions
- Displays measurement values horizontally

### MeasurementsBody
- Container component for all measurements
- Handles empty state display
- Maps measurements to MeasurementItem components

## Features

- **Inline Editing**: Single-click measurement names to edit inline
- **SR Version Management**: Select between different structured report versions
- **Real-time Updates**: Automatic refresh when measurements change
- **OHIF Integration**: Uses OHIF theming and command system
- **TypeScript**: Full type safety with shared interfaces

## Usage

```tsx
import SignalPETMeasurementsPanel from './SignalPETMeasurementsPanel';

<SignalPETMeasurementsPanel
  servicesManager={servicesManager}
  commandsManager={commandsManager}
/>
```
