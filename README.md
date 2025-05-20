# nr-mcp: New Relic MCP Server

MCP server allowing AI agents to query New Relic for debugging incidents.

- [For Users](#for-users): How to use nr-mcp with your AI assistants
- [For Developers](#for-developers): How to contribute to nr-mcp
- [Documentation](#documentation): Detailed documentation on tools and resources

---

# For Users

This section is for users who want to use the nr-mcp server with their AI assistants.

For detailed information on available tools and resources, see the [Documentation](#documentation) section.

## Prerequisites

- New Relic account with:
  - API key
  - Account ID
  - Region (US or EU)

## Quick Start

To connect an AI assistant to nr-mcp, add the following configuration to your MCP client setup:

### Docker Connection

```json
{
  "mcpServers": {
    "newrelic": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "NEW_RELIC_API_KEY",
        "-e",
        "NEW_RELIC_ACCOUNT_ID",
        "-e",
        "NEW_RELIC_REGION",
        "danielng123/nr-mcp:latest"
      ],
      "env": {
        "NEW_RELIC_API_KEY": "<YOUR_API_KEY>",
        "NEW_RELIC_ACCOUNT_ID": "<YOUR_ACCOUNT_ID>",
        "NEW_RELIC_REGION": "US"
      }
    }
  }
}
```

---

# For Developers

This section is for developers who want to contribute to the nr-mcp project.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/ducduyn31/nr-mcp.git
cd nr-mcp

# Install dependencies
pnpm install

# Build the project
pnpm build
```

The MCP Inspector is a powerful tool for debugging and testing MCP servers and clients.
We've added a streamlined development workflow that automatically watches for file changes, rebuilds the project, and runs the inspector:

```bash
# Start the development workflow
pnpm dev
```

This command:
1. Watches the `src` directory for changes to `.ts` files
2. Automatically rebuilds the project when changes are detected
3. Runs the MCP Inspector in parallel

### Manual Testing

You can also run these commands separately:

```bash
# Watch for file changes and rebuild
pnpm watch

# Start the inspector
pnpm inspector
```

### Using the Inspector

Once the inspector is running:

1. Open the web interface (typically at http://localhost:5173)
2. Select "Connect to Server"
3. Choose "Stdio" as the transport type
4. Enter the command to start your server: `node dist/index.js`
5. Click "Connect"

After connecting, you can:
- Browse available tools
- Make test calls with custom parameters
- View responses and any errors
- Record and replay testing sessions

### Debugging Tips

- Use the inspector to compare expected vs. actual responses
- Monitor the full request/response cycle for each tool call
- Check for proper error handling by intentionally sending invalid inputs
- Verify that your tools adhere to their declared schemas

## Development

```bash
# Create a new tool
pnpm create-tool

# Lint code
pnpm lint

# Format code
pnpm format
```

## License

MIT

---

# Documentation

- [Tools Documentation](docs/tools.md): Detailed information on available tools and their parameters