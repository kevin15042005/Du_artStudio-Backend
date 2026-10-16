import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// 🧠 Función para convertir JSON seguro
function safeParseJSON(str) {
  try {
    const parsed = typeof str === "string" ? JSON.parse(str) : str;
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

// ✅ Obtener todos los artículos
router.get("/", async (req, res) => {
  try {
    const [articulos] = await db.promise().query("SELECT * FROM Shop");
    const formateados = articulos.map((item) => ({
      ...item,
      cover: safeParseJSON(item.cover),
    }));
    res.json(formateados);
  } catch (err) {
    console.error("❌ Error al obtener artículos:", err);
    res.status(500).json({ error: "Error al obtener artículos" });
  }
});

// ✅ Crear artículo con imágenes
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  const { nombre_Shop, contenido_Shop, precio_Shop, id_Administrador } = req.body;

  if (!nombre_Shop || !contenido_Shop || !precio_Shop || !req.files?.length) {
    return res.status(400).json({ message: "Faltan campos o imágenes" });
  }

  const coverData = req.files.map((file) => ({
    url: file?.secure_url || file?.path || "",
    public_id: file?.public_id || file?.filename || "",
  }));

  try {
    const q = `
      INSERT INTO Shop (nombre_Shop, contenido_Shop, precio_Shop, id_Administrador, cover)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db
      .promise()
      .query(q, [
        nombre_Shop,
        contenido_Shop,
        precio_Shop,
        id_Administrador || 1,
        JSON.stringify(coverData),
      ]);

    res.status(201).json({
      message: "✅ Artículo creado correctamente",
      id: result.insertId,
    });
  } catch (err) {
    console.error("❌ Error al crear artículo:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al crear artículo" });
  }
});

// ✅ Actualizar artículo (con o sin nuevas imágenes)
router.put("/", upload.array("cover", 10), async (req, res) => {
  const { id_Shop, nombre_Shop, contenido_Shop, precio_Shop } = req.body;

  if (!id_Shop || !nombre_Shop || !contenido_Shop || !precio_Shop) {
    return res.status(400).json({ message: "Faltan campos" });
  }

  try {
    const [rows] = await db
      .promise()
      .query(`SELECT cover FROM Shop WHERE id_Shop = ?`, [id_Shop]);

    if (!rows.length)
      return res.status(404).json({ error: "Artículo no encontrado" });

    let coverActual = safeParseJSON(rows[0].cover);

    if (req.files?.length > 0) {
      await deleteCloudinaryImages(coverActual);
      coverActual = req.files.map((file) => ({
        url: file?.secure_url || file?.path || "",
        public_id: file?.public_id || file?.filename || "",
      }));
    }

    await db
      .promise()
      .query(
        `UPDATE Shop SET nombre_Shop=?, contenido_Shop=?, precio_Shop=?, cover=? WHERE id_Shop=?`,
        [
          nombre_Shop,
          contenido_Shop,
          precio_Shop,
          JSON.stringify(coverActual),
          id_Shop,
        ]
      );

    res.json({ message: "✅ Artículo actualizado", cover: coverActual });
  } catch (err) {
    console.error("❌ Error al actualizar artículo:", err);
    await limpiarImagenesCloudinary(req.files);
    res.status(500).json({ error: "Error al actualizar artículo" });
  }
});

// ✅ Eliminar artículo
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db
      .promise()
      .query(`SELECT cover FROM Shop WHERE id_Shop = ?`, [id]);

    if (!rows.length)
      return res.status(404).json({ error: "Artículo no encontrado" });

    const cover = safeParseJSON(rows[0].cover);
    await deleteCloudinaryImages(cover);

    await db.promise().query(`DELETE FROM Shop WHERE id_Shop = ?`, [id]);

    res.json({ message: "✅ Artículo eliminado", deletedImages: cover.length });
  } catch (err) {
    console.error("❌ Error al eliminar artículo:", err);
    res.status(500).json({ error: "Error al eliminar artículo" });
  }
});

// 🔧 Función para eliminar imágenes de Cloudinary
async function deleteCloudinaryImages(images) {
  await Promise.all(
    images.map((img) =>
      img.public_id
        ? cloudinary.uploader
            .destroy(img.public_id)
            .catch((err) =>
              console.error(`❌ Error eliminando ${img.public_id}:`, err)
            )
        : Promise.resolve()
    )
  );
}

// 🔧 Función para limpiar imágenes si falla la operación
async function limpiarImagenesCloudinary(files) {
  await Promise.all(
    files.map((file) =>
      file.public_id
        ? cloudinary.uploader
            .destroy(file.public_id)
            .catch((err) =>
              console.error(`❌ Error limpiando ${file.public_id}:`, err)
            )
        : Promise.resolve()
    )
  );
}

export default router;
