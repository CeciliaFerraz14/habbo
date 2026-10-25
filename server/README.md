# Servidor de Pixel Springs

Servidor Node.js + Socket.IO. Tiene el estado "de verdad" del mundo y ejecuta
la misma simulación de `/shared` que el cliente usaba en modo local.

```
src/index.ts       Arranca HTTP + Socket.IO y crea los avatares de quien se conecta
src/gameServer.ts  Estado del mundo, ticks, validación de acciones y envío de cambios
```

## Cómo funciona

1. Cada `MOVE_TICK_MS` (400 ms) ejecuta `tick()` de `/shared`.
2. Los clientes mandan **acciones** (`socket.emit('action', ...)`). El servidor
   las valida y las aplica con el mismo `applyAction()` de `/shared`:
   - solo acepta los tipos de la lista `CLIENT_ACTIONS` (nunca `JOIN` ni `LEAVE`),
   - sustituye el `avatarId` por el del jugador de ese socket: nadie puede actuar
     en nombre de otro.
3. Cada 50 ms manda a todos un **parche** con lo que ha cambiado
   (`diffState()` de `shared/src/sync.ts`). Al conectarse, cada cliente recibe
   el estado completo (`welcome`).

## Arrancar

Desde la raíz del proyecto, `npm run dev` arranca servidor y cliente a la vez.
Solo el servidor: `npm run dev -w server` (puerto 3001).

Variables de entorno (opcionales, en `server/.env`):

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Web desde la que se permite conectar (CORS) |
