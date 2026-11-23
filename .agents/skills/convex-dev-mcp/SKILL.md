---
name: convex-dev-mcp
description: Turn your Convex app into an MCP server, so your users can use your app from their AI agents. Use this skill whenever working with Convex MCP or related Convex component functionality.
version: 0.1.0-alpha.0
---

> Agents: read this skill fully before writing code that uses Convex MCP. Follow the installation and configuration steps exactly.

# Convex MCP

## Instructions

Convex MCP turns a Convex app into a remote MCP server with OAuth 2.1 authorization built in. Developers define tools using Convex validators, register HTTP routes, and add a consent page; users then paste one URL into Claude, ChatGPT, Cursor, or Claude Code to connect their AI agent to their own data. The component handles the full OAuth 2.1 flow including PKCE, rotating refresh tokens, dynamic client registration, and a device flow for agents that start from a pasted URL, all running inside the Convex deployment with no separate auth provider.

### Installation

```bash
npm install @convex-dev/mcp
```

Current npm version: `@convex-dev/mcp@0.1.0-alpha.0`

## Use cases

- You want to let users connect their Claude or Cursor agent to your app so the agent can read and write their data through tools you control
- You are building a SaaS product and need users to authorize third-party AI agents against their accounts using a standards-compliant OAuth 2.1 flow without standing up a separate auth server
- You want to expose scoped read-only or read-write tool sets so users can grant minimal permissions to an agent from a settings page
- You need CLI or headless agent support and want to issue API key bearer tokens that agents can use with standard MCP clients like claude mcp add
- You want an audit-ready MCP integration where tokens are stored hashed, expired credentials are cleaned up by a cron, and unauthenticated endpoints are rate limited

## How it works

Define an `McpServer` instance in `convex/mcp.ts`, passing tool definitions built with the `tool` helper. Each tool declares Convex validator schemas for `args` and `returns`, which are converted to JSON Schema for MCP clients. Tool handlers receive a verified `user` object containing `userId`, `scopes`, `clientId`, and `connectionId`, and should delegate to internal Convex queries or mutations that enforce ownership the same way the app UI does.

Register routes by calling `mcp.registerRoutes(http)` in `convex/http.ts`. This mounts the MCP endpoint at `/mcp`, plus OAuth 2.1 discovery documents at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`. The component speaks MCP protocol versions 2026-07-28, 2025-11-25, 2025-06-18, and 2025-03-26 over Streamable HTTP on the same endpoint.

Export `getAuthRequest` and `authorize` from the `mcp.api({ getUserId })` call and wire them into a consent page at `consentUrl`. When an agent connects, the user lands on that page, sees which scopes are requested, and approves or denies. For the device flow, where an agent fetches `GET /mcp` and receives instructions, the consent page must also display and validate a `userCode` before calling `authorize`. Users can later list connected agents and revoke them via `listConnections` and `revokeConnection`, and create bearer-token API keys via `createApiKey`.

## When NOT to use

- When a simpler built-in solution exists for your specific use case
- If you are not using Convex as your backend
- When the functionality provided by Convex MCP is not needed

## Resources

- [npm package](https://www.npmjs.com/package/%40convex-dev%2Fmcp)
- [GitHub repository](https://github.com/get-convex/mcp)
- [Live demo](https://github.com/get-convex/mcp/tree/main/example)
- [Convex Components Directory](https://www.convex.dev/components/mcp)
- [Convex documentation](https://docs.convex.dev)

---

## Full implementation reference

The installed package includes the complete workflow, security checklist, and
tool-design guidance:

- `node_modules/@convex-dev/mcp/skills/convex-mcp/SKILL.md`
- `node_modules/@convex-dev/mcp/skills/convex-mcp/references/tool-design.md`
- `node_modules/@convex-dev/mcp/skills/convex-mcp-security/SKILL.md`
- `node_modules/@convex-dev/mcp/skills/convex-mcp-security/references/checklist.md`

Read those before writing the Convex schema, tools, consent page, or security
audit.
