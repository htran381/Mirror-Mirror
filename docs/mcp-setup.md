# MagicMirror MCP Setup

> **Purpose:** The purpose of this documentation is to provide a
> step-by-step guide to setting up the MagicMirror MCP,
> `MMM-Remote-Control` module, and Claude Desktop configuration.

------------------------------------------------------------------------

## 1. Install MMM-Remote-Control 

### 1.1 Navigate to MMM-Remote-Control 

`MMM-Remote-Control` is now included in the team's repository.

From the main project repository, navigate to the module:

```bash
cd MagicMirror/modules/MMM-Remote-Control
npm install
```

> IMPORTANT  **Copy the API key generated during `npm install`.**
> You will use the same API key in both the MagicMirror configuration
> and the Claude Desktop configuration.
>
> Do **not** commit your real API key to GitHub.

------------------------------------------------------------------------

### 1.2 Configure MMM-Remote-Control

#### 1.2.1 Add the module to `config/config.js`

In `MagicMirror/config/config.js`, add this code block inside the
`modules` array:

``` js
{
    module: "MMM-Remote-Control",
    position: "bottom_left",
    config: {
        apiKey: "<YOUR_MMM_REMOTE_CONTROL_API_KEY>",
        secureEndpoints: true,
        showQRCode: true,
        qrCodeSize: 150,
        qrCodePosition: "above"
    }
},
```

> NOTE: The Remote Control QR code appears in the `bottom_left`
> position to help verify that the module was installed and loaded
> successfully. This can be removed afterwards.

#### 1.2.2 Allow access from the local network

To enable MagicMirror to access the Remote Control module from your
local network, at the top of `config.js` change `address` and
`ipWhitelist` to:

``` js
address: "0.0.0.0",
ipWhitelist: [],
```

> NOTE: `ipWhitelist: []` allows connections from all IP
> addresses that can reach the MagicMirror server. 

------------------------------------------------------------------------

### 1.3 Verify Installation

Navigate back to the `MagicMirror` folder, then run:

``` bash
npm start
```

Confirm:

-   MagicMirror starts without an `MMM-Remote-Control` error.
-   The Remote Control QR code is visible.
-   The Remote Control page loads at:

``` text
http://localhost:8080/remote.html
```

> NOTE: Depending on the version of the MagicMirror repo you're
> working on, there could be unconfigured or incomplete modules in
> `config.js` that could cause an error during startup. Comment out/remove 
> that module and restart MagicMirror.

------------------------------------------------------------------------

## 2. Install the MagicMirror MCP Server

### 2.1 Navigate to the MagicMirror MCP Server

The MagicMirror MCP server is now included in the team's repository.

From the main project repository, navigate to:

```bash
cd magicmirror-mcp
npm install
```

### 2.2 Build and run the MCP server

Build the TypeScript project:

``` bash
npm run build
```

Then test that the MCP server starts:

``` bash
npm start
```

Confirm no errors follow the run. The server waits for a client,
like Claude Desktop, to connect.

Press `Ctrl + C` when you are ready to stop the manual test.

------------------------------------------------------------------------

## 3. Configure Claude Desktop

### 3.1 Install Claude Desktop

Install Claude Desktop from the official Claude download page:

https://claude.com/download

### 3.2 Open the Claude Desktop configuration

Open Claude Desktop, then go to:

**Settings \> Developer \> Edit Config**

This opens the Claude Desktop configuration file.

------------------------------------------------------------------------

### 3.3 Find your Node.js path

Through Terminal, run:

``` bash
which node
```

Copy the path returned by this command. 

------------------------------------------------------------------------

### 3.4 Add the MagicMirror MCP configuration

Add the following `mcpServers` configuration to the Claude Desktop
config:

``` json
{
    "mcpServers": {
        "magicmirror": {
            "command": "<PATH_FROM_WHICH_NODE>",
            "args": [
                "<PATH_TO_PROJECT>/magicmirror-mcp/dist/server.js"
            ],
            "env": {
                "MAGICMIRROR_URL": "http://localhost:8080",
                "MAGICMIRROR_API_KEY": "<YOUR_MMM_REMOTE_CONTROL_API_KEY>"
            }
        }
    }
}
```

Replace:

  -------------------------------------------------------------------------
  Placeholder                           Value
  ------------------------------------- -----------------------------------
  `<PATH_FROM_WHICH_NODE>`              The output from `which node`

  `<PATH_TO_PROJECT>`                   The absolute path to your local
                                        `group-project-mirror-mirror` repo

  `<YOUR_MMM_REMOTE_CONTROL_API_KEY>`   The API key used in
                                        `MagicMirror/config/config.js`
  -------------------------------------------------------------------------

> NOTE: The `MAGICMIRROR_API_KEY` in Claude Desktop must
> **exactly match** the `apiKey` configured for `MMM-Remote-Control` in
> `MagicMirror/config/config.js`.

### 3.5 Restart Claude Desktop

Save the configuration changes, then **fully quit and reopen Claude
Desktop**.

On macOS, use **Claude \> Quit Claude** or `Command + Q`.

After reopening Claude:

1.  Go to **Settings \> Developer**.
2.  Find the `magicmirror` local MCP server.
3.  Confirm its status says **running**.

------------------------------------------------------------------------

## 4. Verify the Claude-to-MagicMirror Connection

Keep MagicMirror running and open a new chat in Claude Desktop.

### 4.1 Test module access

Ask Claude:

``` text
What MagicMirror modules are currently available?
```

Claude should return the modules currently available on the mirror.

### 4.2 Test module control

Ask Claude:

``` text
Hide the compliments module.
```

Then:

``` text
Show the compliments module.
```

Confirm that the module disappears and reappears on the MagicMirror
display.

------------------------------------------------------------------------