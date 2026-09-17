# BrunexBots Remote Control

Controller for a private/test Slither-compatible server you control.

## Modes while Slither stays open
- `F` = Follow your player
- `W` = Wander
- `T` = Tornado around your player
- `S` = Spiral around your player
- `H` = Head Hunter (uses the selected target coordinates)
- `C` = Focus (concentrates movement on the selected target)
- `Q` = Stop movement mode / hold the current heading

The extension also provides on-page mode buttons, so you do not need to leave the game to change modes.

## Targeting
Enter a target name in the Brunex mode panel and choose `H` or `C`. The controller accepts target coordinates from the extension/game-state tracker. Exact name discovery depends on what the private/test server exposes to the browser; the controller does not claim to discover names that the game does not expose.

## Bot limit
`MAX_BOTS` defaults to 100 and is capped at 1000. `SPAWN_DELAY_MS` defaults to 100 ms so bots are created gradually instead of thousands of connections being attempted at once.

## No proxy required
`config/proxies.txt` and `config/httpProxy.txt` may be empty. The controller now connects directly when no proxy is configured.

## Run in Codespaces
```bash
cd BrunexBots
npm install
npm run check
npm start
```

Codespaces can forward port `8420`. Put the forwarded controller URL into the extension's **Controller URL** field, then press **Connect controller**.

## Persistence
GitHub stores the source; it does not keep a Node process running. The included systemd service is for a VPS you control and restarts the controller after a failure or reboot.
