/**
 * Revisa periódicamente el lobby y cancela las partidas que no iniciaron dentro del
 * tiempo máximo configurado.
 */
export class MonitorExpiracion {
  #temporizador = null;

  /**
   * F: Prepara el monitor.
   * E: manager, intervaloMs.
   * S: Instancia detenida.
   * R: IntervaloMs debe ser mayor que 0.
   */
  constructor({ manager, intervaloMs }) {
    this.manager = manager;
    this.intervaloMs = intervaloMs;
  }

  /**
   * F: Comenzar la revisión periódica.
   * E: Ninguna.
   * S: Ninguna.
   */
  iniciar() {
    if (this.#temporizador) return;
    this.#temporizador = setInterval(() => this.revisar(), this.intervaloMs);
    this.#temporizador.unref();
  }

  /**
   * F: Detener la revisión periódica.
   * E: Ninguna.
   * S: Ninguna.
   * R: Es seguro llamarlo si no estaba iniciado.
   */
  detener() {
    if (!this.#temporizador) return;
    clearInterval(this.#temporizador);
    this.#temporizador = null;
  }

  /**
   * F: Ejecutar una pasada de revisión.
   * E: Ninguna.
   * S: Arreglo de partidas canceladas en la pasada.
   * R: Los errores se registran en consola y no detienen al monitor.
   */
  revisar() {
    try {
      return this.manager.cancelarExpiradas();
    } catch (error) {
      console.error("[MonitorExpiracion] error en la revisión:", error);
      return [];
    }
  }
}
