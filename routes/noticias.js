import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Función segura para parsear JSON
function safeParseJSON(str) {
  try {
    const parsed = typeof str === "string" ? JSON.parse(str) : str;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

// Eliminar imágenes Cloudinary
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

// Limpiar imágenes si falla
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

// 📄 Obtener todas las noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(`
      SELECT p.id_Noticias_Pintura, p.nombre_Noticia_Pintura, 
             p.contenido_Noticia_Pintura, p.fecha_Publicacion, 
             p.cover, p.enlace, a.nombre_Administrador
      FROM Noticias_Pintura p
      JOIN Administrador a ON p.id_Administrador = a.id_Administrador
      ORDER BY p.fecha_Publicacion DESC
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

// 📝 Crear noticia
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  const {
    nombre_Noticia_Pintura,
    contenido_Noticia_Pintura,
    enlace,
    id_Administrador,
  } = req.body;

  const adminID = id_Administrador || 1; // 👈 fallback si no se recibe

  if (!nombre_Noticia_Pintura || !contenido_Noticia_Pintura || !req.files?.length) {
    return res.status(400).json({ message: "Faltan datos o imágenes" });
  }

  try {
    const coverData = req.files.map((file) => ({
      url: file?.secure_url || file?.path || "",
      public_id: file?.public_id || file?.filename || "",
    }));

    const q = `
      INSERT INTO Noticias_Pintura 
      (nombre_Noticia_Pintura, contenido_Noticia_Pintura, fecha_Publicacion, id_Administrador, cover, enlace) 
      VALUES (?, ?, NOW(), ?, ?, ?)
    `;

    const [result] = await db.promise().query(q, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      adminID,
      JSON.stringify(coverData),
      enlace || "",
    ]);

    res.status(201).json({ message: "✅ Noticia creada correctamente", id: result.insertId });
  } catch (err) {
    console.error("❌ Error al crear noticia:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al crear noticia" });
  }
});

// 🔄 Actualizar
router.put("/:id", upload.array("cover", 10), async (req, res) => {
  const { id } = req.params;
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura, enlace } = req.body;

  if (!id || !nombre_Noticia_Pintura || !contenido_Noticia_Pintura) {
    return res.status(400).json({ message: "Faltan campos" });
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
      coverActual = req.files.map((file) => ({
        url: file?.secure_url || file?.path || "",
        public_id: file?.public_id || file?.filename || "",
      }));
    }

    await db.promise().query(
      `UPDATE Noticias_Pintura 
       SET nombre_Noticia_Pintura = ?, contenido_Noticia_Pintura = ?, cover = ?, enlace = ?
       WHERE id_Noticias_Pintura = ?`,
      [
        nombre_Noticia_Pintura,
        contenido_Noticia_Pintura,
        JSON.stringify(coverActual),
        enlace || "",
        id,
      ]
    );

    res.json({ message: "✅ Actualizada correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// ❌ Eliminar
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

    await db
      .promise()
      .query(`DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`, [id]);

    res.json({ message: "✅ Noticia eliminada", deletedImages: cover.length });
  } catch (err) {
    console.error("❌ Error al eliminar:", err);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

export default router;
