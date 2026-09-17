'use strict';

class SocketHandler {
  constructor(io, bots, manager) {
    this.io = io; this.bots = bots; this.manager = manager;
    setInterval(() => this._0x6d4e(), 3000).unref();
    io.on('connection', socket => this.bind(socket));
  }
  _0x6d4e() { this.io.emit('botCount', this.manager.getConnectedCount()); this.io.emit('mode', this.manager.getMode()); }
  bind(socket) {
    socket.emit('botCount', this.manager.getConnectedCount()); socket.emit('mode', this.manager.getMode());
    socket.on('start', d => { try { if (!d?.ip) throw new Error('Missing bot server URL'); this.manager.setServer(d.ip, d.origin || process.env.GAME_ORIGIN || 'https://slither.io'); this.manager.start(); socket.emit('started', {maxBots:this.manager.botCount}); this._0x6d4e(); } catch(e) { socket.emit('controllerError', e.message); } });
    socket.on('stop', () => { this.manager.stopBots(); this._0x6d4e(); });
    const pos = d => { if (d && Number.isFinite(Number(d.x)) && Number.isFinite(Number(d.y))) this.manager.updatePosition(d.x,d.y); };
    socket.on('movement', pos); socket.on('pos', pos);
    socket.on('setMode', d => { try { const mode=this.manager.setMode(d?.mode); socket.emit('mode',mode); this._0x6d4e(); } catch(e) { socket.emit('controllerError',e.message); } });
    socket.on('setTarget', d => { if(d) this.manager.setTarget(d.name,d.x,d.y); });
    socket.on('target', d => { if(d) this.manager.updateTarget(d.x,d.y,d.name); });
    socket.on('clearTarget', () => this.manager.clearTarget());
    socket.on('toggleBoostSpeed', d => this.manager._0xsetBoostState(!!d?.shouldBoost));
    socket.on('toggleRandomMovement', () => this.manager.setMode('wander'));
    socket.on('toggleZigZagMovement', () => this.manager._0x9c2d());
    socket.on('toggleTornadoMovement', () => this.manager._0x3d8f());
    socket.on('toggleSpiralMovement', () => this.manager._0xToggleFixedCircle());
    socket.on('setTornadoSettings', d => this.manager._0x4f2a(d));
    socket.on('setCosmetic', d => { if(d?.cosmetic!==undefined) this.manager._0x3f8b(d.cosmetic); });
    socket.on('setTag', d => { if(d?.tag!==undefined) this.manager._0x7a9c(d.tag); });
    socket.on('getCosmeticInfo', () => socket.emit('cosmeticInfo',{currentCosmetic:this.manager._0x4e8f(),currentTag:this.manager._0x9b2a()}));
  }
}
module.exports = SocketHandler;
