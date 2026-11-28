import { EventEmitter } from "node:events";
import { ErrorDominio } from "../errores.js";
import { EstadoPartida } from "../models/Estados.js";
import { Jugador } from "../models/Jugador.js";
import { Partida } from "../models/Partida.js";

/**
 * Maneja el lobby: crear, tipo/temática/cantidad, expirar, listar, unirse, elegir color y "entrar" al tablero.
 *
 */
export class PartidaManager extends EventEmitter {
  /** @type {Map<string, Partida>} id -> partida */
  #partidas = new Map();
  /** @type {Map<string, string>} nickname -> id de la partida activa en la que participa */
  #partidaDeJugador = new Map();

  /**
   * F: Construir el gestor con la configuración y sus dependencias.
   * E: config, generadorId, reloj; donde config es la configuración validada, generadorId expone generar() y reloj
   * S: Instancia sin partidas.
   * R: Config debe haber pasado validarConfig.
   */
  constructor({ config, generadorId, reloj = () => Date.now() }) {
    super();
    this.config = config;
    this.generadorId = generadorId;
    this.reloj = reloj;
  }

  /**
   * F: Validar los parámetros de creación de una partida.
   * E: Datos.
   * S: Ninguna.
   * R: Lanza ErrorDominio TIPO_INVALIDO, VARIABLE_INVALIDA, TEMATICA_INVALIDA, CANTIDAD_INVALIDA o COLOR_INVALIDO.
   */
  #validarCreacion({ tipo, variable, tematica, cantidadJugadores, color }) {
    const { partida: reglas } = this.config;
    const reglasTipo = reglas.tipos[tipo];
    if (!reglasTipo) {
      throw new ErrorDominio(
        "TIPO_INVALIDO",
        "El tipo de partida debe ser TIEMPO o LARGO.",
      );
    }
    if (
      !Number.isInteger(variable) ||
      variable < reglasTipo.minimo ||
      variable > reglasTipo.maximo
    ) {
      throw new ErrorDominio(
        "VARIABLE_INVALIDA",
        `Para ${tipo} el valor debe ser un entero entre ${reglasTipo.minimo} y ${reglasTipo.maximo} ${reglasTipo.unidad}.`,
      );
    }
    if (!reglas.tematicas.some((t) => t.habilitada && t.id === tematica)) {
      throw new ErrorDominio(
        "TEMATICA_INVALIDA",
        "La temática elegida no está disponible.",
      );
    }
    if (
      !Number.isInteger(cantidadJugadores) ||
      cantidadJugadores < reglas.jugadoresMinimo ||
      cantidadJugadores > reglas.jugadoresMaximo
    ) {
      throw new ErrorDominio(
        "CANTIDAD_INVALIDA",
        `La cantidad de jugadores debe estar entre ${reglas.jugadoresMinimo} y ${reglas.jugadoresMaximo}.`,
      );
    }
    this.#validarColor(color);
  }

  /**
   * F: Comprobar que un color pertenezca a la paleta configurada.
   * E: Un color.
   * S: Ninguna.
   * R: Lanza ErrorDominio COLOR_INVALIDO si no existe en la paleta.
   */
  #validarColor(color) {
    if (!this.config.paleta.some((c) => c.id === color)) {
      throw new ErrorDominio(
        "COLOR_INVALIDO",
        "El color elegido no existe en la paleta.",
      );
    }
  }

  /**
   * F: Impedir que un usuario participe en dos partidas a la vez.
   * E: Un nickname.
   * S: Ninguna.
   * R: Lanza ErrorDominio YA_EN_PARTIDA si ya está en una partida activa.
   */
  #exigirLibre(nickname) {
    if (this.#partidaDeJugador.has(nickname)) {
      throw new ErrorDominio(
        "YA_EN_PARTIDA",
        "Ya estás participando en otra partida.",
      );
    }
  }

  /**
   * F: Crear una partida nueva con el usuario como creador y primer jugador.
   * E: Un nickname y datos.
   * S: Partida creada en estado PENDIENTE con el creador ya unido.
   * R: Lanza ErrorDominio si los datos son inválidos o el usuario ya está en una partida.
   */
  crear(nickname, datos) {
    this.#exigirLibre(nickname);
    this.#validarCreacion(datos);
    const ahora = this.reloj();
    const partida = new Partida({
      id: this.generadorId.generar(),
      creador: nickname,
      tipo: datos.tipo,
      variable: datos.variable,
      tematica: datos.tematica,
      cantidadJugadores: datos.cantidadJugadores,
      creadaEn: ahora,
      expiracionMs: this.config.partida.expiracionSegundos * 1000,
    });
    partida.agregarJugador(new Jugador(nickname, datos.color, ahora));
    this.#partidas.set(partida.id, partida);
    this.#partidaDeJugador.set(nickname, partida.id);
    this.emit("cambio", partida);
    return partida;
  }

  /**
   * F: Unir a un usuario a una partida pendiente con el color elegido.
   * E: Un nickname, un id y un color.
   * S: La Partida actualizada.
   * R: Lanza ErrorDominio PARTIDA_NO_ENCONTRADA, YA_EN_PARTIDA, COLOR_INVALIDO, PARTIDA_NO_DISPONIBLE, PARTIDA_LLENA o COLOR_OCUPADO. Emite 'cambio'.
   */
  unirse(nickname, id, color) {
    const partida = this.#obtenerOFallar(id);
    this.#exigirLibre(nickname);
    this.#validarColor(color);
    partida.agregarJugador(new Jugador(nickname, color, this.reloj()));
    this.#partidaDeJugador.set(nickname, partida.id);
    this.emit("cambio", partida);
    return partida;
  }

  /**
   * F: Cambiar el color de serpiente de un jugador mientras la partida espera.
   * E: Un nickname y un color.
   * S: La Partida actualizada.
   * R: Lanza ErrorDominio NO_UNIDO, COLOR_INVALIDO, COLOR_OCUPADO o PARTIDA_NO_DISPONIBLE.
   */
  elegirColor(nickname, color) {
    const partida = this.#partidaActivaDe(nickname);
    this.#validarColor(color);
    partida.cambiarColor(nickname, color);
    this.emit("cambio", partida);
    return partida;
  }

  /**
   * F: Sacar a un jugador de una partida que aún no inicia.
   * E: Un nickname.
   * S: El usuario fuera
   * R: Lanza ErrorDominio NO_UNIDO o NO_PUEDE_SALIR; si no queda nadie, la partida se cancela.
   */
  salir(nickname) {
    const partida = this.#partidaActivaDe(nickname);
    if (partida.estado !== EstadoPartida.PENDIENTE) {
      throw new ErrorDominio("NO_PUEDE_SALIR", "La partida ya comenzó.");
    }
    partida.quitarJugador(nickname);
    this.#partidaDeJugador.delete(nickname);
    if (partida.jugadores.length === 0) {
      this.#cancelar(partida, "Todos los jugadores abandonaron la partida.");
      return { partida, cancelada: true };
    }
    this.emit("cambio", partida);
    return { partida, cancelada: false };
  }

  /**
   * F: Entrar al juego una vez completos los jugadores.
   * E: Un nickname.
   * S: La Partida en estado PREPARACION.
   * R: Lanza ErrorDominio NO_UNIDO o PARTIDA_INCOMPLETA.
   */
  entrar(nickname) {
    const partida = this.#partidaActivaDe(nickname);
    if (partida.estado === EstadoPartida.PREPARACION) return partida;
    if (partida.estado !== EstadoPartida.PENDIENTE) {
      throw new ErrorDominio(
        "PARTIDA_NO_DISPONIBLE",
        "La partida no está esperando jugadores.",
      );
    }
    if (!partida.estaCompleta()) {
      throw new ErrorDominio(
        "PARTIDA_INCOMPLETA",
        "Faltan jugadores para entrar al juego.",
      );
    }
    partida.transicionar(EstadoPartida.PREPARACION);
    this.emit("entrando", partida);
    this.emit("cambio", partida);
    return partida;
  }

  /**
   * F: Cancelar las partidas pendientes que superaron su tiempo máximo de espera.
   * E: Ahora.
   * S: Arreglo con las partidas canceladas en esta pasada.
   * R: Solo afecta partidas PENDIENTE.
   */
  cancelarExpiradas(ahora = this.reloj()) {
    const canceladas = [];
    for (const partida of this.#partidas.values()) {
      if (partida.haExpirado(ahora)) {
        this.#cancelar(partida, "La partida expiró porque no inició a tiempo.");
        canceladas.push(partida);
      }
    }
    return canceladas;
  }

  /**
   * F: Manejar la caída de la conexión de un usuario.
   * E: Un nickname.
   * S: Ninguna.
   * R:
   */
  desconectar(nickname) {
    const id = this.#partidaDeJugador.get(nickname);
    if (!id) return;
    const partida = this.#partidas.get(id);
    if (partida.estado === EstadoPartida.PENDIENTE) {
      this.salir(nickname);
      return;
    }
    const jugador = partida.obtenerJugador(nickname);
    if (jugador) jugador.conectado = false;
    this.#partidaDeJugador.delete(nickname);
    this.emit("jugadorDesconectado", partida, nickname);
    this.emit("cambio", partida);
  }

  /**
   * F: Liberar a todos los jugadores de una partida terminada para que puedan jugar otra.
   * E: id.
   * S: Ninguna.
   * R: Llamar cuando la partida pase a FINALIZADA.
   */
  liberarJugadores(id) {
    const partida = this.#partidas.get(id);
    if (!partida) return;
    for (const jugador of partida.jugadores) {
      if (this.#partidaDeJugador.get(jugador.nickname) === id) {
        this.#partidaDeJugador.delete(jugador.nickname);
      }
    }
  }

  /**
   * F: Listar las partidas que esperan jugadores.
   * E: Ninguna.
   * S: Arreglo de partidas serializadas, de la más reciente a la más antigua.
   * R: Solo estado PENDIENTE.
   */
  listarPendientes() {
    const ahora = this.reloj();
    return [...this.#partidas.values()]
      .filter((p) => p.estado === EstadoPartida.PENDIENTE)
      .sort((a, b) => b.creadaEn - a.creadaEn)
      .map((p) => p.serializar(ahora));
  }

  /**
   * F: Buscar una partida por su identificador.
   * E: id.
   * S: Una Partida o undefined.
   * R: Ninguna.
   */
  obtener(id) {
    return this.#partidas.get(id);
  }

  /**
   * F: Obtener la partida activa de un usuario.
   * E: Un nickname.
   * S: Partida o undefined si no participa en ninguna.
   * R: Ninguna.
   */
  partidaDe(nickname) {
    const id = this.#partidaDeJugador.get(nickname);
    return id ? this.#partidas.get(id) : undefined;
  }

  /**
   * F: Serializar una partida con el reloj del gestor.
   * E: partida.
   * S: Objeto público de la partida.
   * R: Minguna.
   */
  serializar(partida) {
    return partida.serializar(this.reloj());
  }

  /**
   * F: Pasar una partida a CANCELADA, liberar a sus jugadores y avisar.
   * E: partida y motivo.
   * S: ninguna.
   * R: Solo desde PENDIENTE o PREPARACION.
   */
  #cancelar(partida, motivo) {
    partida.transicionar(EstadoPartida.CANCELADA);
    for (const jugador of partida.jugadores) {
      if (this.#partidaDeJugador.get(jugador.nickname) === partida.id) {
        this.#partidaDeJugador.delete(jugador.nickname);
      }
    }
    this.emit("cancelada", partida, motivo);
    this.emit("cambio", partida);
  }

  /**
   * F: Buscar una partida o fallar con un error claro.
   * E: id.
   * S: Partida.
   * R: Lanza ErrorDominio PARTIDA_NO_ENCONTRADA.
   */
  #obtenerOFallar(id) {
    const partida =
      typeof id === "string"
        ? this.#partidas.get(id.trim().toUpperCase())
        : undefined;
    if (!partida)
      throw new ErrorDominio(
        "PARTIDA_NO_ENCONTRADA",
        "No existe una partida con ese código.",
      );
    return partida;
  }

  /**
   * F: Obtener la partida activa de un usuario o fallar.
   * E: Un nickname.
   * S: Partida.
   * R: Lanza ErrorDominio NO_UNIDO si no participa en ninguna.
   */
  #partidaActivaDe(nickname) {
    const partida = this.partidaDe(nickname);
    if (!partida)
      throw new ErrorDominio("NO_UNIDO", "No estás unido a ninguna partida.");
    return partida;
  }
}
