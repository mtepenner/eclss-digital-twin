import React from 'react';
import { PowerGridGraph } from './components/PowerGridGraph';
import { ResourceGauges } from './components/ResourceGauges';
import { EventLog } from './components/EventLog';
import { SystemOverrides } from './components/SystemOverrides';
import { useEventStream } from './hooks/useEventStream';

const App: React.FC = () => {
  const { gridStatus, airTelemetry, waterTelemetry, events, sendOverride } =
    useEventStream();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🌍 ECLSS Central Terminal</h1>
        <div style={styles.statusBadge}>
          {gridStatus ? (
            <span style={{ color: gridStatus.dust_storm_active ? '#ff4444' : '#44ff44' }}>
              {gridStatus.dust_storm_active ? '⚠ DUST STORM ACTIVE' : '● NOMINAL'}
            </span>
          ) : (
            <span style={{ color: '#ffaa00' }}>◌ CONNECTING...</span>
          )}
        </div>
      </header>

      <div style={styles.dashboard}>
        <div style={styles.topRow}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Power Grid</h2>
            <PowerGridGraph gridStatus={gridStatus} />
          </div>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Resource Gauges</h2>
            <ResourceGauges
              gridStatus={gridStatus}
              airTelemetry={airTelemetry}
              waterTelemetry={waterTelemetry}
            />
          </div>
        </div>

        <div style={styles.bottomRow}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Event Log</h2>
            <EventLog events={events} />
          </div>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>System Overrides</h2>
            <SystemOverrides
              gridStatus={gridStatus}
              onOverride={sendOverride}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#e0e0e0',
    fontFamily: "'Courier New', monospace",
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #333',
    paddingBottom: '12px',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    color: '#00ccff',
  },
  statusBadge: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  topRow: {
    display: 'flex',
    gap: '16px',
    flex: 1,
  },
  bottomRow: {
    display: 'flex',
    gap: '16px',
    flex: 1,
  },
  panel: {
    flex: 1,
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '16px',
    minHeight: '300px',
  },
  panelTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
  },
};

export default App;
