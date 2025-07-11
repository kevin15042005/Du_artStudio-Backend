import express from "express";
import cors from "cors";
import fs from "fs";
import db from "./db.js";

// Rutas
import noticiasRoutes from "./routes/noticias.js";
import noticiasPinturaRoutes from "./routes/pintura.js";
import ShopRoutes from "./routes/Shop.js";
import adminRouter from "./routes/admin.js";
import AliadosRouter from "./routes/aliados.js";

const app = express();

// ✅ Cambia esta URL por tu frontend en Vercel
const FRONTEND_URL = "https://du-art-studio-fron-end.vercel.app";

// ✅ CORS: Permitir peticiones desde Vercel
app.use(cors({
  origin: FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// ✅ Middleware para JSON
app.use(express.json());

// ✅ Rutas de tu app
app.use("/noticias", noticiasRoutes);
app.use("/pintura", noticiasPinturaRoutes);
app.use("/Shop", ShopRoutes);
app.use("/admin", adminRouter);
app.use("/api/aliados", AliadosRouter);

// ✅ Carpeta de imágenes locales (si usas multer local)
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("📂 Carpeta 'uploads' creada");
}
app.use("/uploads", express.static("uploads"));

// ✅ Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

// ✅ Cerrar conexión limpia a MySQL al apagar
process.on("SIGINT", () => {
  db.end((err) => {
    if (err) console.error("❌ Error cerrando conexión a MySQL:", err);
    else console.log("🔌 Conexión a MySQL cerrada");
    process.exit();
  });
});
