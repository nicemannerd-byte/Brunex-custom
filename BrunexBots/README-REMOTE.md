# BrunexBots Remote Control

Controller for a private/test Slither-compatible server you control.

## Modes while the game stays open
- `F` = Follow your player
- `W` = Wander
- `T` = Tornado around your player
- `S` = Spiral around your player
- `H` = Head Hunter using the selected target coordinates
- `C` = Focus movement on the selected target
- `Q` = Stop all bots

The extension provides on-page buttons, so you can change modes without leaving the game or returning to GitHub.

## Targeting
Enter a target name in the mode panel. The extension checks common browser-side player collections and sends matching coordinates to the controller. If the particular private/test client does not expose a player's name and coordinates, H/C cannot identify that player automatically.

## Bot limit and startup
`MAX_BOTS` defaults to 100 and is capped at 1000. `SPAWN_DELAY_MS` defaults to 250 ms, so connections are created gradually rather than all at once.

## Networking
The controller uses a native WebSocket control endpoint at `/control` on port `8420`. This avoids requiring a remote Socket.IO script in the browser extension. A legacy Socket.IO endpoint is also enabled when the dependency is installed.

The bot game connection defaults to direct connections; the old proxy lists are not required.

## Run in Codespaces
```bash
cd BrunexBots
npm install
npm run check
npm start
```

Forward port `8420` in Codespaces. In the extension, put the forwarded controller address into **Controller URL** and press **Connect**. The extension will use the matching `ws://` or `wss://` control connection.

The default game-server entry is `ws://15.235.218.24:443/slither`.

## Persistence
GitHub stores the source but does not keep a Node process running. The included systemd service is intended for a VPS you control and can restart the controller after a failure or reboot.
