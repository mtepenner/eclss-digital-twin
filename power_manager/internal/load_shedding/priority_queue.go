package loadshedding

import (
	"sort"
	"sync"
)

// ModuleEntry represents a module requesting power from the grid.
type ModuleEntry struct {
	Module   string
	Watts    float64
	Priority int  // 1 = highest priority (critical life support), 5 = lowest
	Shed     bool // Whether this module has been shed
}

// PriorityQueue manages power allocation with priority-based load shedding.
// When available power is insufficient, lower-priority modules are shed first.
type PriorityQueue struct {
	mu      sync.RWMutex
	modules map[string]*ModuleEntry
}

// NewPriorityQueue creates a new priority queue for load shedding.
func NewPriorityQueue() *PriorityQueue {
	return &PriorityQueue{
		modules: make(map[string]*ModuleEntry),
	}
}

// Update registers or updates a module's power request and priority.
func (pq *PriorityQueue) Update(module string, watts float64, priority int) {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	if entry, exists := pq.modules[module]; exists {
		entry.Watts = watts
		entry.Priority = priority
	} else {
		pq.modules[module] = &ModuleEntry{
			Module:   module,
			Watts:    watts,
			Priority: priority,
		}
	}
}

// Unshed marks a module as no longer shed (for manual overrides).
func (pq *PriorityQueue) Unshed(module string) {
	pq.mu.Lock()
	defer pq.mu.Unlock()
	if entry, exists := pq.modules[module]; exists {
		entry.Shed = false
	}
}

// TotalDemand returns the sum of all non-shed module requests.
func (pq *PriorityQueue) TotalDemand() float64 {
	pq.mu.RLock()
	defer pq.mu.RUnlock()
	total := 0.0
	for _, entry := range pq.modules {
		if !entry.Shed {
			total += entry.Watts
		}
	}
	return total
}

// Allocate performs the load shedding algorithm.
// It sorts modules by priority (1=highest first) and allocates power
// until the budget is exhausted. Lower-priority modules are shed.
// Returns a map of module->allocated watts and a list of shed module names.
func (pq *PriorityQueue) Allocate(availableW float64) (map[string]float64, []string) {
	pq.mu.Lock()
	defer pq.mu.Unlock()

	// Build sorted list (lower priority number = higher importance)
	sorted := make([]*ModuleEntry, 0, len(pq.modules))
	for _, entry := range pq.modules {
		sorted = append(sorted, entry)
	}
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Priority < sorted[j].Priority
	})

	allocations := make(map[string]float64)
	var shedList []string
	remaining := availableW

	for _, entry := range sorted {
		if remaining >= entry.Watts {
			// Full allocation
			allocations[entry.Module] = entry.Watts
			remaining -= entry.Watts
			entry.Shed = false
		} else if remaining > 0 && entry.Priority <= 2 {
			// Partial allocation for critical systems only
			allocations[entry.Module] = remaining
			remaining = 0
			entry.Shed = false
		} else {
			// Shed this module
			allocations[entry.Module] = 0
			entry.Shed = true
			shedList = append(shedList, entry.Module)
		}
	}

	return allocations, shedList
}

// GetEntries returns a copy of all module entries (for testing).
func (pq *PriorityQueue) GetEntries() []ModuleEntry {
	pq.mu.RLock()
	defer pq.mu.RUnlock()
	entries := make([]ModuleEntry, 0, len(pq.modules))
	for _, e := range pq.modules {
		entries = append(entries, *e)
	}
	return entries
}
