import React from 'react';
import { GridStatus, AirTelemetry, WaterTelemetry } from '../hooks/useEventStream';

interface Props {
  gridStatus: GridStatus | null;
  airTelemetry: AirTelemetry | null;
  waterTelemetry: WaterTelemetry | null;
}

interface GaugeData {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

export const ResourceGauges: React.FC<Props> = ({ gridStatus, airTelemetry, waterTelemetry }) => {
  const gauges: GaugeData[] = [
    {
      label: 'O₂ Level',
      value: airTelemetry?.electrolysis?.o2_cabin_pct ?? 21,
      unit: '%',
      min: 15,
      max: 25,
      warningLow: 19.5,
      criticalLow: 18,
    },
    {
      label: 'CO₂ Level',
      value: airTelemetry?.sabatier?.co2_ppm ?? 400,
      unit: 'ppm',
      min: 0,
      max: 10000,
      warningHigh: 2000,
      criticalHigh: 5000,
    },
    {
      label: 'Clean Water',
      value:
        (waterTelemetry?.humidity_condenser?.water_collected_l ?? 0) +
        (waterTelemetry?.urine_processor?.clean_water_l ?? 0),
      unit: 'L',
      min: 0,
      max: 500,
      warningLow: 50,
      criticalLow: 20,
    },
    {
      label: 'Battery',
      value: (gridStatus?.battery_pct ?? 0.85) * 100,
      unit: '%',
      min: 0,
      max: 100,
      warningLow: 30,
      criticalLow: 10,
    },
    {
      label: 'Cabin Humidity',
      value: waterTelemetry?.humidity_condenser?.cabin_humidity_pct ?? 50,
      unit: '%',
      min: 20,
      max: 95,
      warningHigh: 75,
      criticalHigh: 85,
    },
    {
      label: 'Solar Output',
      value: gridStatus?.solar_output_w ?? 0,
      unit: 'W',
      min: 0,
      max: 5000,
      warningLow: 1500,
      criticalLow: 500,
    },
  ];

  return (
    <div style={styles.grid}>
      {gauges.map((g) => (
        <Gauge key={g.label} {...g} />
      ))}
    </div>
  );
};

const Gauge: React.FC<GaugeData> = ({
  label, value, unit, min, max, warningLow, warningHigh, criticalLow, criticalHigh,
}) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  let color = '#44ff44';
  if (
    (criticalLow !== undefined && value < criticalLow) ||
    (criticalHigh !== undefined && value > criticalHigh)
  ) {
    color = '#ff4444';
  } else if (
    (warningLow !== undefined && value < warningLow) ||
    (warningHigh !== undefined && value > warningHigh)
  ) {
    color = '#ffaa00';
  }

  return (
    <div style={styles.gauge}>
      <div style={styles.gaugeLabel}>{label}</div>
      <div style={styles.barContainer}>
        <div
          style={{
            ...styles.bar,
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div style={{ ...styles.gaugeValue, color }}>
        {typeof value === 'number' ? value.toFixed(1) : value} {unit}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  gauge: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: '10px',
    border: '1px solid #333',
  },
  gaugeLabel: {
    fontSize: '11px',
    color: '#888',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  barContainer: {
    height: '8px',
    backgroundColor: '#222',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  bar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.5s ease, background-color 0.3s ease',
  },
  gaugeValue: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
};
