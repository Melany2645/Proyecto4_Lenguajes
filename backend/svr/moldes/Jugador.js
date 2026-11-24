/**
 * Participante de una partida: nickname + color de serpiente que elegió.
 */
export class Jugador {
  /**
   * F: Representa a un usuario unido a una partida.
   * E: Un nickname, un color, unidoEn.
   * S: Instancia de Jugador con conectado.
   * R: El nickname y el color ya deben haber sido validados por quien lo construye.
   */
  constructor(nickname, color, unidoEn) {
    this.nickname = nickname;
    this.color = color;
    this.unidoEn = unidoEn;
    this.conectado = true;
  }

  /**
   * F: Obtener la representación pública del jugador.
   * E: Ninguna.
   * S: Un objeto tipo jugador.
   * R: No incluir datos internos.
   */
  serializar() {
    return {
      nickname: this.nickname,
      color: this.color,
      conectado: this.conectado,
    };
  }
}
