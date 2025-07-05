// ✅ BACKEND: rutas de Noticias_Pintura
import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Obtener todas las noticias de pintura
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(
      `SELECT id_Noticias_Pintura, nombre_Noticia_Pintura, contenido_Noticia_Pintura, fecha_Publicacion, cover FROM Noticias_Pintura ORDER BY fecha_Publicacion DESC`
    );
    res.json(noticias);
  } catch (err) {
    console.error("Error al obtener noticias de pintura:", err);
    res.status(500).json({ error: "Error al obtener noticias de pintura" });
  }
});

// Crear noticia de pintura con Cloudinary
router.post("/crear", upload.array("cover"), async (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!nombre_Noticia_Pintura || !contenido_Noticia_Pintura || !req.files.length) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const coverData = req.files.map((file) => ({
    url: file.secure_url,
    public_id: file.public_id,
  }));

  const cover = JSON.stringify(coverData);

  const q = `INSERT INTO Noticias_Pintura (nombre_Noticia_Pintura, contenido_Noticia_Pintura, fecha_Publicacion, id_Administrador, cover) VALUES (?, ?, NOW(), ?, ?)`;

  db.query(q, [nombre_Noticia_Pintura, contenido_Noticia_Pintura, 1, cover], (err) => {
    if (err) return res.status(500).json({ error: "Error al insertar noticia" });
    return res.json({ message: "✅ Noticia publicada correctamente" });
  });
});

// Actualizar noticia de pintura con Cloudinary
router.put("/", upload.array("cover"), async (req, res) => {
  const { id_Noticias_Pintura, nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  let newCover = null;
  if (req.files.length > 0) {
    const [result] = await db.promise().query(
      `SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`,
      [id_Noticias_Pintura]
    );

    const oldCover = JSON.parse(result[0].cover || "[]");
    for (const img of oldCover) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (err) {
        console.warn("⚠️ Error eliminando imagen previa:", img.public_id);
      }
    }

    const newCoverData = req.files.map((file) => ({
      url: file.secure_url,
      public_id: file.public_id,
    }));

    newCover = JSON.stringify(newCoverData);
  }

  const q = newCover
    ? `UPDATE Noticias_Pintura SET nombre_Noticia_Pintura=?, contenido_Noticia_Pintura=?, cover=? WHERE id_Noticias_Pintura=?`
    : `UPDATE Noticias_Pintura SET nombre_Noticia_Pintura=?, contenido_Noticia_Pintura=? WHERE id_Noticias_Pintura=?`;

  const values = newCover
    ? [nombre_Noticia_Pintura, contenido_Noticia_Pintura, newCover, id_Noticias_Pintura]
    : [nombre_Noticia_Pintura, contenido_Noticia_Pintura, id_Noticias_Pintura];

  db.query(q, values, (err) => {
    if (err) return res.status(500).json({ error: "Error al actualizar noticia" });
    return res.json({ message: "✅ Noticia actualizada correctamente" });
  });
});

// Eliminar noticia de pintura
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [noticia] = await db.promise().query(
      "SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?",
      [id]
    );

    if (noticia.length === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    let coverData = [];

    try {
      coverData = JSON.parse(noticia[0].cover || "[]");
    } catch {
      const stringCovers = (noticia[0].cover || "").split(",");
      coverData = stringCovers.map((filename) => ({ public_id: filename.trim() }));
    }

    for (const img of coverData) {
      if (img.public_id) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (err) {
          console.error("❌ Error eliminando imagen:", img.public_id);
        }
      }
    }

    const [result] = await db
      .promise()
      .query("DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No se pudo eliminar" });
    }

    res.json({ message: "✅ Noticia e imágenes eliminadas correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar noticia:", err);
    res.status(500).json({ error: "Error al eliminar noticia" });
  }
});

export default router;