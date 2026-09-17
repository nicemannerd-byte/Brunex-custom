(() => {
  'use strict';
  if (window.__brunexModesLoaded) return;
  window.__brunexModesLoaded = true;
  const MODES=[['F','follow'],['W','wander'],['T','tornado'],['S','spiral'],['H','headhunter'],['C','focus'],['Q','stop']];
  const send=m=>{const ws=window.brunexSocket;if(ws&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));};
  const findTarget=name=>{const wanted=String(name||'').trim().toLowerCase();if(!wanted)return null;const out=[];for(const key of ['snakes','slithers','snakeList','entities','players','snakesById']){const v=window[key];if(Array.isArray(v))out.push(...v);else if(v&&typeof v==='object')out.push(...Object.values(v));}for(const o of out){if(!o||typeof o!=='object')continue;const n=o.name??o.nick??o.nickname??o.nk??o.username??'';if(String(n).trim().toLowerCase()===wanted&&Number.isFinite(Number(o.xx))&&Number.isFinite(Number(o.yy)))return{x:Number(o.xx),y:Number(o.yy)};}return null;};
  function build(){
    if(document.getElementById('brunex-modes'))return;
    const p=document.createElement('div');p.id='brunex-modes';p.style.cssText='position:fixed;right:10px;top:65px;z-index:2147483647;background:rgba(18,18,28,.96);color:#fff;padding:9px;border:1px solid #7355ff;border-radius:10px;font:12px Arial;display:flex;flex-direction:column;gap:6px;';
    p.innerHTML='<b>Brunex modes</b><div>'+MODES.map(([k,m])=>`<button data-mode="${m}" style="margin:2px;padding:6px 8px;background:#29263c;color:#fff;border:1px solid #514b70;border-radius:7px">${k}</button>`).join('')+'</div><input id="brunex-target" placeholder="Target name (H/C)" style="padding:6px;background:#29263c;color:#fff;border:1px solid #514b70;border-radius:7px"><button id="brunex-target-set" style="padding:6px;background:#29263c;color:#fff;border:1px solid #514b70;border-radius:7px">Set target</button>';
    document.documentElement.appendChild(p);
    p.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>send({type:'mode',mode:b.dataset.mode}));
    p.querySelector('#brunex-target-set').onclick=()=>{const name=p.querySelector('#brunex-target').value.trim();const t=findTarget(name);send(t?{type:'target',name,x:t.x,y:t.y}:{type:'target',name});};
    document.addEventListener('keydown',e=>{if(e.repeat||/INPUT|TEXTAREA|SELECT/i.test(e.target?.tagName||''))return;const m=MODES.find(([k])=>k===e.key.toUpperCase());if(m){e.preventDefault();send({type:'mode',mode:m[1]});}},true);
    setInterval(()=>{const name=p.querySelector('#brunex-target').value.trim();if(!name)return;const mode=window.brUnexState?.mode;if(mode!=='headhunter'&&mode!=='focus')return;const t=findTarget(name);if(t)send({type:'target',name,x:t.x,y:t.y});},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
