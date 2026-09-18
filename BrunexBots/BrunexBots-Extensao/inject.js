(() => {
  'use strict';
  if (window.__brunexInjectLoaded) return;
  window.__brunexInjectLoaded = true;
  window.brUnexState = {connected:false,running:false,mode:'follow',bots:0,maxBots:100};

  const wsUrl = value => {
    if (!value) return '';
    if (/^wss?:\/\//i.test(value)) return value.replace(/\/$/,'') + '/control';
    if (/^https?:\/\//i.test(value)) return value.replace(/^http/i,'ws').replace(/\/$/,'') + '/control';
    return 'ws://' + value.replace(/\/$/,'') + '/control';
  };
  const send = msg => { const ws=window.brunexSocket; if(ws&&ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg)); };
  const update = () => {
    const c=document.getElementById('brunex-count'), s=document.getElementById('brunex-status'), m=document.getElementById('brunex-mode');
    if(c)c.textContent=`Bots: ${window.brUnexState.bots}/${window.brUnexState.maxBots}`;
    if(s)s.textContent=window.brUnexState.connected?(window.brUnexState.running?'Connected · Running':'Connected · Stopped'):'Controller offline';
    if(m)m.textContent=`Mode: ${window.brUnexState.mode}`;
  };
  window.brunexConnect = value => {
    const url=wsUrl(value); if(!url)return;
    try{if(window.brunexSocket)window.brunexSocket.close();}catch(_){ }
    const ws=new WebSocket(url); window.brunexSocket=ws;
    ws.onopen=()=>{window.brUnexState.connected=true;update();};
    ws.onclose=()=>{window.brUnexState.connected=false;update();};
    ws.onerror=()=>{window.brUnexState.connected=false;update();};
    ws.onmessage=e=>{try{const x=JSON.parse(e.data);if(x.type==='state')Object.assign(window.brUnexState,{running:!!x.running,mode:x.mode||'follow',bots:x.connected||0,maxBots:x.maxBots||100});update();}catch(_){}};
  };

  function build(){
    if(document.getElementById('brunex-ui'))return;
    const style=document.createElement('style');style.textContent='#brunex-ui{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(18,18,28,.96);color:#fff;padding:9px 12px;border:1px solid #7355ff;border-radius:10px;font:12px Arial;display:flex;gap:7px;align-items:center;box-shadow:0 5px 25px rgba(0,0,0,.35)}#brunex-ui button,#brunex-ui input,#brunex-ui select{background:#29263c;color:#fff;border:1px solid #514b70;border-radius:7px;padding:6px 8px}#brunex-ui input{width:190px}#brunex-status{min-width:125px}#brunex-mode{min-width:90px}';document.documentElement.appendChild(style);
    const box=document.createElement('div');box.id='brunex-ui';box.innerHTML='<b>BrunexBots</b><span id="brunex-count">Bots: 0/100</span><span id="brunex-mode">Mode: follow</span><span id="brunex-status">Controller offline</span><input id="brunex-control" placeholder="Controller URL"><button id="brunex-connect">Connect</button><button id="brunex-start">Start</button><button id="brunex-stop">Stop</button>';(document.body||document.documentElement).appendChild(box);
    const input=box.querySelector('#brunex-control');input.value=localStorage.getItem('brunexControlUrl')||'';
    box.querySelector('#brunex-connect').onclick=()=>{localStorage.setItem('brunexControlUrl',input.value.trim());window.brunexConnect(input.value.trim());};
    box.querySelector('#brunex-start').onclick=()=>send({type:'start',server:localStorage.getItem('brunexGameServer')||'ws://15.235.218.24:443/slither',origin:location.origin});
    box.querySelector('#brunex-stop').onclick=()=>send({type:'stop'});update();
  }
  function track(){
  const s=window.snake||window.slither;
  if(s&&Number.isFinite(Number(s.xx))&&Number.isFinite(Number(s.yy)))send({type:'movement',x:Number(s.xx),y:Number(s.yy)});
}
function worldSnapshot(){
  const self=window.snake||window.slither;
  const rawSnakes=window.snakes||window.snakeList||window.slitherSnakes||[];
  const rawFoods=window.foods||window.food||window.foodList||[];
  const snakes=[];
  const foods=[];
  const list=Array.isArray(rawSnakes)?rawSnakes:Object.values(rawSnakes||{});
  for(const q of list){
    if(!q||!Number.isFinite(Number(q.xx))||!Number.isFinite(Number(q.yy)))continue;
    const pts=Array.isArray(q.pts)?q.pts:Array.isArray(q.points)?q.points:[];
    const points=[];
    for(const p of pts.slice(0,80)){
      if(p&&Number.isFinite(Number(p.xx))&&Number.isFinite(Number(p.yy)))points.push({x:Number(p.xx),y:Number(p.yy)});
      else if(p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)))points.push({x:Number(p.x),y:Number(p.y)});
    }
    const vx=Number.isFinite(Number(q.sp))?Math.cos(Number(q.eang||q.ang||0))*Number(q.sp):0;
    const vy=Number.isFinite(Number(q.sp))?Math.sin(Number(q.eang||q.ang||0))*Number(q.sp):0;
    snakes.push({id:q.id,x:Number(q.xx),y:Number(q.yy),vx,vy,angle:Number(q.eang||q.ang||0),points});
  }
  const flist=Array.isArray(rawFoods)?rawFoods:Object.values(rawFoods||{});
  for(const f of flist.slice(0,600)){
    if(f&&Number.isFinite(Number(f.xx))&&Number.isFinite(Number(f.yy)))foods.push({x:Number(f.xx),y:Number(f.yy)});
    else if(f&&Number.isFinite(Number(f.x))&&Number.isFinite(Number(f.y)))foods.push({x:Number(f.x),y:Number(f.y)});
  }
  if(self)send({type:'world',world:{selfId:self.id==null?null:self.id,snakes,foods,timestamp:Date.now()}});
}
  function init(){build();const url=localStorage.getItem('brunexControlUrl');if(url)window.brunexConnect(url);setInterval(track,100);setInterval(worldSnapshot,150);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
