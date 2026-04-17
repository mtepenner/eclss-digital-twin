package loadshedding

import (
	"testing"
)

func TestAllocate_AllModulesFit(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("air", 1500, 1)
	pq.Update("water", 2000, 2)

	alloc, shed := pq.Allocate(5000)

	if len(shed) != 0 {
		t.Errorf("Expected no shed modules, got %v", shed)
	}
	if alloc["air"] != 1500 {
		t.Errorf("Expected air=1500, got %.0f", alloc["air"])
	}
	if alloc["water"] != 2000 {
		t.Errorf("Expected water=2000, got %.0f", alloc["water"])
	}
}

func TestAllocate_ShedLowPriority(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("air", 1500, 1)   // Critical - should be kept
	pq.Update("water", 2000, 2) // Important - should be shed
	pq.Update("lights", 500, 4) // Low priority - should be shed

	alloc, shed := pq.Allocate(2000)

	if alloc["air"] != 1500 {
		t.Errorf("Expected air to get full 1500W, got %.0f", alloc["air"])
	}
	if alloc["lights"] != 0 {
		t.Errorf("Expected lights to be shed, got %.0f", alloc["lights"])
	}
	if len(shed) < 1 {
		t.Errorf("Expected at least 1 shed module, got %d", len(shed))
	}
}

func TestAllocate_PartialForCritical(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("air", 1500, 1)

	alloc, shed := pq.Allocate(800)

	// Critical system (priority 1) should get partial allocation
	if alloc["air"] != 800 {
		t.Errorf("Expected air to get partial 800W, got %.0f", alloc["air"])
	}
	if len(shed) != 0 {
		t.Errorf("Expected no shed for partial critical, got %v", shed)
	}
}

func TestAllocate_ZeroPower(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("air", 1500, 1)
	pq.Update("water", 2000, 2)

	_, shed := pq.Allocate(0)

	if len(shed) != 2 {
		t.Errorf("Expected 2 shed modules with 0 power, got %d", len(shed))
	}
}

func TestPriorityOrder(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("lights", 500, 4)
	pq.Update("air", 1500, 1)
	pq.Update("water", 2000, 2)

	// With only 1600W, air (priority 1) should be fully powered
	// water and lights should be shed
	alloc, shed := pq.Allocate(1600)

	if alloc["air"] != 1500 {
		t.Errorf("Expected air=1500 (highest priority), got %.0f", alloc["air"])
	}
	if alloc["lights"] != 0 {
		t.Errorf("Expected lights=0 (lowest priority), got %.0f", alloc["lights"])
	}
	if len(shed) < 1 {
		t.Errorf("Expected shed modules, got none")
	}
}

func TestUnshed(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("water", 2000, 2)

	// Shed it first
	pq.Allocate(0)

	entries := pq.GetEntries()
	for _, e := range entries {
		if e.Module == "water" && !e.Shed {
			t.Error("Expected water to be shed")
		}
	}

	// Unshed it
	pq.Unshed("water")
	entries = pq.GetEntries()
	for _, e := range entries {
		if e.Module == "water" && e.Shed {
			t.Error("Expected water to be unshed after override")
		}
	}
}

func TestTotalDemand(t *testing.T) {
	pq := NewPriorityQueue()
	pq.Update("air", 1500, 1)
	pq.Update("water", 2000, 2)

	demand := pq.TotalDemand()
	if demand != 3500 {
		t.Errorf("Expected total demand 3500, got %.0f", demand)
	}
}
