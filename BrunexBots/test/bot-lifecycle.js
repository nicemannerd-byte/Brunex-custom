'use strict';
const assert=require('assert');
const http=require('http');
const {WebSocketServer}=require('ws');
const Bot=require('../src/Bot');
const waitFor=(predicate,timeout=2000)=>new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(predicate()){clearInterval(timer);resolve();}else if(Date.now()-started>timeout){clearInterval(timer);reject(new Error('timed out waiting for condition'));}},10);});
const manager={running:true,connected:0,isRunning(){return this.running;},setConnectedCount(n){this.connected=n;},getConnectedCount(){return this.connected;},sendCountUpdate(){},getMovementTarget(){return {x:100,y:100};}};
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return server.address().port;}
async function close(server){await new Promise(resolve=>server.close(resolve));}
async function compatibleServerTest(){
 const server=http.createServer();const wss=new WebSocketServer({server});const port=await listen(server);let stage=0;
 wss.on('connection',ws=>ws.on('message',packet=>{const p=Buffer.from(packet);if(stage===0){assert.deepStrictEqual([...p],[99]);stage=1;const challenge=Buffer.alloc(65,65);challenge[2]=54;ws.send(challenge);return;}if(stage===1){assert.strictEqual(p.length,24);stage=2;return;}if(stage===2){assert.strictEqual(p[0],115);assert.strictEqual(p[1],18);stage=3;const spawn=Buffer.alloc(34);spawn[2]=115;spawn.writeUInt16BE(321,3);spawn[18]=0;spawn[19]=1;spawn[20]=244;spawn[21]=0;spawn[22]=3;spawn[23]=232;ws.send(spawn);}}));
 const bot=new Bot(1);bot.serverInput=`ws://127.0.0.1:${port}/slither`;bot.botManager=manager;bot.connect();await waitFor(()=>bot.joined);
 assert.strictEqual(bot.state,'joined');assert.strictEqual(bot.snakeID,321);assert.strictEqual(manager.connected,1);assert.strictEqual(stage,3);bot.disconnect();await close(wss);await close(server);
}
async function disconnectWhileConnectingTest(){
 let socket;const server=http.createServer((req,res)=>{socket=req.socket;});const port=await listen(server);const bot=new Bot(3);bot.serverInput=`ws://127.0.0.1:${port}/slither`;bot.botManager=manager;bot.connect();await waitFor(()=>socket);bot.disconnect();assert.strictEqual(bot.state,'stopped');if(socket)socket.destroy();await close(server);
}
async function rejectedUpgradeTest(){
 const server=http.createServer((req,res)=>{res.writeHead(401,{'Content-Type':'text/plain'});res.end('unauthorized');});const port=await listen(server);const bot=new Bot(2);bot.serverInput=`ws://127.0.0.1:${port}/slither`;bot.botManager=manager;bot.connect();await waitFor(()=>bot.lastHttpStatus===401);
 await waitFor(()=>bot.state==='reconnecting');assert.match(bot.lastError,/HTTP 401/);assert.strictEqual(bot.ws,null);bot.disconnect();await close(server);
}
(async()=>{await compatibleServerTest();await disconnectWhileConnectingTest();await rejectedUpgradeTest();console.log('bot lifecycle tests passed');})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
