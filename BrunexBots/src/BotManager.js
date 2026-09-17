'use strict';

const Bot = require('./Bot');
const fs = require('fs');

function readLines(file) {
    try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean); }
    catch (_) { return []; }
}
function numberEnv(name, fallback, min, max) {
    const n = Number(process.env[name]);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}

class BotManager {
    constructor() {
        this._0x2a7c = [];
        this._0x5f8e = '';
        this._0x1d3b = null;
        this._0x4c6f = null;
        this._0x8a2e = null;
        this._0x6d9c = null;
        this._0x7b4f = null;
        this._0x3e1a = 0;
        this._0x9f2c = numberEnv('MAX_BOTS', 100, 1, 1000);
        this.spawnDelay = numberEnv('SPAWN_DELAY_MS', 100, 20, 5000);
        this._0x5a8d = false;
        this._0x2c7e = false;
        this._0x1f8c = false;
        this._0xtornadoSettings = { size: 2000, separation: 800, finalAng: 90, rOC: 0.5, rotationDir: 1 };
        this._0x8f3a = null;
        this._0xfixedCircleActive = false;
        this._0xfixedCircleX = null;
        this._0xfixedCircleY = null;
        this._0xfixedCircleSettings = { size: 1712, separation: 6000, finalAng: 110, rOC: 0.3, rotationDir: 1 };
        this._0x4b6c = readLines('./config/proxies.txt');
        this._0x7d9e = readLines('./config/httpProxy.txt');
        this._0x5b7c = 11;
        this._0x9d1e = 12;
        this._0xboostState = false;
        this._0xbotInterval = null;
        this.mode = 'follow';
        this.targetName = '';
        this.targetXPos = null;
        this.targetYPos = null;
        this.running = false;
    }

    _0x3f7b(server, origin) { this._0x5f8e = server; this._0x1d3b = origin; }
    _0x2a5c(x, y) {
        if (Number.isFinite(Number(x)) && Number.isFinite(Number(y))) { this._0x4c6f = Number(x); this._0x8a2e = Number(y); }
    }
    _0x6e4a() {}

    _0x8c7f() {
        this.stopBots();
        this.running = true;
        let id = 0;
        this._0xbotInterval = setInterval(() => {
            if (!this.running || id >= this._0x9f2c) {
                clearInterval(this._0xbotInterval); this._0xbotInterval = null; return;
            }
            id++;
            const bot = new Bot(id);
            bot.server = this._0x5f8e;
            bot.origin = this._0x1d3b;
            bot.proxies = this._0x4b6c;
            bot.Proxies = this._0x7d9e;
            bot.socketHandler = this._0x8f3a;
            bot.botManager = this;
            bot.cosmetic = this._0x5b7c;
            bot.tag = this._0x9d1e;
            bot.persistentBoost = this._0xboostState;
            bot.shouldRandomize = this._0x5a8d;
            bot.isZigZag = this._0x2c7e;
            bot.tornadoActive = this._0x1f8c;
            bot.setTornadoSettings(this._0xtornadoSettings);
            if (this._0xfixedCircleActive) {
                bot.setFixedCircleMovement(true);
                bot.setFixedCircleSettings(this._0xfixedCircleSettings, this._0xfixedCircleX, this._0xfixedCircleY);
            }
            try {
                bot.connect();
                this._0x2a7c.push(bot);
                const target = this.getMovementTarget();
                if (target.x != null && target.y != null) bot.moveTo(target.x, target.y);
            } catch (err) { console.error(`[Bot ${id}] ${err.message}`); }
        }, this.spawnDelay);
    }

    stopBots() {
        this.running = false;
        if (this._0xbotInterval) { clearInterval(this._0xbotInterval); this._0xbotInterval = null; }
        for (const bot of this._0x2a7c) { try { bot.disconnect(); } catch (_) {} }
        this._0x2a7c = []; this._0x3e1a = 0; this.sendCountUpdate();
    }
    _0xstopAllBots() { this.stopBots(); }
    isRunning() { return this.running; }

