import { cargarConfig } from "./config.js";
import { crearServidor } from "./server.js";

/**
 * Punto de entrada: carga config, crea el servidor y escucha en el puerto configurado.
 */
try {
  const config = cargarConfig();
  const servidor = crearServidor(config);
  const puerto = await servidor.iniciar();
  console.log(`Servidor Vs Snake escuchando en el puerto ${puerto}`);
} catch (error) {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exit(1);
}
