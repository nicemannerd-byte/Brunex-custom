'use strict';

const WebSocket = require('ws');
const fs = require('fs');

const NAMES = [
    'Brunex Bot', 'Brunex Scout', 'Brunex Guard', 'Brunex Ace',
    'Brunex Nova', 'Brunex Ghost', 'Brunex Orbit', 'Brunex Titan'
];

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getRandomCoordinates() { return [Math.floor(Math.random() * 125), Math.floor(Math.random() * 125)]; }
function createAgent(value) {
    const Socks = require('socks');
    const [host, port, type] = String(value).split(':');
    return new Socks.Agent({ proxy: { ipaddress: host, port: Number(port), type: Number(type) || 5 } });
}
function createHttpAgent(value) {
    const HttpsProxyAgent = require('https-proxy-agent');
    const [host, port] = String(value).split(':');
    return new HttpsProxyAgent(`http://${host}:${port}`);
}

function Bot(id) {
    this.id = id;
    this.fixedDirection = null;
    this.isBoosting = false;
    this.shouldRandomize = false;
    this.botManager = null;
    this.cosmetic = 11;
    this.tag = 12;
    this.persistentBoost = false;
    this.tornadoSize = 2000;
    this.tornadoSeparation = 800;
    this.tornadoFinalAngle = 90;
    this.tornadoRateOfChange = 0.5;
    this.tornadoRotationDir = 1;
    this.tornadoCurrentAngle = 0;
    this.tornadoActive = false;
    this.fixedCircleActive = false;
    this.fixedCircleX = null;
    this.fixedCircleY = null;
    this.fixedCircleSize = 1712;
    this.fixedCircleSeparation = 6000;
    this.fixedCircleFinalAngle = 110;
    this.fixedCircleRateOfChange = 0.3;
    this.fixedCircleRotationDir = 1;
    this.fixedCircleCurrentAngle = 0;
    this.fixedCircleOffsetAngle = Math.random() * Math.PI * 2;
    this.needPing = false;
    this.snakeID = null;
    this.snakeX = 0;
    this.snakeY = 0;
    this.snakeAngle = 0;
    this.haveSnakeID = false;
    this.isBoost = false;
    this.hasConnected = false;
    this._reconnectTimer = null;
}

Bot.prototype.send = function (buf) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.send(buf); } catch (_) {}
    }
};

