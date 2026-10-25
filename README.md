# habbo (nombre provisional)

Juego social web en vista isométrica y pixel art retro. Proyecto de aprendizaje:
el render isométrico, el pathfinding y los sprites están hechos a mano, sin motores.

> El nombre es provisional y se cambia en `shared/src/constants.ts` (`GAME_NAME`).
> Antes de publicar hay que sustituirlo por uno original.

## Requisitos

- Node.js 20 o superior (probado con Node 24)

## Arrancar

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Estructura

```
client/   Cliente: TypeScript + Vite + Canvas 2D
shared/   Tipos, constantes y lógica compartida con el servidor
server/   Servidor Socket.IO (fase 2, todavía vacío)
```
