import http from "node:http";
import { Server } from "socket.io";
import { crearApp } from "./app.js";
import { registrarSala } from "./sockets/lobbyJuego.js";
import { GeneradorId } from "./services/GeneradorDeIds.js";
import { MonitorExpiracion } from "./services/MonitorExpiracion.js";
import { RegistroNicknames } from "./services/RegistroNicknames.js";
import { PartidaManager } from "./services/PartidaManager.js";

/**
 * F: Unir todas las piezas del servidor.
 * E: config.
 * S: objeto.
 * R: No abre el puerto hasta que se llame iniciar().
 */
export function crearServidor(config) {
  const registry = new RegistroNicknames(config.nickname);
  const manager = new PartidaManager({
    config,
    generadorId: new GeneradorId(6),
  });
  const app = crearApp({ config, registry, manager });
  const httpServer = http.createServer(app);
  const origenes = config.servidor.origenesPermitidos;
  const io = new Server(httpServer, {
    cors: { origin: origenes.includes("*") ? true : origenes },
  });
  registrarSala(io, { registry, manager });
  const monitor = new MonitorExpiracion({
    manager,
    intervaloMs: config.partida.intervaloMonitorMs,
  });

  return {
    app,
    httpServer,
    io,
    registry,
    manager,
    monitor,

    /**
     * F: Abrir el puerto y arrancar el monitor de expiración.
     * E: Puerto.
     * S: Promise con el puerto efectivo.
     * R: Rechaza la promesa si el puerto está ocupado.
     */
    iniciar(puerto = config.servidor.puerto) {
      return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(puerto, () => {
          httpServer.off("error", reject);
          monitor.iniciar();
          resolve(httpServer.address().port);
        });
      });
    },

    /**
     * F: Apagar el servidor de forma ordenada.
     * E: Ninguna.
     * S: Promise que se resuelve al cerrar.
     * R: Desconecta a todos los clientes.
     */
    async detener() {
      monitor.detener();
      await io.close();
    },
  };
}
