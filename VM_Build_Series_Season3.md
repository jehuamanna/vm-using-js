# Build a Virtual Machine in JavaScript — Season 3
### Systems, Distribution & Persistence
> Theme: *From Language to Operating Environment*

This season evolves your VM from a single-node runtime into a distributed, persistent platform capable of concurrency, networking, and sandboxed execution.

---

## Episode Index

### 51. Persistent Heaps & Snapshots
- Serialize heap + stack to a binary file.
- Reload snapshots to resume programs.
- Deterministic replay for debugging.

### 52. Virtual Filesystem 2.0
- Hierarchical structure: `/home`, `/modules`, `/tmp`.
- File permissions and ownership metadata.
- Mount remote or in-memory `.tvm` modules.

### 53. Networking Layer — Channels & Sockets
- Virtual network subsystem.
- Send/receive messages between VM instances.
- JSON-RPC over channels.

### 54. Concurrency Across Nodes
- Remote fibers: `SPAWN_REMOTE`, `SEND_REMOTE`.
- Distributed scheduler.
- Fault-tolerant supervision tree pattern.

### 55. Security & Sandboxing
- Capability system for I/O, network, and memory access.
- Per-process resource limits (heap, CPU, open handles).
- Execution sandbox for untrusted `.tvm` code.

### 56. Distributed Garbage Collection
- Reference-counted inter-node objects.
- Versioned object IDs for safe deallocation.
- Snapshot coordination protocol.

### 57. Module Repository & Dependency Manager
- Global module registry (`.tvmrc` metadata).
- Semantic versioning & dependency resolution.
- CLI tools: `tvm install`, `tvm publish`.

### 58. Shell Environment & Userland
- Interactive VM shell: list fibers, inspect heap.
- Run user commands inside sandboxed fibers.
- Built-in utilities: `ps`, `memstat`, `ls`, `netstat`.

### 59. Monitoring & Telemetry
- Metrics server for heap, GC, scheduler, and message counts.
- Expose `/metrics` endpoint in JSON or Prometheus format.
- Web dashboard visualization.

### 60. Capstone III — Multi-Node VM Cluster
- Start several VM nodes communicating via network channels.
- Launch tasks across them (map/reduce-style demo).
- Save and restore distributed snapshots.

---

## Learning Outcomes
By the end of Season 3, you’ll be able to:
- Design a persistent, distributed VM runtime.
- Build a virtual filesystem and inter-node networking.
- Manage distributed GC and messaging.
- Run sandboxed, monitored workloads.

---

## Recommended Stop Point
Season 3 turns your VM into a **mini operating system** for executing `.tvm` programs safely and concurrently across nodes.
