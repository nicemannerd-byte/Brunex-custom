(() => {
  'use strict';
  const MODES = [['F','Follow','follow'],['W','Wander','wander'],['T','Tornado','tornado'],['S','Spiral','spiral'],['H','Head Hunter','headhunter'],['C','Focus','focus'],['Q','Stop','stop']];

  function start() {
    if (document.getElementById('brunex-mode-panel')) return;
    const style = document.createElement('style');
    style.textContent = `#brunex-mode-panel{position:fixed;right:12px;top:70px;z-index:2147483647;background:rgba(12,12,24,.94);color:#fff;padding:10px;border:1px solid #6d4aff;border-radius:12px;font:12px Arial,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)}#brunex-mode-panel .bm-title{font-weight:700;margin-bottom:7px}#brunex-mode-panel .bm-buttons{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}#brunex-mode-panel button{border:0;border-radius:7px;padding:7px 8px;background:#29243d;color:#fff;cursor:pointer}#brunex-mode-panel button.active{background:#6d4aff}#brunex-mode-panel input{width:170px;box-sizing:border-box;margin-top:7px;padding:7px;border-radius:7px;border:1px solid #51486d;background:#181526;color:#fff}#brunex-mode-panel .bm-status{margin-top:6px;color:#bdb7d9}`;
    document.head.appendChild(style);
    const panel = document.createElement('div');
    panel.id = 'brunex-mode-panel';
    panel.innerHTML = `<div class="bm-title">Brunex mode</div><div class="bm-buttons">${MODES.map(x=>`<button data-key="${x[0]}">${x[0]} · ${x[1]}</button>`).join('')}</div><input id="bm-target" placeholder="Target name (H/C)"><input id="bm-control" placeholder="Controller URL"><button id="bm-connect" style="width:100%;margin-top:6px">Connect controller</button><div class="bm-status">Controller: waiting…</div>`;
    document.body.appendChild(panel);

    const status = panel.querySelector('.bm-status'), target = panel.querySelector('#bm-target'), control = panel.querySelector('#bm-control'), connect = panel.querySelector('#bm-connect');
    control.value = localStorage.getItem('brunexControlUrl') || 'ws://127.0.0.1:8420';
    const socket = () => window.socket && typeof window.socket.emit === 'function' ? window.socket : null;
    const setMode = (mode,key) => { const s=socket(); if(!s){status.textContent='Controller: not connected';return;} s.emit('setMode',{mode}); panel.querySelectorAll('.bm-buttons button').forEach(b=>b.classList.toggle('active',b.dataset.key===key)); status.textContent=`Mode: ${mode}`; };
    panel.querySelectorAll('.bm-buttons button').forEach(b=>{const m=MODES.find(x=>x[0]===b.dataset.key);b.onclick=()=>setMode(m[2],m[0]);});
    target.onchange=()=>{const s=socket();if(s)s.emit('setTarget',{name:target.value.trim()});};
    connect.onclick=()=>{const url=control.value.trim();if(!url||typeof window.io!=='function'){status.textContent='Controller: Socket.IO unavailable';return;}localStorage.setItem('brunexControlUrl',url);try{if(window.socket&&window.socket.disconnect)window.socket.disconnect();}catch(_){}window.socket=window.io.connect(url,{transports:['websocket','polling']});status.textContent='Controller: connecting…';};
    document.addEventListener('keydown',e=>{if(e.repeat||/input|textarea|select/i.test(e.target?.tagName||''))return;const m=MODES.find(x=>x[0]===e.key.toUpperCase());if(m)setMode(m[2],m[0]);},true);
    setInterval(()=>{const s=socket();if(!s){status.textContent='Controller: disconnected';return;}status.textContent='Controller: connected';if(!s.__brunexModeListener){s.__brunexModeListener=true;s.on('mode',mode=>{const m=MODES.find(x=>x[2]===mode);if(m){panel.querySelectorAll('.bm-buttons button').forEach(b=>b.classList.toggle('active',b.dataset.key===m[0]));status.textContent=`Mode: ${mode}`;}});}},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
