package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/mtepenner/eclss-digital-twin/power_manager/internal/generation"
	loadshedding "github.com/mtepenner/eclss-digital-twin/power_manager/internal/load_shedding"
	"github.com/nats-io/nats.go"
)

// PowerRequest represents an incoming power request from a module.
type PowerRequest struct {
	Module   string  `json:"module"`
	Watts    float64 `json:"watts"`
	Priority int     `json:"priority"` // 1 = highest (life support), 5 = lowest
}

// GridStatus is published periodically so all modules and the dashboard know the grid state.
type GridStatus struct {
	Timestamp       string             `json:"timestamp"`
	SolarOutputW    float64            `json:"solar_output_w"`
	BatteryPct      float64            `json:"battery_pct"`
	BatteryChargeW  float64            `json:"battery_charge_w"`
	TotalAvailableW float64            `json:"total_available_w"`
	TotalDemandW    float64            `json:"total_demand_w"`
	Allocations     map[string]float64 `json:"allocations"`
	ShedModules     []string           `json:"shed_modules"`
	DustStormActive bool               `json:"dust_storm_active"`
}

func main() {
	natsURL := os.Getenv("NATS_URL")
	if natsURL == "" {
		natsURL = "nats://localhost:4222"
	}

	// Connect to NATS with retry
	var nc *nats.Conn
	var err error
	for i := 0; i < 30; i++ {
		nc, err = nats.Connect(natsURL)
		if err == nil {
			break
		}
		log.Printf("Waiting for NATS... attempt %d/30", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to NATS: %v", err)
	}
	defer nc.Close()
	log.Println("Connected to NATS at", natsURL)

	solar := generation.NewSolarArrays(4000.0)          // 4kW peak
	battery := generation.NewBatteryBank(20000.0, 0.85) // 20kWh, 85% initial charge
	pq := loadshedding.NewPriorityQueue()

	// Subscribe to power requests from modules
	nc.Subscribe("eclss.power.request", func(msg *nats.Msg) {
		var req PowerRequest
		if err := json.Unmarshal(msg.Data, &req); err != nil {
			log.Printf("Invalid power request: %v", err)
			return
		}
		log.Printf("Power request: module=%s watts=%.0f priority=%d", req.Module, req.Watts, req.Priority)
		pq.Update(req.Module, req.Watts, req.Priority)
	})

	// Subscribe to manual override commands from the dashboard
	nc.Subscribe("eclss.power.override", func(msg *nats.Msg) {
		var override struct {
			Module string `json:"module"`
			Action string `json:"action"` // "restart" or "kill"
		}
		if err := json.Unmarshal(msg.Data, &override); err != nil {
			return
		}
		log.Printf("Override received: %s -> %s", override.Module, override.Action)
		if override.Action == "restart" {
			pq.Unshed(override.Module)
		}
		event, _ := json.Marshal(map[string]string{
			"type":   "override",
			"module": override.Module,
			"action": override.Action,
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
		nc.Publish("eclss.events", event)
	})

	// Health endpoint for K8s liveness probes
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "ok")
	})
	go http.ListenAndServe(":8080", nil)

	// Main control loop: runs every 2 seconds
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Power Manager grid controller running...")

	for {
		select {
		case <-ticker.C:
			// Update solar simulation (including dust storm events)
			solar.Tick()
			solarOutput := solar.CurrentOutput()

			// Battery provides supplemental power (discharge if solar is low, charge if surplus)
			totalDemand := pq.TotalDemand()
			surplus := solarOutput - totalDemand

			var batteryContribution float64
			if surplus < 0 {
				// Need battery power
				batteryContribution = battery.Discharge(-surplus, 2.0)
			} else {
				// Charge battery with surplus
				battery.Charge(surplus, 2.0)
			}

			totalAvailable := solarOutput + batteryContribution

			// Run load shedding algorithm
			allocations, shedList := pq.Allocate(totalAvailable)

			// Publish grid status
			status := GridStatus{
				Timestamp:       time.Now().UTC().Format(time.RFC3339),
				SolarOutputW:    solarOutput,
				BatteryPct:      battery.StateOfCharge(),
				BatteryChargeW:  batteryContribution,
				TotalAvailableW: totalAvailable,
				TotalDemandW:    totalDemand,
				Allocations:     allocations,
				ShedModules:     shedList,
				DustStormActive: solar.DustStormActive(),
			}
			data, _ := json.Marshal(status)
			nc.Publish("eclss.power.status", data)

			// Publish individual allocation responses
			for module, watts := range allocations {
				resp, _ := json.Marshal(map[string]interface{}{
					"module":    module,
					"allocated": watts,
					"shed":      contains(shedList, module),
				})
				nc.Publish(fmt.Sprintf("eclss.power.allocation.%s", module), resp)
			}

			// Publish events for shed decisions
			for _, mod := range shedList {
				event, _ := json.Marshal(map[string]string{
					"type":   "load_shed",
					"module": mod,
					"reason": fmt.Sprintf("Insufficient power: available=%.0fW demand=%.0fW", totalAvailable, totalDemand),
					"time":   time.Now().UTC().Format(time.RFC3339),
				})
				nc.Publish("eclss.events", event)
			}

			if solar.DustStormActive() {
				event, _ := json.Marshal(map[string]string{
					"type":   "dust_storm",
					"status": "active",
					"solar":  fmt.Sprintf("%.0f", solarOutput),
					"time":   time.Now().UTC().Format(time.RFC3339),
				})
				nc.Publish("eclss.events", event)
			}

			log.Printf("Grid: solar=%.0fW battery=%.1f%% available=%.0fW demand=%.0fW shed=%v",
				solarOutput, battery.StateOfCharge()*100, totalAvailable, totalDemand, shedList)

		case <-sigCh:
			log.Println("Shutting down power manager...")
			return
		}
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
