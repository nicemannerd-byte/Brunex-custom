'use strict';

const WebSocket = require('ws');
const NAMES = ['Brunex Nova','Brunex Orbit','Brunex Titan','Brunex Scout','Brunex Ghost','Brunex Ace','Brunex Guard','Brunex Bot'];
const rand = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const PROTOCOL_VERSION = Number(process.env.SLITHER_PROTOCOL_VERSION || 11);
const DEFAULT_ORIGIN = process.env.GAME_ORIGIN || 'https://slither.io';

function Bot(id){
  this.id=id; this.server=''; this.serverInput=''; this.origin=DEFAULT_ORIGIN; this.botManager=null;
  this.cosmetic=11; this.tag=12; this.persistentBoost=false; this.mode='follow';
  this.targetX=null; this.targetY=null; this.snakeID=null; this.snakeX=0; this.snakeY=0;
  this.haveSnakeID=false; this.hasConnected=false; this.joined=false; this.isBoost=false;
  this._reconnectTimer=null; this._movementTimer=null; this._pingTimer=null; this._manualDisconnect=false;
  this._candidateIndex=-1; this._pingInFlight=false; this.state='connecting'; this.name='';
  this.lastError=''; this.lastUrl=''; this.lastClose=''; this.attempt=0; this.serverProtocolVersion=null;
  this.tornadoSize=2000; this.tornadoSeparation=800; this.tornadoFinalAngle=90; this.tornadoRateOfChange=.5; this.tornadoRotationDir=1;
  this.tornadoActive=false; this.fixedCircleActive=false; this.fixedCircleX=null; this.fixedCircleY=null; this.fixedCircleSize=1712; this.fixedCircleFinalAngle=110; this.fixedCircleRateOfChange=.3; this.fixedCircleRotationDir=1;
}
Bot.prototype.getState=function(){return this.state;};
Bot.prototype.send=function(data){if(this.ws&&this.ws.readyState===WebSocket.OPEN)try{this.ws.send(data);}catch(e){this.lastError=e.message;}};
Bot.prototype.connectionCandidates=function(){
  let raw=String(this.serverInput||this.server||'').trim(); if(!raw)return[];
  if(/^wss?:\/\//i.test(raw))return[raw];
  if(/^https?:\/\//i.test(raw))raw=raw.replace(/^http/i,'ws');
  if(/^wss?:\/\//i.test(raw))return[raw];
  const host=raw.replace(/^\/+|\/+$/g,''); const hasPath=host.includes('/'); const port=(host.match(/:(\d+)(?:\/|$)/)||[])[1];
  if(hasPath)return[`wss://${host}`,`ws://${host}`];
  if(port==='443')return[`wss://${host}/slither`,`wss://${host}/`,`ws://${host}/slither`,`ws://${host}/`];
  return[`ws://${host}/slither`,`ws://${host}/`,`wss://${host}/slither`,`wss://${host}/`];
};
Bot.prototype.connect=function(){
  if(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING))return;
  if(!this.serverInput&&this.server)this.serverInput=this.server; if(!this.serverInput)return;
  this._manualDisconnect=false; this.state='connecting'; const urls=this.connectionCandidates(); if(!urls.length)return;
  this._candidateIndex=(this._candidateIndex+1)%urls.length; const url=urls[this._candidateIndex]; this.lastUrl=url; this.attempt++;
  const options={headers:{Origin:this.origin||DEFAULT_ORIGIN,'User-Agent':'Mozilla/5.0','Accept-Encoding':'gzip, deflate','Accept-Language':'en-US,en;q=0.8','Cache-Control':'no-cache',Pragma:'no-cache'},handshakeTimeout:8000};
  try{const u=new URL(url);options.headers.Host=u.host;if(u.protocol==='wss:')options.rejectUnauthorized=false;}catch(e){this.lastError=`Invalid server endpoint: ${e.message}`;this.state='reconnecting';this.scheduleReconnect(500);return;}
  try{
    this.ws=new WebSocket(url,options); this.ws.binaryType='nodebuffer';
    this.ws.on('message',d=>this.onMessage(d)); this.ws.on('open',()=>this.onOpen()); this.ws.on('close',(code,reason)=>this.onClose(code,reason)); this.ws.on('error',e=>this.onError(e));
    this.ws.on('unexpected-response',(req,res)=>{this.lastError=`HTTP ${res.statusCode}`;if(process.env.DEBUG==='1')console.error(`[Bot ${this.id}] ${url} -> HTTP ${res.statusCode}`);});
  }catch(e){this.lastError=e.message;this.state='reconnecting';this.scheduleReconnect(500);}
};
Bot.prototype.scheduleReconnect=function(delay){if(this._manualDisconnect||!this.botManager||!this.botManager.isRunning())return;clearTimeout(this._reconnectTimer);this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null;this.connect();},delay==null?1200+Math.random()*1800:delay);};
Bot.prototype.setMode=function(m){this.mode=m||'follow';this.tornadoActive=this.mode==='tornado';this.fixedCircleActive=this.mode==='spiral';};
Bot.prototype.setTarget=function(x,y){const a=Number(x),b=Number(y);this.targetX=Number.isFinite(a)?a:null;this.targetY=Number.isFinite(b)?b:null;};
Bot.prototype.setTornadoSettings=function(s){s=s||{};this.tornadoSize=Number(s.size)||2000;this.tornadoSeparation=Number(s.separation)||800;this.tornadoFinalAngle=Number(s.finalAng)||90;this.tornadoRateOfChange=Number(s.rOC)||.5;this.tornadoRotationDir=Number(s.rotationDir)||1;};
Bot.prototype.buildSpawnPacket=function(){
  const name=this.name.slice(0,24); const bytes=Buffer.from(name,'utf8'); const p=Buffer.alloc(4+bytes.length);
  p[0]=115; p[1]=Math.max(0,Math.min(255,PROTOCOL_VERSION-1)); p[2]=Math.max(0,Math.min(38,Number(this.cosmetic)||0)); p[3]=bytes.length; bytes.copy(p,4); return p;
};
Bot.prototype.spawn=function(){
  this.name=`${NAMES[rand(0,NAMES.length-1)]} #${String(this.id).padStart(3,'0')}`;
  this.send(this.buildSpawnPacket()); this._pingInFlight=true; this.send(Buffer.from([251]));
};
Bot.prototype.moveTo=function(x,y){
  if(!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))return; let tx=Number(x),ty=Number(y);
  if((this.mode==='headhunter'||this.mode==='focus')&&this.targetX!==null&&this.targetY!==null){tx=this.targetX;ty=this.targetY;}
  let a=Math.atan2(ty-this.snakeY,tx-this.snakeX); if(this.mode==='wander')a+=((this.id%7)-3)*.35; if(this.tornadoActive)a+=Math.PI/2; if(this.fixedCircleActive)a+=(this.id%2?1:-1)*Math.PI/3; if(this.mode==='focus')a+=(this.id%2?1:-1)*.2;
  while(a<0)a+=Math.PI*2; while(a>=Math.PI*2)a-=Math.PI*2; const v=Math.max(0,Math.min(250,Math.floor(a*125/Math.PI))); this.send(this.isBoost?Buffer.from([v,253]):Buffer.from([v]));
};
Bot.prototype.disconnect=function(){
  this._manualDisconnect=true; clearTimeout(this._reconnectTimer); clearTimeout(this._movementTimer); clearInterval(this._pingTimer); this._reconnectTimer=this._movementTimer=this._pingTimer=null; this._pingInFlight=false;
  if(this.ws){try{this.ws.removeAllListeners();this.ws.close();}catch(_){}this.ws=null;}
  if(this.hasConnected&&this.botManager){this.hasConnected=false;this.botManager.setConnectedCount(this.botManager.getConnectedCount()-1);}
  this.state='stopped';this.joined=false;this.haveSnakeID=false;
};
Bot.prototype.onOpen=function(){
  this.state='connected';this.hasConnected=true;this.joined=false;this.lastError='';this.send(Buffer.from([99]));
  if(this.botManager){this.botManager.setConnectedCount(this.botManager.getConnectedCount()+1);this.botManager.sendCountUpdate();}
};
Bot.prototype.onClose=function(code,reason){
  clearTimeout(this._movementTimer);clearInterval(this._pingTimer);this._movementTimer=this._pingTimer=null;this._pingInFlight=false;this.lastClose=`${code}${reason&&reason.length?' '+Buffer.from(reason).toString('utf8'):''}`;
  if(this.hasConnected&&this.botManager){this.hasConnected=false;this.botManager.setConnectedCount(this.botManager.getConnectedCount()-1);this.botManager.sendCountUpdate();}
  this.joined=false;this.haveSnakeID=false;this.ws=null;
  if(!this._manualDisconnect&&this.botManager&&this.botManager.isRunning()){this.state='reconnecting';this.scheduleReconnect();}else this.state='stopped';
};
Bot.prototype.onError=function(e){this.lastError=e&&e.message||String(e);if(process.env.DEBUG==='1')console.error(`[Bot ${this.id}] ${this.lastUrl}: ${this.lastError}`);};
Bot.prototype.decodeSecrect=function(secret){
  if(!secret||secret.length<65)throw new Error(`invalid challenge length ${secret?secret.length:0}`); const out=new Uint8Array(24);let state=0;
  for(let i=0;i<24;i++){let a=secret[17+i*2];if(a<=96)a+=32;a=(a-98-i*34)%26;if(a<0)a+=26;let b=secret[18+i*2];if(b<=96)b+=32;b=(b-115-i*34)%26;if(b<0)b+=26;let v=(a<<4)|b;const base=v>=97?97:65;v-=base;if(i===0)state=2+v;out[i]=((v+state)%26)+base;state+=3+v;}return Buffer.from(out);
};
Bot.prototype.boostSpeed=function(v){this.isBoost=!!v;this.send(Buffer.from([this.isBoost?253:254]));};
Bot.prototype.onMessage=function(data){
  const b=Buffer.from(data);if(b.length<3)return;const type=String.fromCharCode(b[2]);
  if(type==='6'){
    try{this.send(this.decodeSecrect(b));}catch(e){this.lastError=`Challenge decode failed: ${e.message}`;if(process.env.DEBUG==='1')console.error(`[Bot ${this.id}] ${this.lastError}`);try{this.ws.close(1002,'challenge');}catch(_){}return;}
    this.joined=false;this.state='verified';this.spawn();
  }else if(type==='p'){
    this._pingInFlight=false;
  }else if(type==='a'){
    this.serverProtocolVersion=b.length>25?b[25]:null;clearTimeout(this._movementTimer);
    const loop=()=>{if(!this.botManager||!this.botManager.isRunning())return;const t=this.botManager.getMovementTarget();if(t&&Number.isFinite(t.x)&&Number.isFinite(t.y))this.moveTo(t.x,t.y);this._movementTimer=setTimeout(loop,180);};loop();
    clearInterval(this._pingTimer);this._pingTimer=setInterval(()=>{if(!this._pingInFlight){this._pingInFlight=true;this.send(Buffer.from([251]));}},250);
  }else if(type==='v'){
    this.joined=false;this.state='dead';clearTimeout(this._movementTimer);this._movementTimer=null;
  }else if((type==='g'||type==='n')&&b.length>=9){const id=b.readUInt16BE(3);if(id===this.snakeID){this.snakeX=b.readInt16BE(5);this.snakeY=b.readInt16BE(7);}}
  else if(type==='s'&&b.length>=5){const id=b.readUInt16BE(3);if(!this.haveSnakeID&&b.length>=34){this.snakeID=id;this.haveSnakeID=true;this.joined=true;this.state='joined';}else if(this.haveSnakeID&&id===this.snakeID&&b.length===6){this.haveSnakeID=false;this.joined=false;this.state='dead';}}
};
module.exports=Bot;
