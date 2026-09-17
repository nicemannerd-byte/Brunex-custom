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
  function track(){const s=window.snake||window.slither;if(s&&Number.isFinite(Number(s.xx))&&Number.isFinite(Number(s.yy)))send({type:'movement',x:Number(s.xx),y:Number(s.yy)});}
  function init(){build();const url=localStorage.getItem('brunexControlUrl');if(url)window.brunexConnect(url);setInterval(track,100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
