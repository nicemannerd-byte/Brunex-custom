(() => {
  'use strict';
  const load = file => new Promise(resolve => {
    const s=document.createElement('script');
    s.src=chrome.runtime.getURL(file);
    s.onload=s.onerror=()=>{s.remove();resolve();};
    (document.head||document.documentElement).appendChild(s);
  });
  const init=async()=>{await load('inject.js');await load('mode-controls.js');};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
