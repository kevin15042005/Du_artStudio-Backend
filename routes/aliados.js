import express from "express";
import db from "../db.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Obtener todos los aliados
router.get("/", (req, res) => {
  const q = "SELECT * FROM Marcas_Aliadas";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error en la consulta" });
    return res.json(data);
  });
});

// Crear un aliado
router.post("/", upload.single("cover"), (req, res) => {
  const cover = req.file?.filename || null;
  const { nombre_Marcas_Aliadas } = req.body;

  if (!cover || !nombre_Marcas_Aliadas) {
    return res
      .status(400)
      .json({ message: "Se requiere nombre e imagen del aliado" });
  }

  const q = `INSERT INTO Marcas_Aliadas (nombre_Marcas_Aliadas, imagen_Marcas_Aliadas) VALUES (?, ?)`;
  db.query(q, [nombre_Marcas_Aliadas, cover], (err) => {
    if (err)
      return res.status(500).json({ error: "Error al insertar aliado" });
    return res.json({ message: "Aliado publicado correctamente" });
  });
});

// Actualizar aliado (nombre, imagen o ambos)
router.put("/:id", upload.single("cover"), (req, res) => {
  const { id } = req.params;
  const cover = req.file?.filename || null;
  const { nombre_Marcas_Aliadas } = req.body;

  // Si no hay nada que actualizar, salir
  if (!nombre_Marcas_Aliadas && !cover) {
    return res.status(400).json({
      message: "Debes enviar al menos el nombre o una imagen para actualizar",
    });
  }

  // Construir dinámicamente la consulta SQL
  let campos = [];
  let valores = [];

  if (nombre_Marcas_Aliadas) {
    campos.push("nombre_Marcas_Aliadas = ?");
    valores.push(nombre_Marcas_Aliadas);
  }

  if (cover) {
    campos.push("imagen_Marcas_Aliadas = ?");
    valores.push(cover);
  }

  valores.push(id); // para el WHERE

  const q = `UPDATE Marcas_Aliadas SET ${campos.join(
    ", "
  )} WHERE id_Marcas_Aliadas = ?`;

  db.query(q, valores, (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al actualizar el aliado" });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Aliado no encontrado" });
    }
    return res.json({ message: "Aliado actualizado correctamente" });
  });
});

// Eliminar aliado
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const q = "DELETE FROM Marcas_Aliadas WHERE id_Marcas_Aliadas = ?";
  db.query(q, [id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al eliminar el aliado" });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Aliado no encontrado" });
    }
    return res.json({ message: "Aliado eliminado correctamente" });
  });
});

export default router;
