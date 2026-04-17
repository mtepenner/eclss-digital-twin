package generation

import (
	"math"
	"math/rand"
	"time"
)

// SolarArrays simulates solar panel output including dust storm degradation.
type SolarArrays struct {
	peakOutputW     float64
	currentOutputW  float64
	dustStorm       bool
	dustStormStart  time.Time
	dustStormDurSec float64
	tickCount       int
	rng             *rand.Rand
}

// NewSolarArrays creates a new solar array simulator with the given peak wattage.
func NewSolarArrays(peakW float64) *SolarArrays {
	return &SolarArrays{
		peakOutputW:    peakW,
		currentOutputW: peakW,
		rng:            rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Tick advances the simulation by one step. Randomly triggers dust storms
// that reduce solar output by 40-80%.
func (s *SolarArrays) Tick() {
	s.tickCount++

	// Check if current dust storm has ended
	if s.dustStorm {
		elapsed := time.Since(s.dustStormStart).Seconds()
		if elapsed >= s.dustStormDurSec {
			s.dustStorm = false
			s.currentOutputW = s.peakOutputW
		} else {
			// Gradually worsen then recover (bell curve)
			progress := elapsed / s.dustStormDurSec
			severity := math.Sin(progress * math.Pi) // 0→1→0
			reduction := 0.4 + 0.4*severity          // 40% to 80% reduction
			s.currentOutputW = s.peakOutputW * (1 - reduction)
		}
		return
	}

	// Random chance of dust storm every tick (~2% chance per 2-second tick)
	if s.rng.Float64() < 0.02 {
		s.dustStorm = true
		s.dustStormStart = time.Now()
		s.dustStormDurSec = 20 + s.rng.Float64()*40 // 20-60 seconds
		s.currentOutputW = s.peakOutputW * 0.6      // Immediate 40% drop
		return
	}

	// Normal small fluctuations (±5%)
	jitter := 1.0 + (s.rng.Float64()-0.5)*0.1
	s.currentOutputW = s.peakOutputW * jitter
}

// CurrentOutput returns the current solar output in watts.
func (s *SolarArrays) CurrentOutput() float64 {
	return s.currentOutputW
}

// DustStormActive returns true if a dust storm is currently affecting output.
func (s *SolarArrays) DustStormActive() bool {
	return s.dustStorm
}
