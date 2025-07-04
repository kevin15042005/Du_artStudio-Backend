import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

router.get("/", (req, res) => {
  const q = "SELECT * FROM Shop";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error en la consulta" });
    return res.json(data);
  });
});

//Crear articulos

router.post("/crear", upload.array("cover"), (req, res) => {
  const { nombre_Shop, contenido_Shop, precio_Shop } = req.body;

  const coverFiles = req.files?.map((file) => file.filename) || [];
  const cover = coverFiles.join(","); // Almacena los nombres separados por comas

  if (!nombre_Shop || !contenido_Shop || !precio_Shop) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  const q = `
    INSERT INTO Shop (nombre_Shop, contenido_Shop, precio_Shop, id_Administrador, cover)
    VALUES (?, ?, ?, ?, ?)`;

  db.query(q, [nombre_Shop, contenido_Shop, precio_Shop, 1, cover], (err) => {
    if (err) {
      return res.status(500).json({ error: "Error al insertar artículo" });
    }
    return res.json({ message: "✅ Artículo publicado correctamente" });
  });
});

//Actualizar articulo
router.put("/", upload.single("cover"), (req, res) => {
  const { id_Shop, nombre_Shop, contenido_Shop, precio_Shop } = req.body;
  const cover = req.file?.filename;

  let q = cover
    ? `UPDATE Shop SET nombre_Shop=?,contenido_Shop=?,precio_Shop=?,cover=? WHERE id_Shop=?`
    : `UPDATE Shop SET nombre_Shop=?,contenido_Shop=?,precio_Shop=? WHERE id_Shop=?`;
  const valores = cover
    ? [nombre_Shop, contenido_Shop, precio_Shop, cover, id_Shop]
    : [nombre_Shop, contenido_Shop, precio_Shop, id_Shop];
  db.query(q, valores, (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al actualizar articulo" });
    return res.json({ message: "✅ Artículo actualizado correctamente" });

  });
  
});

//Eliminar articulos

router.delete("/:id_Shop", (req, res) => {
  const id_Shop = req.params.id_Shop;
  const getImageQuery = `SELECT cover FROM Shop WHERE id_Shop = ?`;

  db.query(getImageQuery, [id_Shop], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al eliminar la imagen" });
    if (!result.length)
      return res.status(404).json({ message: "❌ Articulo no encontrado" });

    const cover = result[0].cover;
    const deleteQuery = `DELETE FROM Shop WHERE id_Shop = ?`;

    db.query(deleteQuery, [id_Shop], (err) => {
      if (err)
        return res.status(500).json({ error: "Error al eliminar articulo" });
      if (cover) fs.unlink(`uploads/${cover}`, () => {});

      return res.json({ message: "✅ Articulo eliminado correctamente" });
    });
  });
});

export default router;
