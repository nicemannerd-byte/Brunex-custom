(()=>{'use strict';
window.BrunexTornado={set(settings){if(window.socket)window.socket.emit('setTornadoSettings',settings||{});}};
})();
