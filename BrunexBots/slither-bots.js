'use strict';

const readline = require('readline');
const io = require('socket.io')(Number(process.env.CONTROL_PORT || 8420), {
    transports: ['websocket', 'polling']
});

const BotManager = require('./src/BotManager');
const SocketHandler = require('./src/SocketHandler');

const manager = new BotManager();
const handler = new SocketHandler(io, manager._0x8b5c(), manager);
manager._0x2d5e(handler);

console.log('BrunexBots controller started');
console.log(`Control port: ${process.env.CONTROL_PORT || 8420}`);
console.log(`Max bots: ${manager.botCount}`);
console.log('Modes: F Follow | W Wander | T Tornado | S Spiral | H Head Hunter | C Focus | Q Stop');

if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (_, key) => {
            if (!key) return;
            const mode = {
                f: 'follow', w: 'wander', t: 'tornado', s: 'spiral',
                h: 'headhunter', c: 'focus', q: 'stop'
            }[key.name];
            if (mode) {
                manager.setMode(mode);
                io.emit('mode', mode);
                console.log(`Mode: ${mode}`);
            }
            if (key.ctrl && key.name === 'c') {
                manager.stopBots();
                process.exit(0);
            }
        });
    }
}

process.on('SIGINT', () => { manager.stopBots(); process.exit(0); });
process.on('SIGTERM', () => { manager.stopBots(); process.exit(0); });
