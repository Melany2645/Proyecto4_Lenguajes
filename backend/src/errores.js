/**
 * Errores de dominio del servidor.
 *
 * Un ErrorDominio representa una regla de negocio no cumplida(nickname ocupado,
 * partida llena, color repetido, etc.). A diferencia de un error inesperado,
 * se le puede mostrar tal cual al usuario: el cliente recibe "codigo" y "mensaje".
 */
export class ErrorDominio extends Error {
  /**
   * F: Crear un error de dominio identificable por un código estable.
   * E: Un codigo y un mensaje.
   * S: Una instancia del ErrorDominio.
   * R: El código no debe de cambiar.
   */
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.codigo = codigo;
  }

  /**
   * F: Obtener la forma serializable que se envía al cliente.
   * E: Ninguna.
   * S: Un objeto.
   * R: Ninguna.
   */
  aJSON() {
    return { codigo: this.codigo, mensaje: this.message };
  }
}
