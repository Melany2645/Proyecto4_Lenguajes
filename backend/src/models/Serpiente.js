/**
 * Representa la serpiente de un jugador dentro del tablero.
 */
export class Serpiente {
  /**
   * F: Crear una serpiente de largo inicial 1.
   * E: Jugador y posicion inicial.
   * S: Instancia de Serpiente.
   * R: La posicion inicial debe estar disponible.
   */
  constructor(jugador, posicionInicial) {
    this.nickname = jugador.nickname;
    this.color = jugador.color;

    this.cuerpo = [{ ...posicionInicial }];

    this.direccion = null;
    this.detenida = true;

    this.comidaConsumida = 0;
    this.venenoConsumido = 0;
  }

  /**
   * F: Obtener la cabeza de la serpiente.
   * E: Ninguna.
   * S: Coordenadas de la cabeza.
   * R: La serpiente debe tener al menos una celda.
   */
  obtenerCabeza() {
    return this.cuerpo[0];
  }

  /**
   * F: Obtener el largo actual de la serpiente.
   * E: Ninguna.
   * S: Cantidad de segmentos.
   * R: Ninguna.
   */
  obtenerLargo() {
    return this.cuerpo.length;
  }

  /**
   * F: Cambiar la direccion de movimiento.
   * E: Direccion solicitada.
   * S: Boolean que indica si se acepto el cambio.
   * R: No permite invertir la direccion hacia el cuello.
   */
  cambiarDireccion(direccion) {
    const direcciones = {
      ARRIBA: { x: 0, y: -1 },
      ABAJO: { x: 0, y: 1 },
      IZQUIERDA: { x: -1, y: 0 },
      DERECHA: { x: 1, y: 0 }
    };

    if (!Object.hasOwn(direcciones, direccion)) {
      return false;
    }

    const movimiento = direcciones[direccion];
    const cabeza = this.obtenerCabeza();

    const siguiente = {
      x: cabeza.x + movimiento.x,
      y: cabeza.y + movimiento.y
    };

    // Evitar que la cabeza avance hacia el cuello.
    if (this.cuerpo.length > 1) {
      const cuello = this.cuerpo[1];

      if (
        siguiente.x === cuello.x &&
        siguiente.y === cuello.y
      ) {
        return false;
      }
    }

    this.direccion = movimiento;
    this.detenida = false;

    return true;
  }

  /**
   * F: Calcular la siguiente posicion de la cabeza.
   * E: Ninguna.
   * S: Coordenadas de la siguiente posicion o null.
   * R: La serpiente debe estar en movimiento.
   */
  siguientePosicion() {
    if (this.detenida || this.direccion === null) {
      return null;
    }

    const cabeza = this.obtenerCabeza();

    return {
      x: cabeza.x + this.direccion.x,
      y: cabeza.y + this.direccion.y
    };
  }

  /**
   * F: Desplazar la serpiente una celda.
   * E: Nueva posicion de la cabeza.
   * S: Ninguna.
   * R: La posicion debe haber sido validada.
   */
  mover(nuevaPosicion) {
    if (this.detenida) return;

    this.cuerpo.unshift({ ...nuevaPosicion });
    this.cuerpo.pop();
  }

  /**
   * F: Aumentar el largo de la serpiente hacia adelante.
   * E: Nueva posicion de la cabeza.
   * S: Ninguna.
   * R: Debe existir alimento en la posicion validada.
   */
  crecer(nuevaPosicion) {
    this.cuerpo.unshift({ ...nuevaPosicion });
    this.comidaConsumida++;
  }

  /**
   * F: Reducir el largo de la serpiente desde la cola.
   * E: Cantidad de segmentos a eliminar.
   * S: Ninguna.
   * R: Debe conservar al menos una celda.
   */
  reducir(cantidad) {
    for (
      let i = 0;
      i < cantidad && this.cuerpo.length > 1;
      i++
    ) {
      this.cuerpo.pop();
    }
  }

  /**
   * F: Detener el movimiento de la serpiente.
   * E: Ninguna.
   * S: Ninguna.
   * R: Requiere una nueva direccion para continuar.
   */
  detener() {
    this.detenida = true;
    this.direccion = null;
  }

  /**
   * F: Obtener la representacion publica de la serpiente.
   * E: Ninguna.
   * S: Objeto con los datos de la serpiente.
   * R: Ninguna.
   */
  serializar() {
    return {
      nickname: this.nickname,
      color: this.color,
      cuerpo: this.cuerpo.map((celda) => ({ ...celda })),
      direccion: this.direccion
        ? { ...this.direccion }
        : null,
      detenida: this.detenida,
      largo: this.obtenerLargo(),
      comidaConsumida: this.comidaConsumida,
      venenoConsumido: this.venenoConsumido
    };
  }
}