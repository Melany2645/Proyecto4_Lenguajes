import { randomInt } from "node:crypto";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generador de identificadores únicos de partida.
 *
 * Usa un generador criptográfico y recuerda todos los códigos emitidos, de modo que
 * nunca entrega el mismo código dos veces.
 */
export class GeneradorDeIds {
  #emitidos = new Set();

  /**
   * F: Configurar la longitud del código.
   * E: Longitud.
   * S: Instancia del generador.
   * R: longitud >= 4 para mantener un espacio de códigos.
   */
  constructor(longitud = 6) {
    if (!Number.isInteger(longitud) || longitud < 4) {
      throw new Error(
        "La longitud del identificador debe ser un entero mayor o igual a 4.",
      );
    }
    this.longitud = longitud;
  }

  /**
   * F: Producir un identificador nuevo y único.
   * E: Ninguna.
   * S: Longitud.
   * R: Lanza Error si tras muchos intentos no encuentra un código libre.
   */
  generar() {
    for (let intento = 0; intento < 1000; intento += 1) {
      let codigo = "";
      for (let i = 0; i < this.longitud; i += 1) {
        codigo += ALFABETO[randomInt(ALFABETO.length)];
      }
      if (!this.#emitidos.has(codigo)) {
        this.#emitidos.add(codigo);
        return codigo;
      }
    }
    throw new Error(
      "No fue posible generar un identificador de partida único.",
    );
  }
}
