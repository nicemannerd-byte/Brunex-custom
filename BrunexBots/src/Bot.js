'use strict';

const WebSocket = require('ws');

const NAMES = [
  'Brunex Nova', 'Brunex Orbit', 'Brunex Titan', 'Brunex Scout',
  'Brunex Ghost', 'Brunex Ace', 'Brunex Guard', 'Brunex Bot'
];
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

function Bot(id) {
  this.id = id;
  this.server = '';
  this.serverInput = '';
  this.origin = 'http://localhost';
  this.botManager = null;
  this.cosmetic = 11;
  this.tag = 12;
  this.persistentBoost = false;
  this.mode = 'follow';
  this.targetX = null;
  this.targetY = null;
  this.snakeID = null;
  this.snakeX = 0;
  this.snakeY = 0;
  this.haveSnakeID = false;
  this.hasConnected = false;
  this.joined = false;
  this.isBoost = false;
  this._reconnectTimer = null;
  this._movementTimer = null;
  this._pingTimer = null;
  this._manualDisconnect = false;
  this._candidateIndex = -1;
  this.state = 'connecting';
  this.name = '';
  this.lastError = '';
  this.lastUrl = '';
  this.attempt = 0;
  this.tornadoSize = 2000;
  this.tornadoSeparation = 800;
  this.tornadoFinalAngle = 90;
  this.tornadoRateOfChange = 0.5;
  this.tornadoRotationDir = 1;
  this.tornadoActive = false;
  this.fixedCircleActive = false;
  this.fixedCircleX = null;
  this.fixedCircleY = null;
  this.fixedCircleSize = 1712;
  this.fixedCircleFinalAngle = 110;
  this.fixedCircleRateOfChange = 0.3;
  this.fixedCircleRotationDir = 1;
}

Bot.prototype.getState = function () { return this.state; };
Bot.prototype.send = function (b) {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    try { this.ws.send(b); } catch (e) { this.lastError = e.message; }
  }
};

