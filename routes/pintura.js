import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// ✅ Obtener todas las noticias de pintura
router.get("/", (req, res) => {
  const q = "SELECT * FROM Noticias_Pintura ORDER BY fecha_Publicacion DESC";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error al obtener noticias" });
    return res.json(data);
  });
});

// ✅ Crear noticia con múltiples imágenes
router.post("/crear", upload.array("cover"), (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!nombre_Noticia_Pintura || !contenido_Noticia_Pintura || !req.files.length) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const coverData = req.files.map((file) => ({
    url: file.path, // secure_url
    public_id: file.filename,
  }));

  const cover = JSON.stringify(coverData);

  const q = `
    INSERT INTO Noticias_Pintura (
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      fecha_Publicacion,
      id_Administrador,
      cover
    )
    VALUES (?, ?, NOW(), ?, ?)`;

  db.query(q, [nombre_Noticia_Pintura, contenido_Noticia_Pintura, 1, cover], (err) => {
    if (err) return res.status(500).json({ error: "Error al insertar noticia" });
    return res.json({ message: "✅ Noticia publicada correctamente" });
  });
});

// ✅ Actualizar noticia (opcionalmente reemplazar imágenes)
router.put("/", upload.array("cover"), (req, res) => {
  const { id_Noticias_Pintura, nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  const newCoverData = req.files.map((file) => ({
    url: file.path,
    public_id: file.filename,
  }));
  const newCover = newCoverData.length ? JSON.stringify(newCoverData) : null;

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

// ✅ Eliminar noticia + imágenes de Cloudinary
router.delete("/:id_Noticias_Pintura", (req, res) => {
  const id = req.params.id_Noticias_Pintura;
  const qGet = `SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`;
  const qDelete = `DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`;

  db.query(qGet, [id], async (err, result) => {
    if (err || result.length === 0)
      return res.status(500).json({ error: "Error al obtener noticia" });

    const coverData = JSON.parse(result[0].cover || "[]");

    for (const img of coverData) {
      try {
        await cloudinary.uploader.destroy(img.public_id);
      } catch (error) {
        console.error("❌ Error eliminando imagen Cloudinary:", img.public_id);
      }
    }

    db.query(qDelete, [id], (err) => {
      if (err) return res.status(500).json({ error: "Error al eliminar noticia" });
      return res.json({ message: "✅ Noticia e imágenes eliminadas correctamente" });
    });
  });
});

export default router;
