'use strict';

const http = require('http');
const WebSocket = require('ws');
const BotManager = require('./src/BotManager');

const PORT = Number.parseInt(process.env.CONTROL_PORT || '8420', 10);
const HOST = process.env.CONTROL_HOST || '0.0.0.0';
const manager = new BotManager();

const httpServer = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'});
        return res.end(JSON.stringify({service:'BrunexBots',ok:true,running:manager.isRunning(),mode:manager.mode,connected:manager.getConnectedCount(),maxBots:manager.botCount}));
    }
    res.writeHead(404); res.end('Not found');
});

const wss = new WebSocket.Server({noServer:true});
const clients = new Set();
const state = () => ({type:'state',running:manager.isRunning(),mode:manager.mode,connected:manager.getConnectedCount(),maxBots:manager.botCount,target:manager.targetName||''});
const broadcast = msg => { const text=JSON.stringify(msg); for(const ws of clients) if(ws.readyState===WebSocket.OPEN) ws.send(text); };

wss.on('connection', ws => {
    clients.add(ws); ws.send(JSON.stringify(state()));
    ws.on('message', raw => {
        let msg; try { msg=JSON.parse(raw.toString()); } catch (_) { return; }
        try {
            if(msg.type==='start'){ manager.setServer(msg.server,msg.origin||'http://localhost'); manager._0x8c7f(); }
            else if(msg.type==='stop') manager.stop();
            else if(msg.type==='movement') manager.updatePosition(msg.x,msg.y);
            else if(msg.type==='mode') manager.setMode(msg.mode);
            else if(msg.type==='target') manager.setTarget(msg.name,msg.x,msg.y);
            else if(msg.type==='boost') manager._0xsetBoostState(msg.enabled);
            else if(msg.type==='tornadoSettings') manager._0x4f2a(msg.settings);
            else if(msg.type==='cosmetic') manager._0x3f8b(msg.value);
            else if(msg.type==='tag') manager._0x7a9c(msg.value);
            broadcast(state());
        } catch(e) { ws.send(JSON.stringify({type:'error',message:e.message})); }
    });
    ws.on('close',()=>clients.delete(ws));
});

httpServer.on('upgrade',(request,socket,head)=>{
    if(request.url==='/control') return wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
    socket.destroy();
});

httpServer.listen(PORT,HOST,()=>{
    console.log(`BrunexBots controller listening on ${HOST}:${PORT}`);
    console.log(`Control endpoint: /control`);
    console.log(`Max bots: ${manager.botCount}`);
    console.log('Modes: F Follow | W Wander | T Tornado | S Spiral | H Head Hunter | C Focus | Q Stop');
});
setInterval(()=>broadcast(state()),3000).unref();

function shutdown(){ manager.stop(); for(const ws of clients){try{ws.close();}catch(_){}} httpServer.close(()=>process.exit(0)); setTimeout(()=>process.exit(0),3000).unref(); }
process.on('SIGINT',shutdown); process.on('SIGTERM',shutdown);
