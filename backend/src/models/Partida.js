import { ErrorDominio } from "../errors.js";
import { EstadoPartida, TRANSICIONES } from "./Estados.js";

/**
 * Aquí se representa una partida de Vs Snake.
 *
 * Almacena: identificador, creador, tipo + variable, temática,
 * cantidad máxima de jugadores, participantes registrados y estado.
 *
 */
export class Partida {
  /**
   * F: Crear una partida en estado PENDIENTE.
   * E: Objeto con id, creador, tipo, variable, tematica, cantidadJugadores,
   *           creadaEn (ms epoch) y expiracionMs (duración máxima en espera, en ms).
   * S: Instancia de Partida sin jugadores.
   * R: Los datos ya deben de venir validados.
   */
  constructor({
    id,
    creador,
    tipo,
    variable,
    tematica,
    cantidadJugadores,
    creadaEn,
    expiracionMs,
  }) {
    this.id = id;
    this.creador = creador;
    this.tipo = tipo;
    this.variable = variable;
    this.tematica = tematica;
    this.cantidadJugadores = cantidadJugadores;
    this.creadaEn = creadaEn;
    this.expiracionMs = expiracionMs;
    this.estado = EstadoPartida.PENDIENTE;
    /** @type {import('./Jugador.js').Jugador[]} */
    this.jugadores = [];
  }

  /**
   * F: Saber si un nickname ya forma parte de la partida.
   * E: Un Nickname.
   * S: Un boolean.
   * R: Comparación exacta.
   */
  tieneJugador(nickname) {
    return this.jugadores.some((j) => j.nickname === nickname);
  }

  /**
   * F: Buscar al jugador con ese nickname.
   * E: Un nickname.
   * S: Jugador o undefined si no está en la partida.
   * R: Ninguna.
   */
  obtenerJugador(nickname) {
    return this.jugadores.find((j) => j.nickname === nickname);
  }

  /**
   * F: Verificar si un color de serpiente está libre dentro de la partida.
   * E: Color (id de la paleta), nicknameIgnorado.
   * S: boolean.
   * R: Ninguna.
   */
  colorDisponible(color, nicknameIgnorado = null) {
    return !this.jugadores.some(
      (j) => j.color === color && j.nickname !== nicknameIgnorado,
    );
  }

  /**
   * F: Indicar si ya se alcanzó la cantidad de jugadores configurada.
   * E: Ninguna.
   * S: Un boolean.
   * R: Ninguna.
   */
  estaCompleta() {
    return this.jugadores.length >= this.cantidadJugadores;
  }

  /**
   * F: Agregar un jugador a la lista de participantes.
   * E: Jugador (instancia de Jugador).
   * S: Ninguna.
   * R: Lanza ErrorDominio si la partida no está PENDIENTE, está llena,
   *                el nickname ya está unido o el color ya fue tomado.
   */
  agregarJugador(jugador) {
    if (this.estado !== EstadoPartida.PENDIENTE) {
      throw new ErrorDominio(
        "PARTIDA_NO_DISPONIBLE",
        "La partida ya no acepta jugadores.",
      );
    }
    if (this.estaCompleta()) {
      throw new ErrorDominio("PARTIDA_LLENA", "La partida ya está completa.");
    }
    if (this.tieneJugador(jugador.nickname)) {
      throw new ErrorDominio("YA_UNIDO", "Ya estás unido a esta partida.");
    }
    if (!this.colorDisponible(jugador.color)) {
      throw new ErrorDominio(
        "COLOR_OCUPADO",
        "Ese color ya fue elegido por otro jugador.",
      );
    }
    this.jugadores.push(jugador);
  }

  /**
   * F: Sacar a un jugador de la lista; si era el creador, el cargo pasa al jugador más antiguo.
   * E: Un nnickname.
   * S: Un boolean (true si el jugador estaba y fue retirado).
   * R: No cambia el estado de la partida (decide PartidaManager si queda vacía).
   */
  quitarJugador(nickname) {
    const indice = this.jugadores.findIndex((j) => j.nickname === nickname);
    if (indice === -1) return false;
    this.jugadores.splice(indice, 1);
    if (this.creador === nickname && this.jugadores.length > 0) {
      this.creador = this.jugadores[0].nickname;
    }
    return true;
  }

  /**
   * F: Cambiar el color de un jugador ya unido.
   * E: Nickname y color (id de la paleta).
   * S: Ninguna.
   * R: Lanza ErrorDominio si no está unido, la partida ya no está PENDIENTE
   *                o el color pertenece a otro jugador.
   */
  cambiarColor(nickname, color) {
    const jugador = this.obtenerJugador(nickname);
    if (!jugador)
      throw new ErrorDominio("NO_UNIDO", "No estás unido a esta partida.");
    if (this.estado !== EstadoPartida.PENDIENTE) {
      throw new ErrorDominio(
        "PARTIDA_NO_DISPONIBLE",
        "Ya no se puede cambiar el color.",
      );
    }
    if (!this.colorDisponible(color, nickname)) {
      throw new ErrorDominio(
        "COLOR_OCUPADO",
        "Ese color ya fue elegido por otro jugador.",
      );
    }
    jugador.color = color;
  }

  /**
   * F: Mover la partida a otro estado.
   * E: nuevoEstado (valor de EstadoPartida).
   * S: Ninguna.
   * R: Lanza ErrorDominio TRANSICION_INVALIDA si el cambio no está permitido.
   */
  transicionar(nuevoEstado) {
    const permitidos = TRANSICIONES[this.estado] ?? [];
    if (!permitidos.includes(nuevoEstado)) {
      throw new ErrorDominio(
        "TRANSICION_INVALIDA",
        `No se puede pasar de ${this.estado} a ${nuevoEstado}.`,
      );
    }
    this.estado = nuevoEstado;
  }

  /**
   * F: Determinar si una partida pendiente superó su tiempo máximo de espera.
   * E: Ahora (ms epoch).
   * S: Boolean (false si la partida ya no está PENDIENTE).
   * R: Ninguna.
   */
  haExpirado(ahora) {
    return (
      this.estado === EstadoPartida.PENDIENTE &&
      ahora - this.creadaEn >= this.expiracionMs
    );
  }

  /**
   * F: Obtener la representación pública de la partida para clientes y otros módulos.
   * E: Ahora (ms epoch) para calcular el tiempo restante de espera.
   * S: Objeto con id, creador, tipo, variable, tematica, cantidadJugadores, jugadores,
   *          estado, completa, creadaEn, expiraEn (ISO) y segundosRestantes.
   * R: Solo datos públicos.
   */
  serializar(ahora) {
    const expiraEnMs = this.creadaEn + this.expiracionMs;
    return {
      id: this.id,
      creador: this.creador,
      tipo: this.tipo,
      variable: this.variable,
      tematica: this.tematica,
      cantidadJugadores: this.cantidadJugadores,
      jugadores: this.jugadores.map((j) => j.serializar()),
      estado: this.estado,
      completa: this.estaCompleta(),
      creadaEn: new Date(this.creadaEn).toISOString(),
      expiraEn: new Date(expiraEnMs).toISOString(),
      segundosRestantes:
        this.estado === EstadoPartida.PENDIENTE
          ? Math.max(0, Math.ceil((expiraEnMs - ahora) / 1000))
          : null,
    };
  }
}
