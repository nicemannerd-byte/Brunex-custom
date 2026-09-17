console.log('BrunexBots extension loaded');

function injectScript(file, next) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(file);
  script.onload = function () { this.remove(); if (next) next(); };
  script.onerror = function () { this.remove(); if (next) next(); };
  (document.head || document.documentElement).appendChild(script);
}

function loadBrunex() {
  injectScript('position-tracker.js', () => {
    injectScript('inject.js', () => {
      injectScript('tornado-simples.js', () => injectScript('mode-controls.js'));
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadBrunex, { once: true });
else loadBrunex();
