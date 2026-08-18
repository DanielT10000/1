// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();
let nextId = 1;

wss.on('connection', ws => {
  const id = nextId++;
  const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');

  clients.set(id, {
    ws,
    x: 22.5 + (Math.random()-0.5)*4,
    y: 12.5 + (Math.random()-0.5)*4,
    dirX: -1, dirY: 0,
    health: 100,
    color
  });

  console.log(`Player ${id} joined`);

  // Send current state to new player
  ws.send(JSON.stringify({
    type: 'init',
    yourId: id,
    players: Object.fromEntries(
      Array.from(clients).map(([k,v]) => [k, {x:v.x,y:v.y,dirX:v.dirX,dirY:v.dirY,health:v.health,color:v.color}])
    )
  }));

  // Tell everyone else someone joined
  broadcast({ type: 'join', id, x:clients.get(id).x, y:clients.get(id).y, dirX:-1, dirY:0, health:100, color }, id);

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      const p = clients.get(id);
      if (!p) return;

      if (data.type === 'move') {
        p.x = data.x;
        p.y = data.y;
        p.dirX = data.dirX;
        p.dirY = data.dirY;
        broadcast({ type: 'move', id, x:p.x, y:p.y, dirX:p.dirX, dirY:p.dirY }, id);
      }
      else if (data.type === 'shoot') {
        broadcast({ type: 'shoot', id, x:data.x, y:data.y, dirX:data.dirX, dirY:data.dirY }, id);
      }
      else if (data.type === 'hit') {
        const target = clients.get(data.targetId);
        if (target) {
          target.health = Math.max(0, data.health);
          broadcast({
            type: 'hit',
            targetId: data.targetId,
            health: target.health,
            attackerId: id
          }, null);
        }
      }
    } catch {}
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast({ type: 'leave', id });
    console.log(`Player ${id} left`);
  });
});

function broadcast(msg, exclude = null) {
  const str = JSON.stringify(msg);
  for (const [cid, {ws}] of clients) {
    if (cid !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  }
}

console.log('WebSocket server listening on ws://localhost:8080');