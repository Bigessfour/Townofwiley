# Agent definitions for Playwright / QA

This folder holds **two complementary stacks**:

| Files                                                                                                                   | Purpose                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`playwright-test-planner.agent.md`**, **`playwright-test-generator.agent.md`**, **`playwright-test-healer.agent.md`** | Official Playwright CLI agent layout (refresh with **`npm run e2e:init-agents`**). Intended for Copilot + the **`playwright-test`** MCP server (`npx playwright run-test-mcp-server`). |
| **`playwright-planner.agent.md`**, **`playwright-writer.agent.md`**, **`playwright-healer.agent.md`**                   | Town of Wiley–specific prompts: read/search-first planning, minimal edits, and flake repair without requiring browser MCP.                                                             |

Markdown plans from the planner live in [`specs/`](../specs/). Full wiring, Cursor MCP, and typography/a11y specs: [`e2e/README.md`](../e2e/README.md).
