'use strict';

class SocketHandler {
    constructor(io, bots, manager) {
        this.io = io;
        this.bots = bots;
        this.manager = manager;
        this._setup();
    }

    _0x6d4e() {
        this.io.emit('botCount', this.manager.getConnectedCount());
        this.io.emit('mode', this.manager.getMode());
    }

    _setup() {
        setInterval(() => this._0x6d4e(), 3000);
        this.io.on('connection', socket => {
            socket.emit('botCount', this.manager.getConnectedCount());
            socket.emit('mode', this.manager.getMode());

            socket.on('start', data => {
                try {
                    if (!data || !data.ip) return socket.emit('controllerError', 'Missing bot server URL');
                    this.manager._0x3f7b(String(data.ip), data.origin || 'http://localhost');
                    this.manager._0x8c7f();
                    socket.emit('requestPosition');
                } catch (err) { socket.emit('controllerError', err.message); }
            });

            socket.on('stop', () => this.manager.stopBots());

            const updatePosition = data => {
                if (data && Number.isFinite(Number(data.x)) && Number.isFinite(Number(data.y))) this.manager.updatePosition(data.x, data.y);
            };
            socket.on('movement', updatePosition);
            socket.on('pos', updatePosition);

            socket.on('setMode', data => {
                if (this.manager.setMode(data && data.mode)) this.io.emit('mode', this.manager.getMode());
                else socket.emit('controllerError', `Unknown mode: ${data && data.mode}`);
            });

            socket.on('target', data => { if (data) this.manager.updateTarget(data.x, data.y, data.name); });
            socket.on('setTarget', data => { if (data) this.manager.setTarget(data.name, data.x, data.y); });
            socket.on('clearTarget', () => this.manager.clearTarget());

            socket.on('toggleBoostSpeed', data => {
                this.manager._0xsetBoostState(!!(data && data.shouldBoost));
                for (const bot of this.manager._0x8b5c()) if (bot && typeof bot.boostSpeed === 'function') bot.boostSpeed(this.manager._0xgetBoostState());
            });
            socket.on('toggleZigZagMovement', () => this.manager._0x9c2d());
            socket.on('toggleRandomMovement', () => this.manager._0x1f3e());
            socket.on('setCosmetic', data => { if (data && data.cosmetic !== undefined) this.manager._0x3f8b(data.cosmetic); });
            socket.on('setTag', data => { if (data && data.tag !== undefined) this.manager._0x7a9c(data.tag); });
            socket.on('getCosmeticInfo', () => socket.emit('cosmeticInfo', { currentCosmetic: this.manager._0x4e8f(), currentTag: this.manager._0x9b2a() }));
            socket.on('toggleTornadoMovement', () => {
                this.manager.setMode(this.manager.getMode() === 'tornado' ? 'follow' : 'tornado');
                this.io.emit('mode', this.manager.getMode());
            });
            socket.on('toggleSpiralMovement', () => {
                this.manager.setMode(this.manager.getMode() === 'spiral' ? 'follow' : 'spiral');
                this.io.emit('mode', this.manager.getMode());
            });
            socket.on('setTornadoSettings', settings => { if (settings) this.manager._0x4f2a(settings); });
        });
    }
}

module.exports = SocketHandler;
