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

// ✅ Obtener todas las noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(`
      SELECT id_Noticia, nombre_Noticias, contenido_Noticia, 
             fecha_Publicacion, cover 
      FROM Noticias 
      ORDER BY fecha_Publicacion DESC
    `);

    const formateadas = noticias.map((n) => ({
      ...n,
      cover: safeParseJSON(n.cover),
    }));

    res.json(formateadas);
  } catch (err) {
    console.error("❌ Error al obtener noticias:", err);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

// ✅ Crear noticia con múltiples imágenes
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  try {
    const { nombre_Noticias, contenido_Noticia } = req.body;

    if (!nombre_Noticias || !contenido_Noticia || !req.files.length) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const coverData = req.files.map((file) => ({
      url: file?.secure_url || file?.path || "",
      public_id: file?.public_id || file?.filename || "",
    }));

    const cover = JSON.stringify(coverData);

    const [result] = await db.promise().query(
      `INSERT INTO Noticias (
        nombre_Noticias, contenido_Noticia, 
        fecha_Publicacion, id_Administrador, cover
      ) VALUES (?, ?, NOW(), 1, ?)`,
      [nombre_Noticias, contenido_Noticia, cover]
    );

    res.status(201).json({
      message: "✅ Noticia creada exitosamente",
      id: result.insertId,
    });
  } catch (err) {
    console.error("❌ Error al crear noticia:", err);
    res.status(500).json({ error: "Error al crear noticia" });
  }
});

// ✅ Actualizar noticia con reemplazo opcional de imágenes
router.put("/:id", upload.array("cover", 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_Noticias, contenido_Noticia } = req.body;

    const [rows] = await db.promise().query(
      "SELECT cover FROM Noticias WHERE id_Noticia = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    let coverActual = safeParseJSON(rows[0].cover);

    if (req.files?.length > 0) {
      for (const img of coverActual) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (err) {
          console.error("❌ Error eliminando imagen anterior:", img.public_id);
        }
      }

      coverActual = req.files.map((file) => ({
        url: file?.secure_url || file?.path || "",
        public_id: file?.public_id || file?.filename || "",
      }));
    }

    await db.promise().query(
      `UPDATE Noticias 
       SET nombre_Noticias = ?, contenido_Noticia = ?, cover = ? 
       WHERE id_Noticia = ?`,
      [nombre_Noticias, contenido_Noticia, JSON.stringify(coverActual), id]
    );

    res.json({ message: "✅ Noticia actualizada correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar noticia:", err);
    res.status(500).json({ error: "Error al actualizar noticia" });
  }
});

// ✅ Eliminar noticia y sus imágenes
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.promise().query(
      "SELECT cover FROM Noticias WHERE id_Noticia = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    const coverData = safeParseJSON(rows[0].cover);

    for (const img of coverData) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (err) {
        console.error("❌ Error eliminando imagen:", img.public_id);
      }
    }

    await db.promise().query("DELETE FROM Noticias WHERE id_Noticia = ?", [id]);

    res.json({ message: "✅ Noticia e imágenes eliminadas correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar noticia:", err);
    res.status(500).json({ error: "Error al eliminar noticia" });
  }
});

export default router;
