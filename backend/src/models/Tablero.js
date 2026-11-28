/**
 * Representa el tablero de juego.
 */
export class Tablero {

  /**
   * F: Crear el tablero.
   * E: Cantidad de jugadores.
   * S: Instancia de Tablero.
   * R: Cantidad de jugadores valida.
   */
  constructor(cantidadJugadores) {
    this.ancho = cantidadJugadores * 11;
    this.alto = cantidadJugadores * 11;
  }

  /**
   * F: Verificar si una posicion esta dentro del tablero.
   * E: Posicion.
   * S: Boolean.
   * R: Coordenadas enteras.
   */
  estaDentro(posicion) {
    if (posicion.x < 0 || posicion.x >= this.ancho) {
      return false;
    }

    if (posicion.y < 0 || posicion.y >= this.alto) {
      return false;
    }

    return true;
  }

  /**
   * F: Comparar dos posiciones.
   * E: Dos posiciones.
   * S: Boolean.
   * R: Ninguna.
   */
  mismaPosicion(posicion1, posicion2) {
    if (posicion1.x === posicion2.x &&
        posicion1.y === posicion2.y) {
      return true;
    }

    return false;
  }

  /**
   * F: Verificar si una posicion esta ocupada.
   * E: Posicion y arreglo de posiciones ocupadas.
   * S: Boolean.
   * R: Ninguna.
   */
  estaOcupada(posicion, posicionesOcupadas) {
    for (let i = 0; i < posicionesOcupadas.length; i++) {
      if (this.mismaPosicion(posicion, posicionesOcupadas[i])) {
        return true;
      }
    }

    return false;
  }

  /**
   * F: Generar una posicion aleatoria.
   * E: Ninguna.
   * S: Posicion.
   * R: Ninguna.
   */
  posicionAleatoria() {
    let x = Math.floor(Math.random() * this.ancho);
    let y = Math.floor(Math.random() * this.alto);

    return { x: x, y: y };
  }

  /**
   * F: Buscar una posicion libre aleatoria.
   * E: Arreglo de posiciones ocupadas.
   * S: Posicion libre o null.
   * R: Ninguna.
   */
  obtenerPosicionLibre(posicionesOcupadas) {
    let libres = [];

    for (let y = 0; y < this.alto; y++) {
      for (let x = 0; x < this.ancho; x++) {

        let posicion = { x: x, y: y };

        if (this.estaOcupada(posicion, posicionesOcupadas) === false) {
          libres.push(posicion);
        }
      }
    }

    if (libres.length === 0) {
      return null;
    }

    let indice = Math.floor(Math.random() * libres.length);

    return libres[indice];
  }

  /**
   * F: Obtener las dimensiones del tablero.
   * E: Ninguna.
   * S: Objeto con ancho y alto.
   * R: Ninguna.
   */
  serializar() {
    return {
      ancho: this.ancho,
      alto: this.alto
    };
  }
}