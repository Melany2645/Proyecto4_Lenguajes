import { Router } from "express";
import { configPublica } from "../config.js";

/**
 * F: Se encarga en construir las rutas REST de consulta.
 * E: La config, registry, manager.
 * S: Router de Express montable en /api.
 * R: Son rutas de solo lectura; las acciones
 * viajan por Socket.IO para unirse a la conexión del usuario.
 */
export function crearRutasApi({ config, registry, manager }) {
  const router = Router();

  /** Salud del servicio. */
  router.get("/salud", (_req, res) => {
    res.json({ ok: true, hora: new Date().toISOString() });
  });

  /** Configuración que el cliente. */
  router.get("/config", (_req, res) => {
    res.json(configPublica(config));
  });

  /** Se verifica la disponibilidad de un nickname mientras el usuario escribe. */
  router.get("/nicknames/disponible", (req, res) => {
    const { nickname } = req.query;
    res.json(
      registry.consultarDisponibilidad(
        typeof nickname === "string" ? nickname : "",
      ),
    );
  });

  /** Las partidas pendientes (el cliente además recibe actualizaciones en tiempo real). */
  router.get("/partidas", (_req, res) => {
    res.json(manager.listarPendientes());
  });

  /** Detalle de una partida por su código. */
  router.get("/partidas/:id", (req, res) => {
    const partida = manager.obtener(req.params.id.toUpperCase());
    if (!partida) {
      res
        .status(404)
        .json({
          codigo: "PARTIDA_NO_ENCONTRADA",
          mensaje: "No existe una partida con ese código.",
        });
      return;
    }
    res.json(manager.serializar(partida));
  });

  return router;
}
