import React, { useRef, useEffect } from 'react';
import { EventMessage } from '../hooks/useEventStream';

interface Props {
  events: EventMessage[];
}

export const EventLog: React.FC<Props> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'load_shed': return '⚡';
      case 'dust_storm': return '🌪';
      case 'override': return '🔧';
      default: return '📡';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'critical': return '#ff4444';
      case 'warning': return '#ffaa00';
      case 'load_shed': return '#ff6644';
      case 'dust_storm': return '#cc8800';
      case 'override': return '#44aaff';
      default: return '#888';
    }
  };

  return (
    <div ref={containerRef} style={styles.container}>
      {events.length === 0 && (
        <div style={styles.empty}>Waiting for events...</div>
      )}
      {events.map((evt) => (
        <div key={evt.id} style={styles.entry}>
          <span style={styles.icon}>{getIcon(evt.type)}</span>
          <span style={styles.time}>
            {new Date(evt.timestamp).toLocaleTimeString()}
          </span>
          <span style={{ ...styles.type, color: getColor(evt.type) }}>
            [{evt.type.toUpperCase()}]
          </span>
          <span style={styles.module}>
            {evt.module && `[${evt.module}]`}
          </span>
          <span style={styles.message}>
            {evt.message || evt.reason || evt.action || evt.status || ''}
          </span>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '250px',
    overflowY: 'auto',
    fontFamily: "'Courier New', monospace",
    fontSize: '12px',
    lineHeight: '1.6',
  },
  empty: {
    color: '#555',
    textAlign: 'center',
    paddingTop: '80px',
  },
  entry: {
    display: 'flex',
    gap: '6px',
    borderBottom: '1px solid #1a1a1a',
    paddingBottom: '2px',
  },
  icon: {
    flexShrink: 0,
  },
  time: {
    color: '#555',
    flexShrink: 0,
  },
  type: {
    fontWeight: 'bold',
    flexShrink: 0,
  },
  module: {
    color: '#6688aa',
    flexShrink: 0,
  },
  message: {
    color: '#ccc',
  },
};