Bot.prototype.connect = function () {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    let server = this.server;
    if (!server) return;
    if (!/^wss?:\/\//i.test(server)) server = 'ws://' + server.replace(/^\/+/, '');

    const options = {
        headers: {
            Origin: this.origin || 'http://localhost',
            'User-Agent': 'Mozilla/5.0',
            Host: (() => { try { return new URL(server).host; } catch (_) { return undefined; } })()
        }
    };
    const socks = Array.isArray(this.proxies) ? this.proxies.filter(Boolean) : [];
    const http = Array.isArray(this.Proxies) ? this.Proxies.filter(Boolean) : [];
    try {
        if (socks.length && (!http.length || Math.random() >= 0.5)) options.agent = createAgent(socks[getRandomInt(0, socks.length - 1)]);
        else if (http.length) options.agent = createHttpAgent(http[getRandomInt(0, http.length - 1)]);
    } catch (_) {}

    this.server = server;
    this.ws = new WebSocket(server, options);
    this.ws.binaryType = 'nodebuffer';
    this.ws.on('message', this.onMessage.bind(this));
    this.ws.on('open', this.onOpen.bind(this));
    this.ws.on('close', this.onClose.bind(this));
    this.ws.on('error', this.onError.bind(this));
};

Bot.prototype.setRandomMovement = function (value) { this.shouldRandomize = !!value; };
Bot.prototype.setZigZagMovement = function (value) {
    this.isZigZag = !!value;
    if (this.isZigZag) this.fixedDirection = null;
};
Bot.prototype.setTornadoMovement = function (value) {
    this.tornadoActive = !!value;
    if (value) { this.shouldRandomize = false; this.isZigZag = false; this.fixedCircleActive = false; }
};
Bot.prototype.setTornadoSettings = function (s) {
    s = s || {};
    this.tornadoSize = Number(s.size) || 2000;
    this.tornadoSeparation = Number(s.separation) || 800;
    this.tornadoFinalAngle = Number(s.finalAng) || 90;
    this.tornadoRateOfChange = Number(s.rOC) || 0.5;
    this.tornadoRotationDir = Number(s.rotationDir) || 1;
};
Bot.prototype.setFixedCircleMovement = function (value) {
    this.fixedCircleActive = !!value;
    if (value) { this.shouldRandomize = false; this.isZigZag = false; this.tornadoActive = false; }
};
Bot.prototype.setFixedCircleSettings = function (s, x, y) {
    s = s || {};
    this.fixedCircleSize = Number(s.size) || 1712;
    this.fixedCircleSeparation = Number(s.separation) || 6000;
    this.fixedCircleFinalAngle = Number(s.finalAng) || 110;
    this.fixedCircleRateOfChange = Number(s.rOC) || 0.3;
    this.fixedCircleRotationDir = Number(s.rotationDir) || 1;
    this.fixedCircleX = x; this.fixedCircleY = y;
};

Bot.prototype.spawn = function () {
    const name = NAMES[getRandomInt(0, NAMES.length - 1)].slice(0, 40).padEnd(40, ' ');
    // Keep the original protocol's spawn packet; the name/cosmetic selection is retained
    // as controller metadata because the private server's exact spawn schema may differ.
    this.send(Buffer.from([115, 12, 1, 8, 66, 114, 117, 110, 101, 120, 89, 84, 0, 255]));
    if (this.botManager) {
        const target = this.botManager.getMovementTarget();
        if (target.x != null && target.y != null) this.moveTo(target.x, target.y);
    }
    this.name = name.trim();
};

Bot.prototype.moveTo = function (x, y) {
    if (x == null || y == null || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
        const dirs = [0, 45, 90, 135, 180, 225];
        const buf = Buffer.from([dirs[getRandomInt(0, dirs.length - 1)]]);
        this.send(this.isBoost ? Buffer.concat([buf, Buffer.from([253])]) : buf);
        return;
    }

    let value;
    if (this.shouldRandomize) {
        value = [0, 45, 90, 135, 180, 225][getRandomInt(0, 5)];
    } else {
        let tx = Number(x), ty = Number(y);
        if (this.botManager && (this.botManager.getMode() === 'headhunter' || this.botManager.getMode() === 'focus')) {
            const t = this.botManager.getMovementTarget();
            if (t.x != null && t.y != null) { tx = t.x; ty = t.y; }
        }
        const dx = tx - this.snakeX;
        const dy = ty - this.snakeY;
        const distance = Math.hypot(dx, dy);
        let angle = Math.atan2(dy, dx);

        if (this.tornadoActive) {
            const safe = Math.max(1, this.tornadoSeparation);
            if (distance <= this.tornadoSize) {
                const ratio = Math.max(0, Math.min(1, (distance - safe) / Math.max(1, this.tornadoSize - safe)));
                const bend = (this.tornadoFinalAngle * Math.PI / 180) * (1 - ratio) * this.tornadoRateOfChange;
                angle += Math.PI / 2 + (this.tornadoRotationDir === 0 ? -bend : bend);
            }
        } else if (this.fixedCircleActive && this.fixedCircleX != null && this.fixedCircleY != null) {
            const cx = this.fixedCircleX - this.snakeX;
            const cy = this.fixedCircleY - this.snakeY;
            angle = Math.atan2(cy, cx);
            const d = Math.hypot(cx, cy);
            if (d <= this.fixedCircleSize) {
                const ratio = 1 - d / this.fixedCircleSize;
                const bend = (this.fixedCircleFinalAngle * Math.PI / 180) * ratio * this.fixedCircleRateOfChange;
                angle += this.fixedCircleRotationDir === 1 ? bend : -bend;
            }
        }

        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        value = angle * 125 / Math.PI;
    }

    this.snakeAngle = value;
    if (this.shouldRandomize) [this.snakeX, this.snakeY] = getRandomCoordinates();
    const buf = Buffer.from([Math.floor(value)]);
    this.send(this.isBoost ? Buffer.concat([buf, Buffer.from([253])]) : buf);
};

Bot.prototype.disconnect = function () {
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    if (this.ws) { try { this.ws.close(); } catch (_) {} }
    this.haveSnakeID = false;
};

Bot.prototype.onOpen = function () {
    if (this.botManager && this.botManager.getConnectedCount() >= this.botManager.botCount) { this.disconnect(); return; }
    this.hasConnected = true;
    this.send(Buffer.from([99]));
    if (this.botManager) {
        this.botManager.setConnectedCount(this.botManager.getConnectedCount() + 1);
        this.botManager.sendCountUpdate();
    }
    if (this.persistentBoost) {
        this.boostInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN && this.haveSnakeID) this.send(Buffer.from([253]));
        }, 3000);
    }
};
Bot.prototype.onClose = function () {
    if (this.boostInterval) { clearInterval(this.boostInterval); this.boostInterval = null; }
    this.haveSnakeID = false;
    if (this.hasConnected && this.botManager) {
        this.hasConnected = false;
        this.botManager.setConnectedCount(this.botManager.getConnectedCount() - 1);
        this.botManager.sendCountUpdate();
    }
};
Bot.prototype.onError = function () {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
        this._reconnectTimer = null;
        if (this.botManager && !this.botManager.isRunning()) return;
        this.connect();
    }, 1000);
};
Bot.prototype.decodeSecrect = function (secret) {
    const out = new Uint8Array(24); let state = 0;
    for (let i = 0; i < 24; i++) {
        let a = secret[17 + i * 2]; if (a <= 96) a += 32; a = (a - 98 - i * 34) % 26; if (a < 0) a += 26;
        let b = secret[18 + i * 2]; if (b <= 96) b += 32; b = (b - 115 - i * 34) % 26; if (b < 0) b += 26;
        let v = (a << 4) | b; const base = v >= 97 ? 97 : 65; v -= base;
        if (i === 0) state = 2 + v; out[i] = ((v + state) % 26) + base; state += 3 + v;
    }
    return out;
};
Bot.prototype.boostSpeed = function (value) {
    this.isBoost = !!value;
    if (this.isBoost && this.ws && this.ws.readyState === WebSocket.OPEN) this.send(Buffer.from([253]));
};