    setMode(mode) {
        mode = String(mode || '').toLowerCase();
        if (!new Set(['follow','wander','tornado','spiral','headhunter','focus','stop']).has(mode)) return false;
        this.mode = mode;
        this._0x5a8d = mode === 'wander';
        this._0x2c7e = false;
        this._0x1f8c = mode === 'tornado' || mode === 'focus';
        this._0xfixedCircleActive = mode === 'spiral';
        if (mode === 'spiral') { this._0xfixedCircleX = this._0x6d9c ?? this._0x4c6f; this._0xfixedCircleY = this._0x7b4f ?? this._0x8a2e; }
        for (const bot of this._0x2a7c) {
            bot.setRandomMovement(this._0x5a8d);
            bot.setTornadoMovement(this._0x1f8c);
            bot.setFixedCircleMovement(this._0xfixedCircleActive);
            if (this._0xfixedCircleActive) bot.setFixedCircleSettings(this._0xfixedCircleSettings, this._0xfixedCircleX, this._0xfixedCircleY);
        }
        return true;
    }
    getMode() { return this.mode; }
    getMovementTarget() {
        if ((this.mode === 'headhunter' || this.mode === 'focus') && Number.isFinite(this.targetXPos) && Number.isFinite(this.targetYPos)) return { x: this.targetXPos, y: this.targetYPos };
        return { x: this._0x6d9c, y: this._0x7b4f };
    }
    setTarget(name, x, y) {
        this.targetName = String(name || '').trim();
        if (Number.isFinite(Number(x)) && Number.isFinite(Number(y))) { this.targetXPos = Number(x); this.targetYPos = Number(y); }
    }
    clearTarget() { this.targetName = ''; this.targetXPos = null; this.targetYPos = null; }
    updateTarget(x, y, name) { this.setTarget(name || this.targetName, x, y); }

    _0x1f3e() { this.setMode(this._0x5a8d ? 'follow' : 'wander'); }
    _0x9c2d() { this._0x2c7e = !this._0x2c7e; for (const bot of this._0x2a7c) bot.setZigZagMovement(this._0x2c7e); }
    _0x4e7c() {}
    _0x2d5e(handler) { this._0x8f3a = handler; }
    _0x8b5c() { return this._0x2a7c; }
    _0x1a2b() { return this._0x3e1a; }
    _0xsetBoostState(state) { this._0xboostState = !!state; }
    _0xgetBoostState() { return this._0xboostState; }
    _0x6f4c(count) { this._0x3e1a = Math.max(0, Number(count) || 0); }
    getConnectedCount() { return this._0x3e1a; }
    setConnectedCount(count) { this._0x6f4c(count); }
    sendCountUpdate() { if (this._0x8f3a) this._0x8f3a._0x6d4e(); }
    get botCount() { return this._0x9f2c; }
    updatePosition(x, y) { this._0x2a5c(x, y); }
    get xPos() { return this._0x4c6f; }
    get yPos() { return this._0x8a2e; }
    _0x3f8b(cosmetic) { this._0x5b7c = Number(cosmetic); for (const bot of this._0x2a7c) bot.cosmetic = this._0x5b7c; }
    _0x7a9c(tag) { this._0x9d1e = Number(tag); for (const bot of this._0x2a7c) bot.tag = this._0x9d1e; }
    _0x4e8f() { return this._0x5b7c; }
    _0x9b2a() { return this._0x9d1e; }
    _0x3d8f() { this.setMode(this._0x1f8c ? 'follow' : 'tornado'); }
    _0x4f2a(settings) { this._0xtornadoSettings = { ...this._0xtornadoSettings, ...(settings || {}) }; for (const bot of this._0x2a7c) bot.setTornadoSettings(this._0xtornadoSettings); }
    _0xToggleFixedCircle() { this.setMode(this._0xfixedCircleActive ? 'follow' : 'spiral'); }
}
module.exports = BotManager;
