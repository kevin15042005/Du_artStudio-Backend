import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// ✅ Obtener todas las noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(`
      SELECT id_Noticia, nombre_Noticias, contenido_Noticia, 
             fecha_Publicacion, cover 
      FROM Noticias 
      ORDER BY fecha_Publicacion DESC
    `);
    res.json(noticias);
  } catch (err) {
    console.error("Error al obtener noticias:", err);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

// ✅ Crear noticia con múltiples imágenes
router.post("/crear", upload.array("cover", 3), async (req, res) => {
  try {
    const { nombre_Noticias, contenido_Noticia } = req.body;

    if (!nombre_Noticias || !contenido_Noticia || !req.files.length) {
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const coverData = req.files.map((file) => ({
      url: file.path, // secure_url
      public_id: file.filename,
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
    console.error("Error al crear noticia:", err);
    res.status(500).json({ error: "Error al crear noticia" });
  }
});

// ✅ Actualizar noticia con reemplazo opcional de imágenes
router.put("/:id", upload.array("cover", 3), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_Noticias, contenido_Noticia } = req.body;

    const [noticia] = await db
      .promise()
      .query("SELECT cover FROM Noticias WHERE id_Noticia = ?", [id]);

    if (noticia.length === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    // Si vienen nuevas imágenes, eliminamos las anteriores
    let newCover = null;
    if (req.files.length > 0) {
      const oldCover = JSON.parse(noticia[0].cover || "[]");
      for (const img of oldCover) {
        try {
          await cloudinary.uploader.destroy(img.public_id);
        } catch (error) {
          console.error("❌ Error eliminando imagen antigua:", img.public_id);
        }
      }

      const newCoverData = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename,
      }));

      newCover = JSON.stringify(newCoverData);
    }

    // Armar query dinámica
    const query = newCover
      ? `UPDATE Noticias SET nombre_Noticias=?, contenido_Noticia=?, cover=? WHERE id_Noticia=?`
      : `UPDATE Noticias SET nombre_Noticias=?, contenido_Noticia=? WHERE id_Noticia=?`;

    const values = newCover
      ? [nombre_Noticias, contenido_Noticia, newCover, id]
      : [nombre_Noticias, contenido_Noticia, id];

    const [result] = await db.promise().query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No se pudo actualizar" });
    }

    res.json({ message: "✅ Noticia actualizada correctamente" });
  } catch (err) {
    console.error("Error al actualizar noticia:", err);
    res.status(500).json({ error: "Error al actualizar noticia" });
  }
});

// ✅ Eliminar noticia y sus imágenes de Cloudinary
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [noticia] = await db
      .promise()
      .query("SELECT cover FROM Noticias WHERE id_Noticia = ?", [id]);

    if (noticia.length === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    const coverData = JSON.parse(noticia[0].cover || "[]");

    // Eliminar imágenes de Cloudinary
    for (const img of coverData) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (err) {
        console.error("❌ Error eliminando imagen:", img.public_id);
      }
    }

    // Eliminar noticia de la base de datos
    const [result] = await db
      .promise()
      .query("DELETE FROM Noticias WHERE id_Noticia = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No se pudo eliminar" });
    }

    res.json({ message: "✅ Noticia e imágenes eliminadas correctamente" });
  } catch (err) {
    console.error("Error al eliminar noticia:", err);
    res.status(500).json({ error: "Error al eliminar noticia" });
  }
});

export default router;