Bot.prototype.onMessage = function (data) {
    const b = Buffer.from(data);
    if (b.length < 3) return;
    const type = String.fromCharCode(b[2]);
    if (type === '6') { this.send(this.decodeSecrect(b)); this.spawn(); }
    else if (type === 'p') this.needPing = true;
    else if (type === 'a') {
        const loop = () => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
            if (this.botManager) {
                const t = this.botManager.getMovementTarget();
                this.moveTo(t.x, t.y);
            }
            if (this.botManager && this.botManager.isRunning()) this._movementTimer = setTimeout(loop, 180);
        };
        clearTimeout(this._movementTimer);
        loop();
        if (!this._pingTimer) this._pingTimer = setInterval(() => this.send(Buffer.from([251])), 150);
    } else if (type === 'v') this.disconnect();
    else if ((type === 'g' || type === 'n') && b.length >= 9) {
        const id = b.readUInt16BE(3); if (id === this.snakeID) { this.snakeX = b.readUInt16BE(5); this.snakeY = b.readUInt16BE(7); }
    } else if ((type === 'G' || type === 'N') && b.length >= 7) {
        const id = b.readUInt16BE(3); if (id === this.snakeID && this.snakeX && this.snakeY) { this.snakeX += b[5] - 128; this.snakeY += b[6] - 128; }
    } else if (type === 's' && !this.haveSnakeID && b.length >= 5) {
        this.snakeID = b.readUInt16BE(3); this.haveSnakeID = true;
        if (b.length >= 24) { this.snakeX = ((b[18] << 16) | (b[19] << 8) | b[20]) / 5; this.snakeY = ((b[21] << 16) | (b[22] << 8) | b[23]) / 5; }
    }
};

module.exports = Bot;
