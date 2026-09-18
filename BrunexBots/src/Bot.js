'use strict';

const WebSocket = require('ws');

const NAMES = ['Brunex Nova','Brunex Orbit','Brunex Titan','Brunex Scout','Brunex Ghost','Brunex Ace','Brunex Guard','Brunex Bot'];
const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const readU24=b=>b.length>=3?b[0]*65536+b[1]*256+b[2]:0;
const PROTOCOL_VERSION=Number(process.env.SLITHER_PROTOCOL_VERSION||19);
const DEFAULT_ORIGIN=process.env.GAME_ORIGIN||'http://slither.io';

function Bot(id){
 this.id=id;this.server='';this.serverInput='';this.origin=DEFAULT_ORIGIN;this.botManager=null;
 this.cosmetic=11;this.tag=12;this.persistentBoost=false;this.mode='follow';
 this.targetX=null;this.targetY=null;this.snakeID=null;this.snakeX=0;this.snakeY=0;
 this.haveSnakeID=false;this.hasConnected=false;this.joined=false;this.isBoost=false;
 this._reconnectTimer=null;this._movementTimer=null;this._pingTimer=null;this._manualDisconnect=false;
 this._candidateIndex=-1;this._pingInFlight=false;this.state='connecting';this.name='';
 this.lastError='';this.lastUrl='';this.lastClose='';this.lastHttpStatus=null;this.attempt=0;this.lastEvent='';
 this.serverProtocolVersion=null;this.lastPacketType='';this.lastPacketLength=0;
 this.tornadoSize=2000;this.tornadoSeparation=800;this.tornadoFinalAngle=90;this.tornadoRateOfChange=.5;
 this.tornadoRotationDir=1;this.tornadoActive=false;this.fixedCircleActive=false;
}
Bot.prototype.getState=function(){return this.state;};
Bot.prototype.log=function(message){this.lastEvent=message;if(process.env.BOT_LOG!=='0')console.log(`[Bot ${this.id}] ${message}`);};
Bot.prototype.send=function(data){if(this.ws&&this.ws.readyState===WebSocket.OPEN)try{this.ws.send(data);}catch(e){this.lastError=e.message;}};
Bot.prototype.connectionCandidates=function(){
 let raw=String(this.serverInput||this.server||'').trim();if(!raw)return[];
 if(/^wss?:\/\//i.test(raw))return[raw];
 if(/^https?:\/\//i.test(raw))return[raw.replace(/^http/i,'ws')];
 const host=raw.replace(/^\/+|\/+$/g,'');
 if(host.includes('/'))return[`ws://${host}`,`wss://${host}`];
 return[`ws://${host}/slither`,`ws://${host}/`,`wss://${host}/slither`,`wss://${host}/`];
};
Bot.prototype.connect=function(){
 if(this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING))return;
 if(!this.serverInput&&this.server)this.serverInput=this.server;if(!this.serverInput)return;
 this._manualDisconnect=false;this.state='connecting';const urls=this.connectionCandidates();if(!urls.length)return;
 this._candidateIndex=(this._candidateIndex+1)%urls.length;const url=urls[this._candidateIndex];
 this.lastUrl=url;this.lastHttpStatus=null;this.attempt++;
 const options={headers:{Origin:this.origin||DEFAULT_ORIGIN,'User-Agent':'Mozilla/5.0','Accept-Encoding':'gzip, deflate','Accept-Language':'en-US,en;q=0.8','Cache-Control':'no-cache','Pragma':'no-cache'},handshakeTimeout:8000,perMessageDeflate:false};
 try{options.headers.Host=new URL(url).host;}catch(e){this.lastError=`Invalid server endpoint: ${e.message}`;this.state='reconnecting';this.log(`invalid endpoint ${url}: ${this.lastError}`);this.scheduleReconnect(500);return;}
 try{
  const ws=this.ws=new WebSocket(url,options);ws.binaryType='nodebuffer';
  ws.on('message',d=>this.onMessage(ws,d));ws.on('open',()=>this.onOpen(ws));
  ws.on('close',(code,reason)=>this.onClose(ws,code,reason));ws.on('error',e=>this.onError(ws,e));
  ws.on('unexpected-response',(req,res)=>this.onUnexpectedResponse(ws,res));
  this.log(`attempt ${this.attempt} connecting to ${url}`);
 }catch(e){this.lastError=e.message;this.state='reconnecting';this.log(`connection setup failed for ${url}: ${this.lastError}`);this.scheduleReconnect(500);}
};
Bot.prototype.scheduleReconnect=function(delay){
 if(this._manualDisconnect||!this.botManager||!this.botManager.isRunning())return;
 clearTimeout(this._reconnectTimer);this._reconnectTimer=setTimeout(()=>{this._reconnectTimer=null;this.connect();},delay==null?1200+Math.random()*1800:delay);
};
Bot.prototype.setMode=function(m){this.mode=m||'follow';this.tornadoActive=this.mode==='tornado';this.fixedCircleActive=this.mode==='spiral';};
Bot.prototype.setTarget=function(x,y){const a=Number(x),b=Number(y);this.targetX=Number.isFinite(a)?a:null;this.targetY=Number.isFinite(b)?b:null;};
Bot.prototype.setTornadoSettings=function(s){s=s||{};this.tornadoSize=Number(s.size)||2000;this.tornadoSeparation=Number(s.separation)||800;this.tornadoFinalAngle=Number(s.finalAng)||90;this.tornadoRateOfChange=Number(s.rOC)||.5;this.tornadoRotationDir=Number(s.rotationDir)||1;};
Bot.prototype.buildSpawnPacket=function(){const name=this.name.slice(0,24);const bytes=Buffer.from(name,'utf8');const p=Buffer.alloc(4+bytes.length);p[0]=115;p[1]=Math.max(0,Math.min(255,PROTOCOL_VERSION-1));p[2]=Math.max(0,Math.min(38,Number(this.cosmetic)||0));p[3]=bytes.length;bytes.copy(p,4);return p;};
Bot.prototype.spawn=function(){this.name=`${NAMES[rand(0,NAMES.length-1)]} #${String(this.id).padStart(3,'0')}`;this.send(this.buildSpawnPacket());this._pingInFlight=true;this.send(Buffer.from([251]));};
Bot.prototype.moveTo=function(x,y){if(!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))return;let tx=Number(x),ty=Number(y);if((this.mode==='headhunter'||this.mode==='focus')&&this.targetX!==null&&this.targetY!==null){tx=this.targetX;ty=this.targetY;}let a=Math.atan2(ty-this.snakeY,tx-this.snakeX);if(this.mode==='wander')a+=((this.id%7)-3)*.35;if(this.tornadoActive)a+=Math.PI/2;if(this.fixedCircleActive)a+=(this.id%2?1:-1)*Math.PI/3;if(this.mode==='focus')a+=(this.id%2?1:-1)*.2;while(a<0)a+=Math.PI*2;while(a>=Math.PI*2)a-=Math.PI*2;const v=Math.max(0,Math.min(250,Math.floor(a*125/Math.PI)));this.send(this.isBoost?Buffer.from([v,253]):Buffer.from([v]));};
Bot.prototype.disconnect=function(){
 this._manualDisconnect=true;clearTimeout(this._reconnectTimer);clearTimeout(this._movementTimer);clearInterval(this._pingTimer);
 this._reconnectTimer=this._movementTimer=this._pingTimer=null;this._pingInFlight=false;
 const ws=this.ws;this.ws=null;
 // Keep the listeners installed. Removing the error listener while a CONNECTING
 // socket is being terminated can turn its asynchronous error into an unhandled
 // EventEmitter error (the previous "closed before established" crash).
 if(ws){try{if(ws.readyState===WebSocket.CONNECTING)ws.terminate();else if(ws.readyState===WebSocket.OPEN||ws.readyState===WebSocket.CLOSING)ws.close();}catch(_){} }
 if(this.hasConnected&&this.botManager){this.hasConnected=false;this.botManager.setConnectedCount(Math.max(0,this.botManager.getConnectedCount()-1));}
 this.state='stopped';this.joined=false;this.haveSnakeID=false;this.log('stopped');
};
Bot.prototype.isCurrentSocket=function(ws){return this.ws===ws;};
Bot.prototype.onOpen=function(ws){if(!this.isCurrentSocket(ws))return;this.state='connected';this.hasConnected=true;this.joined=false;this.lastError='';this.log(`WebSocket open: ${this.lastUrl}; sending handshake byte c`);this.send(Buffer.from([99]));if(this.botManager){this.botManager.setConnectedCount(this.botManager.getConnectedCount()+1);this.botManager.sendCountUpdate();}};
Bot.prototype.onClose=function(ws,code,reason){if(!this.isCurrentSocket(ws))return;clearTimeout(this._movementTimer);clearInterval(this._pingTimer);this._movementTimer=this._pingTimer=null;this._pingInFlight=false;this.lastClose=`${code}${reason&&reason.length?' '+Buffer.from(reason).toString('utf8'):''}`;if(this.hasConnected&&this.botManager){this.hasConnected=false;this.botManager.setConnectedCount(Math.max(0,this.botManager.getConnectedCount()-1));this.botManager.sendCountUpdate();}this.joined=false;this.haveSnakeID=false;this.ws=null;if(!this._manualDisconnect&&this.botManager&&this.botManager.isRunning()){this.state='reconnecting';this.log(`WebSocket closed (${this.lastClose || 'no close detail'}); reconnecting after ${this.lastError || 'no transport error'}`);this.scheduleReconnect();}else{this.state='stopped';this.log(`WebSocket closed (${this.lastClose || 'no close detail'})`);}};
Bot.prototype.onError=function(ws,e){if(!this.isCurrentSocket(ws))return;const message=e&&e.message||String(e);if(this.lastHttpStatus!==null&&message==='WebSocket was closed before the connection was established'){this.log(`WebSocket upgrade ended after HTTP ${this.lastHttpStatus}`);return;}this.lastError=message;this.log(`WebSocket error for ${this.lastUrl}: ${this.lastError}`);};
Bot.prototype.onUnexpectedResponse=function(ws,res){if(!this.isCurrentSocket(ws))return;this.lastHttpStatus=res.statusCode;this.lastError=`HTTP ${res.statusCode} during WebSocket upgrade`;this.log(`${this.lastError} from ${this.lastUrl}`);res.resume();try{ws.terminate();}catch(_){} };
Bot.prototype.decodeSecret=function(secret){if(!secret||secret.length<65)throw new Error(`invalid challenge length ${secret?secret.length:0}`);const out=new Uint8Array(24);let state=0;for(let i=0;i<24;i++){let a=secret[17+i*2];if(a<=96)a+=32;a=(a-98-i*34)%26;if(a<0)a+=26;let b=secret[18+i*2];if(b<=96)b+=32;b=(b-115-i*34)%26;if(b<0)b+=26;let v=(a<<4)|b;const base=v>=97?97:65;v-=base;if(i===0)state=2+v;out[i]=((v+state)%26)+base;state+=3+v;}return Buffer.from(out);};
Bot.prototype.decodeSecrect=Bot.prototype.decodeSecret;
Bot.prototype.boostSpeed=function(v){this.isBoost=!!v;this.send(Buffer.from([this.isBoost?253:254]));};
Bot.prototype.startMovementLoop=function(){clearTimeout(this._movementTimer);const loop=()=>{if(!this.botManager||!this.botManager.isRunning()||!this.joined)return;const t=this.botManager.getMovementTarget();if(t&&Number.isFinite(t.x)&&Number.isFinite(t.y))this.moveTo(t.x,t.y);this._movementTimer=setTimeout(loop,180);};loop();};
Bot.prototype.startPingLoop=function(){clearInterval(this._pingTimer);this._pingTimer=setInterval(()=>{if(!this._pingInFlight){this._pingInFlight=true;this.send(Buffer.from([251]));}},250);};
Bot.prototype.onMessage=function(ws,data){if(!this.isCurrentSocket(ws))return;const b=Buffer.from(data);if(b.length<3)return;const type=String.fromCharCode(b[2]);this.lastPacketType=type;this.lastPacketLength=b.length;if(type==='6'){try{this.send(this.decodeSecret(b));}catch(e){this.lastError=`Challenge decode failed: ${e.message}`;this.log(this.lastError);try{if(ws.readyState===WebSocket.OPEN)ws.close(1002,'challenge');else if(ws.readyState===WebSocket.CONNECTING)ws.terminate();}catch(_){}return;}this.state='verified';this.log(`received authentication challenge (${b.length} bytes); sending challenge response and spawn packet for protocol ${PROTOCOL_VERSION}`);this.spawn();return;}if(type==='p'){this._pingInFlight=false;return;}if(type==='a'){this.serverProtocolVersion=b.length>25?b[25]:null;this.log(`received game initialization packet; server protocol byte=${this.serverProtocolVersion}`);this.startPingLoop();if(this.joined)this.startMovementLoop();return;}if(type==='v'){this.joined=false;this.state='dead';clearTimeout(this._movementTimer);this._movementTimer=null;this.log('received death packet');return;}if((type==='g'||type==='n')&&b.length>=9){const id=b.readUInt16BE(3);if(id===this.snakeID){this.snakeX=b.readInt16BE(5);this.snakeY=b.readInt16BE(7);}return;}if((type==='G'||type==='N')&&b.length>=7&&this.haveSnakeID){const id=b.readUInt16BE(3);if(id===this.snakeID){this.snakeX+=b.readInt8(5)-128;this.snakeY+=b.readInt8(6)-128;}return;}if(type==='s'&&b.length>=6){const id=b.readUInt16BE(3);if(!this.haveSnakeID&&b.length>=34){this.snakeID=id;this.haveSnakeID=true;this.joined=true;this.state='joined';this.snakeX=readU24(b.subarray(18,21))/5;this.snakeY=readU24(b.subarray(21,24))/5;this.log(`spawn confirmed with snake id ${id}`);if(this.botManager){this.botManager.sendCountUpdate();this.startMovementLoop();}}else if(this.haveSnakeID&&id===this.snakeID&&b.length===6){this.haveSnakeID=false;this.joined=false;this.state='dead';this.log('received own snake removal packet');}}};
module.exports=Bot;
