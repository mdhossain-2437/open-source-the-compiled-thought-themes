---
description: Best practices for routing tasks in teamwork_preview to prevent API rate limit exhaustion
trigger: always_on
---

# Teamwork Multi-Agent Routing & Quota Resilience

When delegating tasks to the `teamwork_preview` multi-agent system:

1. **Avoid Unbounded Swarms**: Open-ended prompts trigger full-tree routing that spawns 15-20+ concurrent subagents (explorers, multiple reviewers, challengers, auditors), frequently triggering `RESOURCE_EXHAUSTED (code 429)`.
2. **Focused Team Routing**: For implementation, refactoring, and bug fixes, open the prompt with:
   > "This is a single self-contained fix; keep it small and focused."
   This routes the task to SWE Light (single implementer with sequential adversarial review), delivering 100% test pass rates without blowing API rate limits.
3. **Pre-flight Dependency Validation**: Before delegating to subagents, ensure `package.json` peer dependencies and build tools are validated so subagents do not get stuck in installation loops.
