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

// 📄 Obtener todas las noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(`
      SELECT n.id_Noticia, n.nombre_Noticias, n.contenido_Noticia, 
             n.fecha_Publicacion, n.cover, n.enlace, a.nombre_Administrador
      FROM Noticias n
      JOIN Administrador a ON n.id_Administrador = a.id_Administrador
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

// ✅ Crear noticia (con enlace opcional)
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  const { nombre_Noticias, contenido_Noticia, id_Administrador, enlace } = req.body;

  if (
    !nombre_Noticias ||
    !contenido_Noticia ||
    !id_Administrador ||
    id_Administrador === "null" ||
    !req.files?.length
  ) {
    return res.status(400).json({ message: "Faltan datos requeridos o imágenes" });
  }

  try {
    const coverData = req.files.map((file) => ({
      url: file?.secure_url || file?.path || "",
      public_id: file?.public_id || file?.filename || "",
    }));

    const q = `INSERT INTO Noticias 
      (nombre_Noticias, contenido_Noticia, fecha_Publicacion, id_Administrador, cover, enlace) 
      VALUES (?, ?, NOW(), ?, ?, ?)`;

    const [result] = await db.promise().query(q, [
      nombre_Noticias,
      contenido_Noticia,
      id_Administrador,
      JSON.stringify(coverData),
      enlace || null,
    ]);

    res.status(201).json({ message: "✅ Noticia creada exitosamente", id: result.insertId });
  } catch (err) {
    console.error("❌ Error al crear noticia:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al crear noticia" });
  }
});

// 🔄 Actualizar noticia
router.put("/:id", upload.array("cover", 10), async (req, res) => {
  const { id } = req.params;
  const { nombre_Noticias, contenido_Noticia, enlace } = req.body;

  if (!id || !nombre_Noticias || !contenido_Noticia) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  try {
    const [rows] = await db.promise().query(
      `SELECT cover FROM Noticias WHERE id_Noticia = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "Noticia no encontrada" });

    let coverActual = safeParseJSON(rows[0].cover);

    if (req.files?.length > 0) {
      await deleteCloudinaryImages(coverActual);
      coverActual = req.files.map((file) => ({
        url: file?.secure_url || file?.path || "",
        public_id: file?.public_id || file?.filename || "",
      }));
    }

    await db.promise().query(`
      UPDATE Noticias 
      SET nombre_Noticias = ?, contenido_Noticia = ?, cover = ?, enlace = ?
      WHERE id_Noticia = ?
    `, [
      nombre_Noticias,
      contenido_Noticia,
      JSON.stringify(coverActual),
      enlace || null,
      id,
    ]);

    res.json({ message: "✅ Noticia actualizada correctamente", cover: coverActual });
  } catch (err) {
    console.error("❌ Error al actualizar noticia:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al actualizar noticia" });
  }
});

// ❌ Eliminar noticia
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT cover FROM Noticias WHERE id_Noticia = ?`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: "Noticia no encontrada" });

    const cover = safeParseJSON(rows[0].cover);
    await deleteCloudinaryImages(cover);

    await db.promise().query(`DELETE FROM Noticias WHERE id_Noticia = ?`, [id]);

    res.json({ message: "✅ Noticia eliminada correctamente", deletedImages: cover.length });
  } catch (err) {
    console.error("❌ Error al eliminar noticia:", err);
    res.status(500).json({ error: "Error al eliminar noticia" });
  }
});

export default router;
  