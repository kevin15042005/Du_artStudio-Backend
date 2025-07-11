import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Obtener noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(`
      SELECT id_Noticias_Pintura, nombre_Noticia_Pintura, 
             contenido_Noticia_Pintura, fecha_Publicacion, cover 
      FROM Noticias_Pintura 
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

// Crear noticia
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!nombre_Noticia_Pintura || !contenido_Noticia_Pintura || !req.files?.length) {
    return res.status(400).json({ message: "Faltan datos o imágenes" });
  }

  try {
    const coverData = req.files.map((file) => {
      const url = file?.secure_url || file?.path || "";
      const public_id = file?.public_id || file?.filename || "";
      return { url, public_id };
    });

    console.log("🧾 coverData a guardar:", coverData);

    const q = `INSERT INTO Noticias_Pintura 
      (nombre_Noticia_Pintura, contenido_Noticia_Pintura, fecha_Publicacion, id_Administrador, cover) 
      VALUES (?, ?, NOW(), ?, ?)`;

    const [result] = await db.promise().query(q, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      1,
      JSON.stringify(coverData),
    ]);

    res.status(201).json({ message: "✅ Publicada correctamente", id: result.insertId });
  } catch (err) {
    console.error("❌ Error al crear:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al crear noticia" });
  }
});

// Actualizar
router.put("/:id", upload.array("cover", 10), async (req, res) => {
  const { id } = req.params;
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!id || !nombre_Noticia_Pintura || !contenido_Noticia_Pintura) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "No encontrada" });

    let coverActual = safeParseJSON(rows[0].cover);

    if (req.files?.length > 0) {
      await deleteCloudinaryImages(coverActual);
      coverActual = req.files.map((file) => {
        const url = file?.secure_url || file?.path || "";
        const public_id = file?.public_id || file?.filename || "";
        return { url, public_id };
      });
    }

    await db.promise().query(`
      UPDATE Noticias_Pintura 
      SET nombre_Noticia_Pintura = ?, contenido_Noticia_Pintura = ?, cover = ?
      WHERE id_Noticias_Pintura = ?
    `, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      JSON.stringify(coverActual),
      id,
    ]);

    res.json({ message: "✅ Actualizada correctamente", cover: coverActual });
  } catch (err) {
    console.error("❌ Error al actualizar:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// Eliminar
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "No encontrada" });

    const cover = safeParseJSON(rows[0].cover);
    await deleteCloudinaryImages(cover);

    await db.promise().query(`DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`, [id]);

    res.json({ message: "✅ Eliminada", deletedImages: cover.length });
  } catch (err) {
    console.error("❌ Error al eliminar:", err);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

// Funciones auxiliares
function safeParseJSON(str) {
  try {
    const parsed = typeof str === "string" ? JSON.parse(str) : str;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function deleteCloudinaryImages(images) {
  await Promise.all(
    images.map((img) =>
      img.public_id
        ? cloudinary.uploader.destroy(img.public_id).catch((err) =>
            console.error(`❌ Error eliminando ${img.public_id}:`, err)
          )
        : Promise.resolve()
    )
  );
}

async function limpiarImagenesCloudinary(files) {
  await Promise.all(
    files.map((file) =>
      file.public_id
        ? cloudinary.uploader.destroy(file.public_id).catch((err) =>
            console.error(`❌ Error limpiando ${file.public_id}:`, err)
          )
        : Promise.resolve()
    )
  );
}

export default router;
