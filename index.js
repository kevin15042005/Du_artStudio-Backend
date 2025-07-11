import express from "express";
import cors from "cors";
import fs from "fs";
import db from "./db.js";
import noticiasRoutes from "./routes/noticias.js";
import noticiasPinturaRoutes from "./routes/pintura.js";
import ShopRoutes from "./routes/Shop.js";
import adminRouter from "./routes/admin.js";
import AliadosRouter from "./routes/aliados.js";

const app = express();

app.use(cors({
  origin: process.env.VITE_API_URL, 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use("/noticias", noticiasRoutes);
app.use("/pintura", noticiasPinturaRoutes);
app.use("/Shop", ShopRoutes);
app.use("/admin", adminRouter);
app.use("/api/aliados", AliadosRouter);

// ✅ Aquí puedes usar express.json (para otras rutas que no usan archivos)
app.use(express.json());

// Carpeta de imágenes locales (por si llegas a usar multer local)
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
  console.log("📂 Carpeta 'uploads' creada");
}
app.use("/uploads", express.static("uploads"));

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