Bot.prototype.connectionCandidates = function () {
  let raw = String(this.serverInput || this.server || '').trim();
  if (!raw) return [];
  if (/^wss?:\/\//i.test(raw)) return [raw];
  if (/^https?:\/\//i.test(raw)) raw = raw.replace(/^http/i, 'ws');
  if (/^wss?:\/\//i.test(raw)) return [raw];

  const host = raw.replace(/^\/+|\/+$/g, '');
  const hasPath = host.includes('/');
  const port = (host.match(/:(\d+)(?:\/|$)/) || [])[1];
  if (hasPath) return [`wss://${host}`, `ws://${host}`];
  if (port === '443') return [
    `wss://${host}/slither`, `wss://${host}/`,
    `ws://${host}/slither`, `ws://${host}/`
  ];
  return [
    `ws://${host}/slither`, `ws://${host}/`,
    `wss://${host}/slither`, `wss://${host}/`
  ];
};

Bot.prototype.connect = function () {
  if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
  if (!this.serverInput && this.server) this.serverInput = this.server;
  if (!this.serverInput) return;

  this._manualDisconnect = false;
  this.state = 'connecting';
  const urls = this.connectionCandidates();
  if (!urls.length) return;

  this._candidateIndex = (this._candidateIndex + 1) % urls.length;
  const s = urls[this._candidateIndex];
  this.lastUrl = s;
  this.attempt += 1;

  const options = {
    headers: {
      Origin: this.origin || 'http://localhost',
      'User-Agent': 'Mozilla/5.0',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'en-US,en;q=0.8',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache'
    },
    handshakeTimeout: 8000
  };

  try {
    const u = new URL(s);
    options.headers.Host = u.host;
    if (u.protocol === 'wss:') options.rejectUnauthorized = false;
  } catch (e) {
    this.lastError = e.message;
    this.state = 'reconnecting';
    return;
  }

  try {
    this.ws = new WebSocket(s, options);
    this.ws.binaryType = 'nodebuffer';
    this.ws.on('message', d => this.onMessage(d));
    this.ws.on('open', () => this.onOpen());
    this.ws.on('close', (code, reason) => this.onClose(code, reason));
    this.ws.on('error', e => this.onError(e));
    this.ws.on('unexpected-response', (req, res) => {
      this.lastError = `HTTP ${res.statusCode}`;
      if (process.env.DEBUG === '1') console.error(`[Bot ${this.id}] ${this.lastUrl} -> HTTP ${res.statusCode}`);
    });
  } catch (e) {
    this.lastError = e.message;
    this.state = 'reconnecting';
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => { this._reconnectTimer = null; this.connect(); }, 1000);
  }
};

Bot.prototype.setMode = function (m) {
  this.mode = m || 'follow';
  this.tornadoActive = this.mode === 'tornado';
  this.fixedCircleActive = this.mode === 'spiral';
};
Bot.prototype.setTarget = function (x, y) {
  const a = Number(x), b = Number(y);
  this.targetX = Number.isFinite(a) ? a : null;
  this.targetY = Number.isFinite(b) ? b : null;
};
Bot.prototype.setTornadoSettings = function (s) {
  s = s || {};
  this.tornadoSize = Number(s.size) || 2000;
  this.tornadoSeparation = Number(s.separation) || 800;
  this.tornadoFinalAngle = Number(s.finalAng) || 90;
  this.tornadoRateOfChange = Number(s.rOC) || 0.5;
  this.tornadoRotationDir = Number(s.rotationDir) || 1;
};

Bot.prototype.spawn = function () {
  this.name = `${NAMES[rand(0, NAMES.length - 1)]} #${String(this.id).padStart(3, '0')}`;
  // This is the handshake used by the supplied Brunex server/client bundle.
  this.send(Buffer.from([115, 12, 1, 8, 66, 114, 117, 110, 101, 120, 89, 84, 0, 255]));
  const t = this.botManager && this.botManager.getMovementTarget();
  if (t && t.x != null && t.y != null) this.moveTo(t.x, t.y);
};

Bot.prototype.moveTo = function (x, y) {
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return;
  let tx = Number(x), ty = Number(y);
  if ((this.mode === 'headhunter' || this.mode === 'focus') && this.targetX !== null && this.targetY !== null) {
    tx = this.targetX; ty = this.targetY;
  }
  let a = Math.atan2(ty - this.snakeY, tx - this.snakeX);
  if (this.mode === 'wander') a += ((this.id % 7) - 3) * 0.35;
  if (this.tornadoActive) a += Math.PI / 2;
  if (this.fixedCircleActive) a += (this.id % 2 ? 1 : -1) * Math.PI / 3;
  if (this.mode === 'focus') a += (this.id % 2 ? 1 : -1) * 0.2;
  while (a < 0) a += Math.PI * 2;
  while (a >= Math.PI * 2) a -= Math.PI * 2;
  const v = Math.max(0, Math.min(250, Math.floor(a * 125 / Math.PI)));
  this.send(this.isBoost ? Buffer.from([v, 253]) : Buffer.from([v]));
};

Bot.prototype.disconnect = function () {
  this._manualDisconnect = true;
  clearTimeout(this._reconnectTimer);
  clearTimeout(this._movementTimer);
  clearInterval(this._pingTimer);
  this._reconnectTimer = this._movementTimer = this._pingTimer = null;
  if (this.ws) {
    try { this.ws.removeAllListeners(); this.ws.close(); } catch (_) {}
    this.ws = null;
  }
  if (this.hasConnected && this.botManager) {
    this.hasConnected = false;
    this.botManager.setConnectedCount(this.botManager.getConnectedCount() - 1);
  }
  this.state = 'stopped';
  this.joined = false;
  this.haveSnakeID = false;
};

Bot.prototype.onOpen = function () {
  this.state = 'connected';
  this.hasConnected = true;
  this.joined = false;
  this.lastError = '';
  // Protocol documentation identifies 'c' as StartLogin and says the server
  // then sends packet 6 before the username/skin packet. 
  this.send(Buffer.from([99]));
  if (this.botManager) {
    this.botManager.setConnectedCount(this.botManager.getConnectedCount() + 1);
    this.botManager.sendCountUpdate();
  }
};

Bot.prototype.onClose = function (code, reason) {
  clearTimeout(this._movementTimer);
  clearInterval(this._pingTimer);
  this._movementTimer = this._pingTimer = null;
  this.ws = null;
  if (this.hasConnected && this.botManager) {
    this.hasConnected = false;
    this.botManager.setConnectedCount(this.botManager.getConnectedCount() - 1);
    this.botManager.sendCountUpdate();
  }
  this.joined = false;
  this.haveSnakeID = false;
  const why = reason && reason.toString ? reason.toString() : '';
  if (code && code !== 1000) this.lastError = `WebSocket closed ${code}${why ? `: ${why}` : ''}`;
  if (!this._manualDisconnect && this.botManager && this.botManager.isRunning()) {
    this.state = 'reconnecting';
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, 1200 + Math.random() * 1800);
  } else {
    this.state = 'stopped';
  }
};

Bot.prototype.onError = function (e) {
  this.lastError = e && e.message || String(e);
  if (process.env.DEBUG === '1') console.error(`[Bot ${this.id}] ${this.lastUrl}: ${this.lastError}`);
};

Bot.prototype.decodeSecrect = function (secret) {
  if (!secret || secret.length < 65) throw new Error(`Invalid pre-init packet length: ${secret ? secret.length : 0}`);
  const out = new Uint8Array(24);
  let state = 0;
  for (let i = 0; i < 24; i++) {
    let a = secret[17 + i * 2];
    if (a <= 96) a += 32;
    a = (a - 98 - i * 34) % 26;
    if (a < 0) a += 26;
    let b = secret[18 + i * 2];
    if (b <= 96) b += 32;
    b = (b - 115 - i * 34) % 26;
    if (b < 0) b += 26;
    let v = (a << 4) | b;
    const base = v >= 97 ? 97 : 65;
    v -= base;
    if (i === 0) state = 2 + v;
    out[i] = ((v + state) % 26) + base;
    state += 3 + v;
  }
  return out;
};

Bot.prototype.boostSpeed = function (v) {
  this.isBoost = !!v;
  this.send(Buffer.from([this.isBoost ? 253 : 254]));
};

Bot.prototype.onMessage = function (data) {
  const b = Buffer.from(data);
  if (b.length < 3) return;
  const type = String.fromCharCode(b[2]);

  if (type === '6') {
    try {
      this.send(this.decodeSecrect(b));
    } catch (e) {
      this.lastError = `Challenge decode failed: ${e.message}`;
      if (process.env.DEBUG === '1') console.error(`[Bot ${this.id}] ${this.lastError}`);
      try { this.ws.close(); } catch (_) {}
      return;
    }
    this.joined = true;
    this.state = 'joined';
    this.spawn();
  } else if (type === 'p') {
    this.send(Buffer.from([251]));
  } else if (type === 'a') {
    clearTimeout(this._movementTimer);
    const loop = () => {
      if (!this.botManager || !this.botManager.isRunning()) return;
      const t = this.botManager.getMovementTarget();
      if (t && t.x != null && t.y != null) this.moveTo(t.x, t.y);
      this._movementTimer = setTimeout(loop, 180);
    };
    loop();
    clearInterval(this._pingTimer);
    this._pingTimer = setInterval(() => this.send(Buffer.from([251])), 150);
  } else if (type === 'v') {
    this.joined = false;
    this.state = 'connected';
  } else if ((type === 'g' || type === 'n') && b.length >= 9) {
    const id = b.readUInt16BE(3);
    if (id === this.snakeID) {
      this.snakeX = b.readInt16BE(5);
      this.snakeY = b.readInt16BE(7);
    }
  } else if (type === 's' && b.length >= 5) {
    const id = b.readUInt16BE(3);
    // The first 's' packet with a body is our own snake in the supplied protocol.
    if (!this.haveSnakeID || id === this.snakeID) {
      this.snakeID = id;
      this.haveSnakeID = true;
      this.state = 'joined';
    }
  }
};

module.exports = Bot;
