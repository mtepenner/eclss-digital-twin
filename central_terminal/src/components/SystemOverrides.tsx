import React from 'react';
import { GridStatus } from '../hooks/useEventStream';

interface Props {
  gridStatus: GridStatus | null;
  onOverride: (module: string, action: string) => void;
}

export const SystemOverrides: React.FC<Props> = ({ gridStatus, onOverride }) => {
  if (!gridStatus) {
    return <div style={{ color: '#555', textAlign: 'center', paddingTop: 80 }}>Waiting for grid data...</div>;
  }

  const modules = Object.keys(gridStatus.allocations || {});
  const shed = gridStatus.shed_modules || [];

  return (
    <div style={styles.container}>
      <p style={styles.description}>
        Manual switches to force-restart or kill modules managed by the power grid.
      </p>
      <div style={styles.moduleList}>
        {modules.map((mod) => {
          const isShed = shed.includes(mod);
          const watts = gridStatus.allocations[mod] || 0;
          const displayName = mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <div key={mod} style={styles.moduleRow}>
              <div style={styles.moduleInfo}>
                <span style={{ color: isShed ? '#ff4444' : '#44ff44' }}>
                  {isShed ? '⏹' : '▶'}
                </span>
                <span style={styles.moduleName}>{displayName}</span>
                <span style={styles.moduleWatts}>{watts.toFixed(0)}W</span>
              </div>
              <div style={styles.buttons}>
                {isShed ? (
                  <button
                    style={styles.restartBtn}
                    onClick={() => onOverride(mod, 'restart')}
                  >
                    Force Restart
                  </button>
                ) : (
                  <button
                    style={styles.killBtn}
                    onClick={() => onOverride(mod, 'kill')}
                  >
                    Kill
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modules.length === 0 && (
        <div style={{ color: '#555', textAlign: 'center', paddingTop: 40 }}>
          No modules registered yet.
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  description: {
    color: '#666',
    fontSize: '12px',
    margin: 0,
  },
  moduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  moduleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #333',
  },
  moduleInfo: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  moduleName: {
    fontWeight: 'bold',
    fontSize: '13px',
  },
  moduleWatts: {
    color: '#888',
    fontSize: '12px',
  },
  buttons: {
    display: 'flex',
    gap: '6px',
  },
  restartBtn: {
    backgroundColor: '#1a3a1a',
    color: '#44ff44',
    border: '1px solid #44ff44',
    borderRadius: 4,
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
    fontSize: '12px',
  },
  killBtn: {
    backgroundColor: '#3a1a1a',
    color: '#ff4444',
    border: '1px solid #ff4444',
    borderRadius: 4,
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
    fontSize: '12px',
  },
};
