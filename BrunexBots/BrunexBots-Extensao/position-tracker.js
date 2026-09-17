(()=>{'use strict';
const state={initialized:false,socket:null,last:0};
function readPlayer(){
 const s=window.snake||window.slither;
 if(s&&Number.isFinite(s.xx)&&Number.isFinite(s.yy))return{x:s.xx,y:s.yy};
 if(Number.isFinite(window.xx)&&Number.isFinite(window.yy))return{x:window.xx,y:window.yy};
 return null;
}
window.PositionTracker={initialize(socket){if(state.initialized)return;state.socket=socket;state.initialized=true;setInterval(()=>{const p=readPlayer();if(p&&state.socket){state.last=Date.now();try{state.socket.emit('movement',p);}catch(_){}}},100);},getStatus(){return{initialized:state.initialized,lastUpdate:state.last,hasSocketConnection:!!state.socket}}};
})();