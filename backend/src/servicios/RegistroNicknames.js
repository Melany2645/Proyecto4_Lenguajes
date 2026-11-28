import { ErrorDominio } from "../errores.js";

/**
 * Registro de nicknames activos.
 *
 * Un nickname existe solo mientras su socket esté conectado.
 * La unicidad no distingue mayúsculas.
 */
export class RegistroNickmanes {
  /** @type {Map<string, {socketId: string, nickname: string}>} clave = nickname en minúsculas */
  #porNickname = new Map();
  /** @type {Map<string, string>} socketId -> nickname original */
  #porSocket = new Map();

  /**
   * F: Configurar las reglas de formato del nickname.
   * E: Reglas: longitudMinima, longitudMaxima, patron.
   * S: Instancia del registro vacío.
   * R: El patrón debe ser una expresión regular válida.
   */
  constructor({ longitudMinima, longitudMaxima, patron }) {
    this.longitudMinima = longitudMinima;
    this.longitudMaxima = longitudMaxima;
    this.patron = new RegExp(patron);
  }

  /**
   * F: Validar el formato de un nickname antes de revisar disponibilidad.
   * E: Un nickname.
   * S: Si es válido.
   * R: Se ignoran espacios al inicio y al final.
   */
  validarFormato(nickname) {
    if (typeof nickname !== "string")
      return { valido: false, motivo: "El nickname es obligatorio." };
    const limpio = nickname.trim();
    if (
      limpio.length < this.longitudMinima ||
      limpio.length > this.longitudMaxima
    ) {
      return {
        valido: false,
        motivo: `El nickname debe tener entre ${this.longitudMinima} y ${this.longitudMaxima} caracteres.`,
      };
    }
    if (!this.patron.test(limpio)) {
      return {
        valido: false,
        motivo: "Solo se permiten letras, números, guion y guion bajo.",
      };
    }
    return { valido: true };
  }

  /**
   * F: Consultar si un nickname puede usarse en este momento.
   * E: Un nickname.
   * S: Si se encuentra disponible.
   * R: No se reserva el nickname; la reserva real ocurre en registrar().
   */
  consultarDisponibilidad(nickname) {
    const formato = this.validarFormato(nickname);
    if (!formato.valido) return { disponible: false, motivo: formato.motivo };
    if (this.#porNickname.has(nickname.trim().toLowerCase())) {
      return { disponible: false, motivo: "Ese nickname ya está en uso." };
    }
    return { disponible: true };
  }

  /**
   * F: Reservar un nickname para un socket.
   * E: Un nickname y socketId.
   * S: El nickname normalizadoque quedó registrado.
   * R: Lanza ErrorDominio NICKNAME_INVALIDO, NICKNAME_OCUPADO o YA_AUTENTICADO.
   */
  registrar(nickname, socketId) {
    if (this.#porSocket.has(socketId)) {
      throw new ErrorDominio(
        "YA_AUTENTICADO",
        "Ya estás autenticado en esta conexión.",
      );
    }
    const estado = this.consultarDisponibilidad(nickname);
    if (!estado.disponible) {
      const codigo = this.validarFormato(nickname).valido
        ? "NICKNAME_OCUPADO"
        : "NICKNAME_INVALIDO";
      throw new ErrorDominio(codigo, estado.motivo);
    }
    const limpio = nickname.trim();
    this.#porNickname.set(limpio.toLowerCase(), { socketId, nickname: limpio });
    this.#porSocket.set(socketId, limpio);
    return limpio;
  }

  /**
   * F: Liberar el nickname asociado a un socket.
   * E: socketId.
   * S: El nickname liberado o null si el socket no estaba autenticado.
   * R:
   */
  liberar(socketId) {
    const nickname = this.#porSocket.get(socketId);
    if (!nickname) return null;
    this.#porSocket.delete(socketId);
    this.#porNickname.delete(nickname.toLowerCase());
    return nickname;
  }

  /**
   * F: Obtener el nickname de un socket autenticado.
   * E: socketId.
   * S: El nickname o undefined.
   * R: Ninguna.
   */
  nicknameDe(socketId) {
    return this.#porSocket.get(socketId);
  }

  /**
   * F: Cantidad de nicknames activos.
   * E: Ninguna.
   * S: Número.
   * R: Ninguna.
   */
  get total() {
    return this.#porSocket.size;
  }
}
