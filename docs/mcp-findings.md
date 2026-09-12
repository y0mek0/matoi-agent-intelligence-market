# MCP findings

## Found packages

### Hedera

`@hashgraph/hedera-agent-kit-mcp` exists and is published. It provides `HederaMCPToolkit`, but it is a library rather than a plug-and-play `npx` MCP server.

### x402

`@x402/mcp` exists and is published. It has no useful npm README and no obvious executable bin in package metadata.

## Decision

Do not block MVP on MCP. Build the app with direct SDK/API adapters first.

## Stretch

Expose a project-owned MCP server later with tools such as:

- `getHederaBalance`
- `createHcsAuditMessage`
- `quoteTelegramPulse`
- `requestAgentService`
- `simulateX402Payment`
