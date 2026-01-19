# Mellivora Mind Studio - Documentation

## Quick Navigation

| Document | Description | Read When |
|----------|-------------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, layers, daily workflow | Understanding overall design |
| [MODULES.md](./MODULES.md) | Complete module and function list | Looking up specific features |
| [TRADE_ANALYSIS.md](./TRADE_ANALYSIS.md) | Order/Deal/Position/Account details | Working on trading module |
| [PLUGINS.md](./PLUGINS.md) | Plugin interface specification | Developing new plugins |

---

## Multi-Window Parallel Development

### Approach 1: Task-Based Splitting

```
Window 1 (Data Engine)          Window 2 (Risk Engine)         Window 3 (Trade Engine)
========================        ========================        ========================
Working on:                     Working on:                     Working on:
- DataProvider interface        - Factor model                  - Order management
- Wind plugin                   - Covariance estimation         - Deal processing
- Data update service           - Risk decomposition            - Position tracking

Read docs:                      Read docs:                      Read docs:
- MODULES.md Section 1          - MODULES.md Section 2          - TRADE_ANALYSIS.md
- PLUGINS.md                    - ARCHITECTURE.md               - PLUGINS.md
```

### Approach 2: Layer-Based Splitting

```
Window 1 (Plugin Layer)         Window 2 (Core Engine)         Window 3 (Infrastructure)
========================        ========================        ========================
- Data source plugins           - Business logic                - Scheduler
- Trade channel plugins         - Engine implementations        - Config center
- Plugin registry               - Cross-engine coordination     - Storage layer

All windows share:              All windows share:              All windows share:
docs/PLUGINS.md                 docs/MODULES.md                 docs/ARCHITECTURE.md
```

---

## Commands for Each Window

### Start a New Window

```bash
# Window 1: Data Engine
cd /Users/wangchao/workspace/niankong/mellivora-mind-studio
cat docs/README.md  # Quick overview
cat docs/MODULES.md | head -200  # Data engine section

# Window 2: Trade Engine  
cd /Users/wangchao/workspace/niankong/mellivora-mind-studio
cat docs/TRADE_ANALYSIS.md  # Full trade analysis spec

# Window 3: Plugin Development
cd /Users/wangchao/workspace/niankong/mellivora-mind-studio
cat docs/PLUGINS.md  # Plugin interface spec
```

### Share Context Across Windows

Each window can read the same docs to understand:
1. Overall architecture: `docs/ARCHITECTURE.md`
2. Module responsibilities: `docs/MODULES.md`
3. Interface contracts: `docs/PLUGINS.md`
4. Trading specifics: `docs/TRADE_ANALYSIS.md`

---

## Document Update Protocol

When making architectural decisions:

1. Update relevant doc in `docs/`
2. Other windows can re-read to sync
3. Use git commits to track changes

```bash
# After updating docs
git add docs/
git commit -m "docs: update [MODULE] specification"

# Other windows can pull
git pull
```

---

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Architecture Design | Done | docs/ARCHITECTURE.md |
| Module Specification | Done | docs/MODULES.md |
| Trade Analysis Design | Done | docs/TRADE_ANALYSIS.md |
| Plugin Specification | Done | docs/PLUGINS.md |
| Implementation | Not Started | - |

---

## Next Steps

1. [ ] Initialize project structure
2. [ ] Set up development environment
3. [ ] Implement infrastructure layer
4. [ ] Implement plugin interfaces
5. [ ] Implement first data plugin (Wind)
6. [ ] Implement first trade plugin (Simulate)
7. [ ] Implement core engines
8. [ ] Integration testing
9. [ ] Migration from legacy system
