import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { readFileSync } from "node:fs";

// Cargar el archivo de configuración.
const config = JSON.parse(
  readFileSync(
    new URL("./config/config.json", import.meta.url),
    "utf8"
  )
);

// Crear la aplicación Express.
const app = express();

// Permitir la comunicación con el frontend.
app.use(cors({
  origin: config.servidor.origenesPermitidos
}));

app.use(express.json());

// Crear el servidor HTTP.
const servidor = createServer(app);

// Configurar Socket.IO.
const io = new Server(servidor, {
  cors: {
    origin: config.servidor.origenesPermitidos,
    methods: ["GET", "POST"]
  }
});

/**
 * F: Verificar el funcionamiento del servidor.
 * E: Solicitud HTTP.
 * S: Mensaje de confirmación en JSON.
 * R: Ninguna.
 */
app.get("/", (req, res) => {
  res.json({
    mensaje: "Servidor Vs Snake funcionando"
  });
});

/**
 * F: Detectar conexiones y desconexiones.
 * E: Socket del cliente.
 * S: Mensajes en la consola.
 * R: El cliente debe utilizar Socket.IO.
 */
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Iniciar el servidor.
servidor.listen(config.servidor.puerto, () => {
  console.log(
    `Servidor ejecutándose en http://localhost:${config.servidor.puerto}`
  );
});