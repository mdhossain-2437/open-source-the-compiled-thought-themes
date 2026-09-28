---
description: Architectural and engineering standards for VS Code theme extensions
trigger: always_on
---

# VS Code Theme Extension Engineering Invariants

1. **Multi-Index Theme Identity Resolution**:
   - Themes have 3 conflicting identity layers: `package.json contributes.themes[].label`, internal JSON `"name"`, and relative disk `path`.
   - Never query solely by filename or internal name. Always maintain a multi-index lookup map supporting label, filename, internal name, and path variants with case-insensitive normalization to prevent `THEME_NOT_FOUND`.

2. **Dual Syntax Token Coverage**:
   - Never rely exclusively on `semanticTokenColors`.
   - Always include comprehensive TextMate `tokenColors` rules (keywords, functions, strings, types, comments, operators) as fallbacks for non-semantic languages and editor contexts.

3. **Accessibility & Contrast Invariants**:
   - Every theme must satisfy WCAG 2.1 AA contrast standards (minimum 4.5:1 for normal text and syntax tokens against editor background).

4. **Resource Management & Timer Safety**:
   - Any background cache interval (e.g. LRU TTL cleanup) must retain a disposable timer handle and unreference timers (`timer.unref()`), ensuring complete teardown inside `deactivate()`.

5. **Package Boundary Defense**:
   - `.vscodeignore` must strictly exclude test suites (`tests/`, `__tests__/`), mocks, coverage reports, scratch files, and agent directories (`.agents/`) to keep `.vsix` packages lightweight and leak-free.
