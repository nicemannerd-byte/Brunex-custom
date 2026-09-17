'use strict';
const WebSocket=require('ws');
const host=process.env.CONTROL_HOST||'127.0.0.1';
const port=Number(process.env.CONTROL_PORT||8420);
const args=process.argv.slice(2);
const command=args[0]||'status';
const modes=['follow','wander','tornado','spiral','headhunter','focus','stop'];
function usage(){console.log(`\nBrunexBots CLI\n  status\n  start <server> [origin]\n  stop\n  mode <${modes.join('|')}>\n  target <name> <x> <y>\n  cleartarget\n  boost <on|off>\n`);}
const ws=new WebSocket(`ws://${host}:${port}/control`);
let done=false;
ws.on('open',()=>{
 const send=m=>ws.send(JSON.stringify(m));
 if(command==='status')send({type:'status'});
 else if(command==='start'&&args[1])send({type:'start',server:args[1],origin:args[2]||'http://localhost'});
 else if(command==='stop')send({type:'stop'});
 else if(command==='mode'&&modes.includes((args[1]||'').toLowerCase()))send({type:'mode',mode:args[1]});
 else if(command==='target'&&args[1]&&args[2]&&args[3])send({type:'target',name:args[1],x:Number(args[2]),y:Number(args[3])});
 else if(command==='cleartarget')send({type:'clearTarget'});
 else if(command==='boost'&&(args[1]==='on'||args[1]==='off'))send({type:'boost',enabled:args[1]==='on'});
 else {usage();return ws.close();}
});
ws.on('message',raw=>{let m;try{m=JSON.parse(raw);}catch{return;}if(m.type==='error'){console.error(`ERROR: ${m.message}`);return ws.close();}if(m.type==='status'||m.type==='state'){if(command==='status'||m.type==='state'){console.log(`\nRunning: ${m.running}\nServer: ${m.server||'not set'}\nMode: ${m.mode}\nJoined: ${m.connected||0}/${m.maxBots||0}\nConnecting: ${m.connecting||0}`);if(Array.isArray(m.bots))console.table(m.bots.map(b=>({id:b.id,name:b.name,state:b.state,snakeId:b.snakeId??'-'})));}done=true;setTimeout(()=>ws.close(),100);}});
ws.on('error',e=>{if(!done)console.error(`Cannot reach controller at ${host}:${port}: ${e.message}`);});
