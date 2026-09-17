'use strict';

const http = require('http');
const WebSocket = require('ws');
const BotManager = require('./src/BotManager');
const SocketHandler = require('./src/SocketHandler');

const PORT = Number.parseInt(process.env.CONTROL_PORT || '8420', 10);
const HOST = process.env.CONTROL_HOST || '0.0.0.0';
const manager = new BotManager();

const httpServer = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*'});
        return res.end(JSON.stringify({ service: 'BrunexBots', ok: true, running: manager.isRunning(), mode: manager.mode, connected: manager.getConnectedCount(), maxBots: manager.botCount }));
    }
    res.writeHead(404); res.end('Not found');
});

const wss = new WebSocket.Server({ noServer: true });
const clients = new Set();
function state() { return { type: 'state', running: manager.isRunning(), mode: manager.mode, connected: manager.getConnectedCount(), maxBots: manager.botCount, target: manager.targetName || '' }; }
function broadcast(message) { const text = JSON.stringify(message); for (const ws of clients) if (ws.readyState === WebSocket.OPEN) ws.send(text); }

wss.on('connection', ws => {
    clients.add(ws);
    ws.send(JSON.stringify(state()));
    ws.on('message', raw => {
        let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
        try {
            switch (msg.type) {
                case 'start': manager.setServer(msg.server, msg.origin || 'http://localhost'); manager._0x8c7f(); break;
                case 'stop': manager.stop(); break;
                case 'movement': manager.updatePosition(msg.x, msg.y); break;
                case 'mode': manager.setMode(msg.mode); break;
                case 'target': manager.setTarget(msg.name, msg.x, msg.y); break;
                case 'boost': manager._0xsetBoostState(msg.enabled); break;
                case 'tornadoSettings': manager._0x4f2a(msg.settings); break;
                case 'cosmetic': manager._0x3f8b(msg.value); break;
                case 'tag': manager._0x7a9c(msg.value); break;
            }
            broadcast(state());
        } catch (err) { ws.send(JSON.stringify({ type: 'error', message: err.message })); }
    });
    ws.on('close', () => clients.delete(ws));
});

httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/control') return wss.handleUpgrade(request, socket, head, ws => wss.emit('connection', ws, request));
    socket.destroy();
});

try {
    const { Server } = require('socket.io');
    const io = new Server(httpServer, { cors: { origin: true }, transports: ['websocket', 'polling'] });
    const handler = new SocketHandler(io, manager._0x8b5c(), manager);
    manager._0x2d5e(handler);
} catch (_) {
    console.log('Socket.IO compatibility layer unavailable; native WebSocket control remains enabled.');
}

httpServer.listen(PORT, HOST, () => {
    console.log(`BrunexBots controller listening on ${HOST}:${PORT}`);
    console.log(`Native control endpoint: /control`);
    console.log(`Max bots: ${manager.botCount}`);
    console.log('Modes: F Follow | W Wander | T Tornado | S Spiral | H Head Hunter | C Focus | Q Stop');
});
setInterval(() => broadcast(state()), 3000).unref();

function shutdown() { manager.stop(); for (const ws of clients) { try { ws.close(); } catch (_) {} } httpServer.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
