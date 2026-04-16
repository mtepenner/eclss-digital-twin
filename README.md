# 🌍 ECLSS Digital Twin

A fully simulated, microservice-based digital twin of an Environmental Control and Life Support System (ECLSS) designed for isolated habitats. It simulates a central event bus, autonomous power management with dynamic load shedding, critical life support subsystems, and a real-time monitoring dashboard.

## 📑 Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Technologies Used](#-technologies-used)
- [Installation](#-installation)
- [Usage](#-usage)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features
* **Event-Driven Backbone:** Utilizes NATS (or RabbitMQ) for high-throughput pub/sub messaging across all habitat modules.
* **Autonomous Grid Controller:** A Go-based power manager that simulates solar array insolation drops (like Martian dust storms) and battery bank states.
* **Priority Load Shedding:** Critical logic that automatically decides which modules are cut when power is low via a priority queue.
* **Air Revitalization (Priority 1):** A Python service simulating Sabatier reactors (combining CO2 and H2 into water and methane) and electrolysis, requesting 1500W of grid power.
* **Water Recovery (Priority 2):** A Python service handling cabin humidity condensation and urine processing. It requests 2000W of power but can be safely paused for 48 hours during power shortages.
* **Habitat Dashboard:** A React and TypeScript interface featuring live resource gauges, a scrolling event log of autonomous decisions, and manual system overrides.
* **Visual Power Routing:** Uses `react-flow-renderer` to display a node-based graph of power flowing to active modules.

## 🏗️ Architecture
The digital twin mimics physical isolation by containerizing distinct systems:
1. **Event Bus:** The central nervous system handling telemetry and requests.
2. **Power Manager (Go):** The high-availability grid controller.
3. **Air Module (Python):** O2 generation and CO2 scrubbing.
4. **Water Module (Python):** Brine and humidity processing.
5. **Central Terminal (React):** The mission control dashboard connecting to the event stream via WebSockets.

## 🛠️ Technologies Used
* **Core Logic:** Go (Golang), Python
* **Frontend UI:** React, TypeScript, WebSockets, `react-flow-renderer`
* **Message Broker:** NATS / RabbitMQ
* **Infrastructure & Deployment:** Docker, Docker Compose, Kubernetes (K8s), GitHub Actions

## 💻 Installation

### Prerequisites
* Docker and Docker Compose installed.
* (Optional) A Kubernetes environment to utilize the provided K8s manifests.

### Setup Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/mtepenner/eclss-digital-twin.git
   cd eclss-digital-twin
   ```
2. Boot the entire simulated base locally using Docker Compose:
   ```bash
   docker-compose up --build -d
   ```

## 🎮 Usage
Once the cluster is initialized:
1. Navigate to the Central Terminal in your browser (typically `http://localhost:3000`).
2. Monitor the **Resource Gauges** for real-time levels of O2, CO2, Clean Water, and Battery percentage.
3. Watch the **Power Grid Graph** to see dynamic allocations. Try triggering a simulated solar drop to watch the load shedding logic in action.
4. Monitor the **Event Log** to understand the autonomous grid decisions being made.
5. Use the **System Overrides** to manually force-restart modules that were killed by the power manager.

## 🤝 Contributing
Contributions are highly encouraged. When updating the autonomous logic, please ensure that your changes pass the unit tests for the power shedding logic defined in `.github/workflows/test-load-balancer.yml`.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/NewSubsystem`)
3. Commit your Changes (`git commit -m 'Add hydroponics module'`)
4. Push to the Branch (`git push origin feature/NewSubsystem`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
