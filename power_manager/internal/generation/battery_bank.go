package generation

import "math"

// BatteryBank simulates a battery storage system with state-of-charge tracking.
type BatteryBank struct {
	capacityWh    float64 // Total capacity in watt-hours
	currentWh     float64 // Current charge in watt-hours
	maxDischargeW float64 // Max discharge rate
	maxChargeW    float64 // Max charge rate
}

// NewBatteryBank creates a new battery bank.
// capacityWh is total capacity; initialChargePct is 0.0-1.0.
func NewBatteryBank(capacityWh float64, initialChargePct float64) *BatteryBank {
	return &BatteryBank{
		capacityWh:    capacityWh,
		currentWh:     capacityWh * initialChargePct,
		maxDischargeW: 3000, // 3kW max discharge
		maxChargeW:    2000, // 2kW max charge
	}
}

// Discharge draws power from the battery. Returns actual watts delivered.
// durationSec is the time period for this discharge.
func (b *BatteryBank) Discharge(requestedW float64, durationSec float64) float64 {
	// Clamp to max discharge rate
	actualW := math.Min(requestedW, b.maxDischargeW)

	// Calculate energy needed
	energyNeeded := actualW * (durationSec / 3600.0) // Convert to Wh

	// Clamp to available energy (keep 5% reserve)
	reserve := b.capacityWh * 0.05
	available := b.currentWh - reserve
	if available <= 0 {
		return 0
	}
	if energyNeeded > available {
		energyNeeded = available
		actualW = energyNeeded / (durationSec / 3600.0)
	}

	b.currentWh -= energyNeeded
	return actualW
}

// Charge adds energy to the battery from surplus solar power.
func (b *BatteryBank) Charge(surplusW float64, durationSec float64) {
	actualW := math.Min(surplusW, b.maxChargeW)
	energy := actualW * (durationSec / 3600.0)
	b.currentWh = math.Min(b.currentWh+energy, b.capacityWh)
}

// StateOfCharge returns the battery charge as a fraction (0.0 to 1.0).
func (b *BatteryBank) StateOfCharge() float64 {
	return b.currentWh / b.capacityWh
}
