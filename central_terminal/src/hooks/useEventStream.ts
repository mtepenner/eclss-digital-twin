import { useState, useEffect, useRef, useCallback } from 'react';

export interface GridStatus {
  timestamp: string;
  solar_output_w: number;
  battery_pct: number;
  battery_charge_w: number;
  total_available_w: number;
  total_demand_w: number;
  allocations: Record<string, number>;
  shed_modules: string[];
  dust_storm_active: boolean;
}

export interface AirTelemetry {
  module: string;
  sabatier: {
    system: string;
    status: string;
    co2_ppm: number;
    h2_remaining_kg: number;
    water_produced_l: number;
    reactor_temp_c: number;
  };
  electrolysis: {
    system: string;
    status: string;
    o2_cabin_pct: number;
    water_available_l: number;
    o2_produced_kg: number;
    cell_voltage: number;
  };
  power_allocated: number;
}

export interface WaterTelemetry {
  module: string;
  humidity_condenser: {
    system: string;
    status: string;
    cabin_humidity_pct: number;
    water_collected_l: number;
    condenser_temp_c: number;
  };
  urine_processor: {
    system: string;
    status: string;
    urine_tank_l: number;
    clean_water_l: number;
    brine_l: number;
    distiller_temp_c: number;
    hours_paused: number;
  };
  power_allocated: number;
}

export interface EventMessage {
  id: number;
  type: string;
  module?: string;
  message?: string;
  reason?: string;
  status?: string;
  action?: string;
  time?: string;
  timestamp: string;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9090/ws';

export function useEventStream() {
  const [gridStatus, setGridStatus] = useState<GridStatus | null>(null);
  const [airTelemetry, setAirTelemetry] = useState<AirTelemetry | null>(null);
  const [waterTelemetry, setWaterTelemetry] = useState<WaterTelemetry | null>(null);
  const [events, setEvents] = useState<EventMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const eventIdRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected to event bus');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const subject = data.subject as string;
        const payload = data.payload;

        if (subject === 'eclss.power.status') {
          setGridStatus(payload);
        } else if (subject === 'eclss.telemetry.air') {
          setAirTelemetry(payload);
        } else if (subject === 'eclss.telemetry.water') {
          setWaterTelemetry(payload);
        } else if (subject === 'eclss.events') {
          const newEvent: EventMessage = {
            ...payload,
            id: ++eventIdRef.current,
            timestamp: payload.time || new Date().toISOString(),
          };
          setEvents((prev) => [newEvent, ...prev].slice(0, 200));
        }
      } catch (e) {
        console.error('Failed to parse WS message:', e);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 3s...');
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendOverride = useCallback((module: string, action: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          subject: 'eclss.power.override',
          payload: { module, action },
        })
      );
    }
  }, []);

  return { gridStatus, airTelemetry, waterTelemetry, events, sendOverride };
}
