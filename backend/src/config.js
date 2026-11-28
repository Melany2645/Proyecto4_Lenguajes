import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RUTA_POR_DEFECTO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../config/config.json",
);

/**
 * F: Comprobar que un valor sea un número finito mayor que cero.
 * E: Un valor y un nombre.
 * S: Ninguna.
 * R: Lanza Error si el valor no cumple.
 */
function exigirPositivo(valor, nombre) {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    throw new Error(
      `Configuración inválida: "${nombre}" debe ser un número mayor que 0.`,
    );
  }
}

/**
 * F: Validar la estructura y los valores del archivo de configuración.
 * E: Config.
 * S: Ninguna.
 * R: Lanza Error con un mensaje claro en el primer problema encontrado.
 */
export function validarConfig(config) {
  const { servidor, nickname, partida, paleta, juego } = config ?? {};
  if (!servidor || !nickname || !partida || !paleta || !juego) {
    throw new Error(
      "Configuración inválida: faltan secciones (servidor, nickname, partida, paleta, juego).",
    );
  }
  exigirPositivo(servidor.puerto, "servidor.puerto");
  exigirPositivo(nickname.longitudMinima, "nickname.longitudMinima");
  exigirPositivo(nickname.longitudMaxima, "nickname.longitudMaxima");
  if (nickname.longitudMinima > nickname.longitudMaxima) {
    throw new Error(
      "Configuración inválida: nickname.longitudMinima > nickname.longitudMaxima.",
    );
  }
  new RegExp(nickname.patron); // lanza SyntaxError si el patrón es inválido

  exigirPositivo(partida.expiracionSegundos, "partida.expiracionSegundos");
  exigirPositivo(partida.intervaloMonitorMs, "partida.intervaloMonitorMs");
  if (partida.jugadoresMinimo < 2) {
    throw new Error(
      "Configuración inválida: partida.jugadoresMinimo debe ser al menos 2.",
    );
  }
  if (partida.jugadoresMaximo < partida.jugadoresMinimo) {
    throw new Error(
      "Configuración inválida: partida.jugadoresMaximo < partida.jugadoresMinimo.",
    );
  }
  for (const [tipo, reglas] of Object.entries(partida.tipos ?? {})) {
    exigirPositivo(reglas.minimo, `partida.tipos.${tipo}.minimo`);
    exigirPositivo(reglas.maximo, `partida.tipos.${tipo}.maximo`);
  }
  if (!partida.tipos?.TIEMPO || !partida.tipos?.LARGO) {
    throw new Error(
      "Configuración inválida: partida.tipos debe definir TIEMPO y LARGO.",
    );
  }
  if (!partida.tematicas?.some((t) => t.habilitada && t.id === "estandar")) {
    throw new Error(
      'Configuración inválida: la temática "estandar" es requerida y debe estar habilitada.',
    );
  }
  if (!Array.isArray(paleta) || paleta.length < partida.jugadoresMaximo) {
    throw new Error(
      "Configuración inválida: la paleta debe tener al menos un color por jugador máximo.",
    );
  }
  const ids = new Set(paleta.map((c) => c.id));
  if (ids.size !== paleta.length) {
    throw new Error(
      "Configuración inválida: la paleta tiene colores con id repetido.",
    );
  }
}

/**
 * F: Carga config.json y aplica sobreescrituras de entorno para el despliegue.
 * E: ruta.
 * S: Un objeto de configuración validado.
 * R: Lanza Error si el archivo no existe, no es JSON válido o no pasa la validación.
 */
export function cargarConfig(
  ruta = process.env.CONFIG_PATH ?? RUTA_POR_DEFECTO,
) {
  const config = JSON.parse(fs.readFileSync(ruta, "utf-8"));
  if (process.env.PORT) config.servidor.puerto = Number(process.env.PORT);
  if (process.env.CORS_ORIGINS) {
    config.servidor.origenesPermitidos = process.env.CORS_ORIGINS.split(
      ",",
    ).map((o) => o.trim());
  }
  validarConfig(config);
  return config;
}

/**
 * F: Obtener la parte de la configuración que el cliente necesita para armar sus formularios.
 * E: Config.
 * S: Objeto con nickname, partida con sus datos y paleta.
 * R:
 */
export function configPublica(config) {
  const { nickname, partida, paleta } = config;
  return {
    nickname: {
      longitudMinima: nickname.longitudMinima,
      longitudMaxima: nickname.longitudMaxima,
    },
    partida: {
      expiracionSegundos: partida.expiracionSegundos,
      jugadoresMinimo: partida.jugadoresMinimo,
      jugadoresMaximo: partida.jugadoresMaximo,
      tipos: partida.tipos,
      tematicas: partida.tematicas
        .filter((t) => t.habilitada)
        .map(({ id, nombre }) => ({ id, nombre })),
    },
    paleta,
  };
}
