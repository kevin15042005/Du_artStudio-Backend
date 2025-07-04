import express from "express";
import cors from "cors";
import fs from "fs";
import db from "./db.js";
import noticiasRoutes from "./routes/noticias.js";
import noticiasPinturaRoutes from "./routes/pintura.js";

import ShopRoutes from "./routes/Shop.js";
import adminRouter from "./routes/admin.js"; 
import AliadosRouter from "./routes/aliados.js"
const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Carpeta de imágenes
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("📂 Carpeta 'uploads' creada");
}
app.use("/uploads", express.static("uploads"));

// Rutas
app.use("/noticias", noticiasRoutes);
app.use("/pintura", noticiasPinturaRoutes);
app.use("/Shop", ShopRoutes);
app.use("/admin", adminRouter); // también corregido
app.use("/api/aliados", AliadosRouter);
// Iniciar servidor
app.listen(8080, () => {
console.log(`🚀 Servidor corriendo en ${process.env.VITE_API_URL || "http://localhost:8080"}`);
});

// Cerrar conexión limpia
process.on("SIGINT", () => {
  db.end((err) => {
    if (err) console.error("❌ Error cerrando conexión a MySQL:", err);
    else console.log("🔌 Conexión a MySQL cerrada");
    process.exit();
  });
});


