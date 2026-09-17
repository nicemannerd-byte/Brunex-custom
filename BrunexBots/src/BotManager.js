'use strict';

const Bot = require('./Bot');

function numberEnv(name, fallback, min, max) {
    const n = Number(process.env[name]);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}
function normalizeServer(value) {
    const s = String(value || '').trim();
    if (/^wss?:\/\//i.test(s)) return s;
    if (/^https?:\/\//i.test(s)) return s.replace(/^http/i, 'ws');
    return `ws://${s.replace(/^\/+/, '')}`;
}

class BotManager {
    constructor() {
        this._0x2a7c = [];
        this._0x5f8e = process.env.GAME_SERVER || '';
        this._0x1d3b = process.env.GAME_ORIGIN || 'http://localhost';
        this._0x4c6f = null; this._0x8a2e = null; this._0x6d9c = null; this._0x7b4f = null;
        this._0x3e1a = 0;
        this._0x9f2c = numberEnv('MAX_BOTS', 100, 1, 1000);
        this.spawnDelay = numberEnv('SPAWN_DELAY_MS', 250, 50, 5000);
        this._0x5a8d = false; this._0x2c7e = false; this._0x1f8c = false;
        this._0xtornadoSettings = { size: 2000, separation: 800, finalAng: 90, rOC: 0.5, rotationDir: 1 };
        this._0x8f3a = null;
        this._0xfixedCircleActive = false; this._0xfixedCircleX = null; this._0xfixedCircleY = null;
        this._0xfixedCircleSettings = { size: 1712, separation: 6000, finalAng: 110, rOC: 0.3, rotationDir: 1 };
        this._0x5b7c = 11; this._0x9d1e = 12; this._0xboostState = false;
        this._0xbotInterval = null; this.running = false;
        this.mode = 'follow'; this.targetName = ''; this.targetXPos = null; this.targetYPos = null;
    }

    _0x3f7b(server, origin) { if (server) this._0x5f8e = normalizeServer(server); if (origin) this._0x1d3b = String(origin); }
    _0x2a5c(x, y) { const nx = Number(x), ny = Number(y); if (Number.isFinite(nx) && Number.isFinite(ny)) { this._0x4c6f = nx; this._0x8a2e = ny; } }
    _0x6e4a() {}

    _0x8c7f() {
        this.stopBots();
        if (!this._0x5f8e) throw new Error('No game server configured');
        this.running = true;
        let id = 0;
        const spawn = () => {
            if (!this.running || id >= this._0x9f2c) { clearInterval(this._0xbotInterval); this._0xbotInterval = null; return; }
            const bot = new Bot(++id);
            bot.server = this._0x5f8e; bot.origin = this._0x1d3b;
            bot.proxies = []; bot.Proxies = [];
            bot.socketHandler = this._0x8f3a; bot.botManager = this;
            bot.cosmetic = this._0x5b7c; bot.tag = this._0x9d1e; bot.persistentBoost = this._0xboostState;
            bot.setMode(this.mode); bot.setTornadoSettings(this._0xtornadoSettings);
            if (this.targetXPos !== null && this.targetYPos !== null) bot.setTarget(this.targetXPos, this.targetYPos);
            this._0x2a7c.push(bot);
            try { bot.connect(); } catch (e) { console.error(`[Bot ${id}] ${e.message}`); }
            this.sendCountUpdate();
        };
        spawn();
        this._0xbotInterval = setInterval(spawn, this.spawnDelay);
    }

    stopBots() { this.running = false; if (this._0xbotInterval) clearInterval(this._0xbotInterval); this._0xbotInterval = null; for (const bot of this._0x2a7c) { try { bot.disconnect(); } catch (_) {} } this._0x2a7c = []; this._0x3e1a = 0; this.sendCountUpdate(); }
    _0xstopAllBots() { this.stopBots(); }
    stop() { this.stopBots(); }
    isRunning() { return this.running; }

    setMode(mode) {
        const m = String(mode || '').toLowerCase();
        if (!['follow','wander','tornado','spiral','headhunter','focus','stop'].includes(m)) return this.mode;
        this.mode = m;
        this._0x5a8d = m === 'wander'; this._0x1f8c = m === 'tornado'; this._0xfixedCircleActive = m === 'spiral';
        if (m === 'spiral') { this._0xfixedCircleX = this._0x4c6f; this._0xfixedCircleY = this._0x8a2e; }
        for (const bot of this._0x2a7c) bot.setMode(m);
        if (m === 'stop') this.stopBots();
        return m;
    }
    getMode() { return this.mode; }
    getMovementTarget() {
        if ((this.mode === 'headhunter' || this.mode === 'focus') && Number.isFinite(this.targetXPos) && Number.isFinite(this.targetYPos)) return { x: this.targetXPos, y: this.targetYPos };
        return { x: this._0x6d9c ?? this._0x4c6f, y: this._0x7b4f ?? this._0x8a2e };
    }
    setTarget(name, x, y) { this.targetName = String(name || '').trim(); if (Number.isFinite(Number(x)) && Number.isFinite(Number(y))) { this.targetXPos = Number(x); this.targetYPos = Number(y); for (const bot of this._0x2a7c) bot.setTarget(this.targetXPos, this.targetYPos); } }
    updateTarget(x, y, name) { this.setTarget(name || this.targetName, x, y); }
    clearTarget() { this.targetName = ''; this.targetXPos = null; this.targetYPos = null; }

    _0x1f3e() { this.setMode(this._0x5a8d ? 'follow' : 'wander'); }
    _0x9c2d() { this._0x2c7e = !this._0x2c7e; for (const bot of this._0x2a7c) bot.setZigZagMovement(this._0x2c7e); }
    _0x4e7c() {}
    _0x2d5e(handler) { this._0x8f3a = handler; }
    _0x8b5c() { return this._0x2a7c; }
    _0x1a2b() { return this._0x3e1a; }
    _0xsetBoostState(state) { this._0xboostState = !!state; for (const bot of this._0x2a7c) bot.boostSpeed(this._0xboostState); }
    _0xgetBoostState() { return this._0xboostState; }
    _0x6f4c(count) { this._0x3e1a = Math.max(0, Number(count) || 0); }
    getConnectedCount() { return this._0x3e1a; }
    setConnectedCount(count) { this._0x6f4c(count); }
    sendCountUpdate() { if (this._0x8f3a) this._0x8f3a._0x6d4e(); }
    get botCount() { return this._0x9f2c; }
    updatePosition(x, y) { this._0x2a5c(x, y); }
    get xPos() { return this._0x4c6f; }
    get yPos() { return this._0x8a2e; }
    _0x3f8b(v) { this._0x5b7c = Number(v) || 11; for (const b of this._0x2a7c) b.cosmetic = this._0x5b7c; }
    _0x7a9c(v) { this._0x9d1e = Number(v) || 12; for (const b of this._0x2a7c) b.tag = this._0x9d1e; }
    _0x4e8f() { return this._0x5b7c; } _0x9b2a() { return this._0x9d1e; }
    _0x3d8f() { this.setMode(this._0x1f8c ? 'follow' : 'tornado'); }
    _0x4f2a(s) { this._0xtornadoSettings = { ...this._0xtornadoSettings, ...(s || {}) }; for (const b of this._0x2a7c) b.setTornadoSettings(this._0xtornadoSettings); }
    _0xToggleFixedCircle() { this.setMode(this._0xfixedCircleActive ? 'follow' : 'spiral'); }
    setServer(server, origin) { this._0x3f7b(server, origin); }
}
module.exports = BotManager;
