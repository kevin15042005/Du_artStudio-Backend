import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

function safeParseJSON(str) {
  try {
    const parsed = typeof str === "string" ? JSON.parse(str) : str;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

// Obtener todos los artículos
router.get("/", async (req, res) => {
  try {
    const [articulos] = await db.query("SELECT * FROM Shop");
    const formateados = articulos.map((item) => ({
      ...item,
      cover: safeParseJSON(item.cover),
    }));
    res.json(formateados);
  } catch (err) {
    console.error("Error al obtener artículos:", err);
    res.status(500).json({ error: "Error al obtener artículos" });
  }
});

// Crear artículo con múltiples imágenes
router.post("/crear", upload.array("cover"), (req, res) => {
  const { nombre_Shop, contenido_Shop, precio_Shop } = req.body;

  if (!nombre_Shop || !contenido_Shop || !precio_Shop || !req.files.length) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const coverData = req.files.map((file) => ({
    url: file?.secure_url || file?.path || "",
    public_id: file?.public_id || file?.filename || "",
  }));

  const cover = JSON.stringify(coverData);

  const q = `
    INSERT INTO Shop (nombre_Shop, contenido_Shop, precio_Shop, id_Administrador, cover)
    VALUES (?, ?, ?, ?, ?)`;

  db.query(q, [nombre_Shop, contenido_Shop, precio_Shop, 1, cover], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error al insertar artículo" });
    }
    return res.json({ message: "✅ Artículo publicado correctamente" });
  });
});

// Actualizar artículo (opcionalmente reemplazar imágenes)
router.put("/", upload.array("cover"), (req, res) => {
  const { id_Shop, nombre_Shop, contenido_Shop, precio_Shop } = req.body;

  const newCoverData = req.files.map((file) => ({
    url: file?.secure_url || file?.path || "",
    public_id: file?.public_id || file?.filename || "",
  }));

  const newCover = newCoverData.length ? JSON.stringify(newCoverData) : null;

  const q = newCover
    ? `UPDATE Shop SET nombre_Shop=?, contenido_Shop=?, precio_Shop=?, cover=? WHERE id_Shop=?`
    : `UPDATE Shop SET nombre_Shop=?, contenido_Shop=?, precio_Shop=? WHERE id_Shop=?`;

  const values = newCover
    ? [nombre_Shop, contenido_Shop, precio_Shop, newCover, id_Shop]
    : [nombre_Shop, contenido_Shop, precio_Shop, id_Shop];

  db.query(q, values, (err) => {
    if (err) {
      return res.status(500).json({ error: "Error al actualizar artículo" });
    }
    return res.json({
      message: "✅ Artículo actualizado correctamente",
      cover: newCoverData || [],
    });
  });
});

export default router;
