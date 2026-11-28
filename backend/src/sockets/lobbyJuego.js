import { ErrorDominio } from "../errores.js";
import { EstadoPartida } from "../models/Estados.js";

export const SALA_LOBBY = "lobby";

/**
 * F: Nombre de la sala de Socket.IO que agrupa a los jugadores de una partida.
 * E: Un id, string de la partida.
 * S: Un string "partida:<id>".
 * R: El juego depende de esta sala.
 */
export const salaPartida = (id) => `partida:${id}`;

/**
 * F: Conectar el lobby con Socket.IO: autenticación por nickname, suscripción a la lista de
 * partidas en tiempo real y acciones de crear/unirse/elegir color/salir/entrar.
 * E: io, servidor de Socket.IO, registry y manager.
 * S: Ninguna.
 * R: Todos los eventos tienen que tener un nickname registrado.
 */
export function registrarSala(io, { registry, manager }) {
  const difundirLista = () =>
    io.to(SALA_LOBBY).emit("lobby:partidas", manager.listarPendientes());

  // El gestor avisa de los cambios; aquí se traducen a mensajes para los clientes.
  manager.on("cambio", (partida) => {
    difundirLista();
    if (partida.estado !== EstadoPartida.CANCELADA) {
      io.to(salaPartida(partida.id)).emit(
        "partida:actualizada",
        manager.serializar(partida),
      );
    }
  });
  manager.on("cancelada", (partida, motivo) => {
    io.to(salaPartida(partida.id)).emit("partida:cancelada", {
      id: partida.id,
      motivo,
    });
    io.in(salaPartida(partida.id)).socketsLeave(salaPartida(partida.id));
  });
  manager.on("entrando", (partida) => {
    io.to(salaPartida(partida.id)).emit(
      "partida:entrando",
      manager.serializar(partida),
    );
  });

  io.on("connection", (socket) => {
    /**
     * F: Registrar un manejador de evento con acuse y manejo uniforme de errores.
     * E: evento, accion, opciones.
     * S: Ninguna.
     * R: Manejo de errores.
     */
    const manejar = (evento, accion, { requiereLogin = true } = {}) => {
      socket.on(evento, (payload, ack) => {
        if (typeof payload === "function") {
          ack = payload;
          payload = {};
        }
        const responder = typeof ack === "function" ? ack : () => {};
        try {
          const nickname = registry.nicknameDe(socket.id);
          if (requiereLogin && !nickname) {
            throw new ErrorDominio(
              "NO_AUTENTICADO",
              "Debes ingresar un nickname primero.",
            );
          }
          const datos = accion(
            payload && typeof payload === "object" ? payload : {},
            nickname,
          );
          responder({ ok: true, ...datos });
        } catch (error) {
          if (error instanceof ErrorDominio) {
            responder({ ok: false, error: error.aJSON() });
          } else {
            console.error(`[gateway] error en "${evento}":`, error);
            responder({
              ok: false,
              error: {
                codigo: "ERROR_INTERNO",
                mensaje: "Ocurrió un error inesperado.",
              },
            });
          }
        }
      });
    };

    // Se maneja la autenticación por nickname (la unicidad se verifica en el servidor).
    manejar(
      "auth:login",
      ({ nickname }) => ({ nickname: registry.registrar(nickname, socket.id) }),
      { requiereLogin: false },
    );

    // El cliente se suscribe a la lista y recibe un snapshot inicial.
    manejar("lobby:suscribir", () => {
      socket.join(SALA_LOBBY);
      return { partidas: manager.listarPendientes() };
    });
    manejar("lobby:desuscribir", () => {
      socket.leave(SALA_LOBBY);
      return {};
    });

    // Crear partida (el creador queda unido con su color).
    manejar("partida:crear", (datos, nickname) => {
      const partida = manager.crear(nickname, datos);
      socket.join(salaPartida(partida.id));
      return { partida: manager.serializar(partida) };
    });

    // Unirse eligiendo un color.
    manejar("partida:unirse", ({ id, color }, nickname) => {
      const partida = manager.unirse(nickname, id, color);
      socket.join(salaPartida(partida.id));
      return { partida: manager.serializar(partida) };
    });

    // Cambiar de color mientras se espera.
    manejar("partida:elegirColor", ({ color }, nickname) => ({
      partida: manager.serializar(manager.elegirColor(nickname, color)),
    }));

    manejar("partida:salir", (_datos, nickname) => {
      const { partida } = manager.salir(nickname);
      socket.leave(salaPartida(partida.id));
      return {};
    });

    // Botón "entrar", se habilita cuando la partida se completa.
    manejar("partida:entrar", (_datos, nickname) => ({
      partida: manager.serializar(manager.entrar(nickname)),
    }));

    // Para que el cliente recupere su estado (por ejemplo tras recargar una vista).
    manejar("partida:actual", (_datos, nickname) => {
      const partida = manager.partidaDe(nickname);
      return { partida: partida ? manager.serializar(partida) : null };
    });

    socket.on("disconnect", () => {
      const nickname = registry.liberar(socket.id);
      if (nickname) manager.desconectar(nickname);
    });
  });
}
