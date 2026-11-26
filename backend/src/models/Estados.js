/**
 * Estados de una partida y reglas de transición
 *
 * PENDIENTE: La partida fue creada y espera jugadores
 * PREPARACION: Los jugadores entraron al tablero; me falta la tecla u******************.
 * EN_EJECUCION: El juego está corriendo.
 * FINALIZADA: Terminó por tiempo o por largo.
 * CANCELADA: Expiró sin iniciar o se quedó sin jugadores.
 */
export const EstadoPartida = Object.freeze({
  PENDIENTE: "PENDIENTE",
  PREPARACION: "PREPARACION",
  EN_EJECUCION: "EN_EJECUCION",
  FINALIZADA: "FINALIZADA",
  CANCELADA: "CANCELADA",
});

/** Tipos de partida. */
export const TipoPartida = Object.freeze({
  TIEMPO: "TIEMPO",
  LARGO: "LARGO",
});

/** Transiciones de estados: estado actual - estados a los que puede pasar. */
export const TRANSICIONES = Object.freeze({
  [EstadoPartida.PENDIENTE]: [
    EstadoPartida.PREPARACION,
    EstadoPartida.CANCELADA,
  ],
  [EstadoPartida.PREPARACION]: [
    EstadoPartida.EN_EJECUCION,
    EstadoPartida.CANCELADA,
  ],
  [EstadoPartida.EN_EJECUCION]: [EstadoPartida.FINALIZADA],
  [EstadoPartida.FINALIZADA]: [],
  [EstadoPartida.CANCELADA]: [],
});
