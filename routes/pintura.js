import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../db.js";

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Obtener todas las noticias
router.get("/", (req, res) => {
  const q = "SELECT * FROM Noticias_Pintura";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error en la consulta" });
    return res.json(data);
  });
});

// Crear una nueva noticia Pintura
router.post("/crear", upload.array("cover"), (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;
  const coverFiles = req.files?.map((file) => file.filename);
  const cover = coverFiles?.join(",") || null;
  if (
    !nombre_Noticia_Pintura ||
    !contenido_Noticia_Pintura ||
    coverFiles.length === 0
  ) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  const q = `
    INSERT INTO Noticias_Pintura (
      nombre_Noticia_Pintura,
      fecha_Publicacion,
      contenido_Noticia_Pintura,
      id_Administrador,
      cover
    )
    VALUES (?, NOW(), ?, ?, ?)
  `;

  db.query(
    q,
    [nombre_Noticia_Pintura, contenido_Noticia_Pintura, 1, cover],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error al insertar noticia" });
      }
      return res.json({ message: "✅ Noticia publicada correctamente" });
    }
  );
});

// Actualizar una noticia
// ✅ Ruta corregida:
router.put("/:id_Noticias_Pintura", upload.single("cover"), (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;
  const { id_Noticias_Pintura } = req.params;
  const cover = req.file?.filename;

  let q, valores;
  if (cover) {
    q = `
      UPDATE Noticias_Pintura 
      SET nombre_Noticia_Pintura=?, contenido_Noticia_Pintura=?, cover=? 
      WHERE id_Noticias_Pintura=?`;
    valores = [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      cover,
      id_Noticias_Pintura,
    ];
  } else {
    q = `
      UPDATE Noticias_Pintura 
      SET nombre_Noticia_Pintura=?, contenido_Noticia_Pintura=? 
      WHERE id_Noticias_Pintura=?`;
    valores = [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      id_Noticias_Pintura,
    ];
  }

  db.query(q, valores, (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al actualizar noticia" });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "❌ Noticia no encontrada" });
    return res.json({ message: "✅ Noticia actualizada correctamente" });
  });
});

// Eliminar noticia por ID
router.delete("/:id_Noticias_Pintura", (req, res) => {
  const id = req.params.id_Noticias_Pintura;
  const getImageQuery =
    "SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?";
  console.log(getImageQuery, "!!!!!!!!!!!!!");

  db.query(getImageQuery, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error buscando imagen" });
    if (!results.length)
      return res.status(404).json({ message: "❌ Noticia no encontrada" });

    const imagen = results[0].cover;
    const deleteQuery =
      "DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?";

    db.query(deleteQuery, [id], (err) => {
      if (err)
        return res.status(500).json({ error: "Error al eliminar noticia" });
      if (imagen) fs.unlink(`uploads/${imagen}`, () => {});
      return res.json({ message: "✅ Noticia eliminada correctamente" });
    });
  });
});

export default router;
