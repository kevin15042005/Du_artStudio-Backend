import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// 🔄 Parseo seguro de JSON
function safeParseJSON(str) {
  if (!str) return [];
  if (typeof str === "string") {
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (Array.isArray(str)) return str;
  if (typeof str === "object" && str !== null) return [str];
  return [];
}

// 🗑️ Eliminar imágenes de Cloudinary
async function deleteCloudinaryImages(images) {
  if (!Array.isArray(images)) return;
  await Promise.all(
    images.map((img) => {
      if (img?.public_id) {
        return cloudinary.uploader
          .destroy(img.public_id)
          .catch((err) =>
            console.error(`⚠️ Error eliminando imagen ${img.public_id}:`, err)
          );
      }
      return Promise.resolve();
    })
  );
}

// ✅ Obtener noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(
      `SELECT id_Noticias_Pintura, nombre_Noticia_Pintura, 
              contenido_Noticia_Pintura, fecha_Publicacion, cover 
       FROM Noticias_Pintura 
       ORDER BY fecha_Publicacion DESC`
    );

    const noticiasFormateadas = noticias.map((noticia) => ({
      ...noticia,
      cover: safeParseJSON(noticia.cover),
    }));

    res.json(noticiasFormateadas);
  } catch (err) {
    console.error("❌ Error al obtener noticias:", err);
    res.status(500).json({ error: "Error al obtener noticias de pintura" });
  }
});

// ✅ Crear noticia
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!nombre_Noticia_Pintura || !contenido_Noticia_Pintura || !req.files?.length) {
    return res.status(400).json({
      message: "Todos los campos son obligatorios y al menos una imagen es requerida",
    });
  }

  try {
    const coverData = req.files.map((file) => ({
      url: file.secure_url,
      public_id: file.public_id,
    }));

    const q = `INSERT INTO Noticias_Pintura 
               (nombre_Noticia_Pintura, contenido_Noticia_Pintura, fecha_Publicacion, id_Administrador, cover) 
               VALUES (?, ?, NOW(), ?, ?)`;

    const [result] = await db.promise().query(q, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      1,
      JSON.stringify(coverData),
    ]);

    res.status(201).json({
      message: "✅ Noticia publicada correctamente",
      id: result.insertId,
      cover: coverData,
    });
  } catch (err) {
    console.error("❌ Error al crear noticia:", err);
    await deleteCloudinaryImages(req.files);
    res.status(500).json({
      error: "Error al crear noticia",
      details: err.message,
    });
  }
});

// ✅ Actualizar noticia
router.put("/:id", upload.array("cover", 10), async (req, res) => {
  const { id } = req.params;
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!id || !nombre_Noticia_Pintura || !contenido_Noticia_Pintura) {
    return res.status(400).json({
      message: "ID, título y contenido son obligatorios",
    });
  }

  try {
    const [noticia] = await db
      .promise()
      .query("SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?", [id]);

    if (!noticia.length) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    let currentCover = safeParseJSON(noticia[0].cover) || [];

    // 🔄 Si suben nuevas imágenes, reemplazamos
    if (Array.isArray(req.files) && req.files.length > 0) {
      await deleteCloudinaryImages(currentCover);
      currentCover = req.files.map((file) => ({
        url: file.secure_url,
        public_id: file.public_id,
      }));
    }

    const q = `UPDATE Noticias_Pintura 
               SET nombre_Noticia_Pintura = ?, 
                   contenido_Noticia_Pintura = ?, 
                   cover = ?
               WHERE id_Noticias_Pintura = ?`;

    await db.promise().query(q, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      JSON.stringify(currentCover),
      id,
    ]);

    res.json({
      message: "✅ Noticia actualizada correctamente",
      cover: currentCover,
    });
  } catch (err) {
    console.error("❌ Error al actualizar noticia:", err);
    await deleteCloudinaryImages(req.files);
    res.status(500).json({
      error: "Error al actualizar noticia",
      details: err.message,
    });
  }
});

// ✅ Eliminar noticia
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [noticia] = await db
      .promise()
      .query("SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?", [id]);

    if (!noticia.length) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    const coverData = safeParseJSON(noticia[0].cover) || [];
    await deleteCloudinaryImages(coverData);

    const [result] = await db
      .promise()
      .query("DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No se pudo eliminar la noticia" });
    }

    res.json({
      message: "✅ Noticia e imágenes eliminadas correctamente",
      deletedImages: coverData.length,
    });
  } catch (err) {
    console.error("❌ Error al eliminar noticia:", err);
    res.status(500).json({
      error: "Error al eliminar noticia",
      details: err.message,
    });
  }
});

export default router;
