import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// ✅ Obtener todos los aliados
router.get("/", (req, res) => {
  const q = "SELECT * FROM Marcas_Aliadas";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error en la consulta" });
    return res.json(data);
  });
});

// ✅ Crear un aliado con imagen en Cloudinary
router.post("/", upload.single("cover"), (req, res) => {
  const { nombre_Marcas_Aliadas } = req.body;

  if (!nombre_Marcas_Aliadas || !req.file) {
    return res
      .status(400)
      .json({ message: "Se requiere nombre e imagen del aliado" });
  }

  const imageData = {
    url: req.file.path, // secure_url
    public_id: req.file.filename,
  };
  const cover = JSON.stringify(imageData);

  const q = `
    INSERT INTO Marcas_Aliadas (nombre_Marcas_Aliadas, imagen_Marcas_Aliadas)
    VALUES (?, ?)
  `;

  db.query(q, [nombre_Marcas_Aliadas, cover], (err) => {
    if (err)
      return res.status(500).json({ error: "Error al insertar aliado" });
    return res.json({ message: "✅ Aliado publicado correctamente" });
  });
});

// ✅ Actualizar aliado (nombre e imagen)
router.put("/:id", upload.single("cover"), (req, res) => {
  const { id } = req.params;
  const { nombre_Marcas_Aliadas } = req.body;

  const campos = [];
  const valores = [];

  if (nombre_Marcas_Aliadas) {
    campos.push("nombre_Marcas_Aliadas = ?");
    valores.push(nombre_Marcas_Aliadas);
  }

  if (req.file) {
    const newImage = JSON.stringify({
      url: req.file.path,
      public_id: req.file.filename,
    });
    campos.push("imagen_Marcas_Aliadas = ?");
    valores.push(newImage);
  }

  if (!campos.length) {
    return res.status(400).json({
      message: "Debes enviar al menos el nombre o una imagen para actualizar",
    });
  }

  valores.push(id);
  const q = `UPDATE Marcas_Aliadas SET ${campos.join(
    ", "
  )} WHERE id_Marcas_Aliadas = ?`;

  db.query(q, valores, (err, result) => {
    if (err)
      return res.status(500).json({ error: "Error al actualizar el aliado" });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "❌ Aliado no encontrado" });
    }
    return res.json({ message: "✅ Aliado actualizado correctamente" });
  });
});

// ✅ Eliminar aliado + imagen Cloudinary
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const qGet = "SELECT imagen_Marcas_Aliadas FROM Marcas_Aliadas WHERE id_Marcas_Aliadas = ?";
  const qDelete = "DELETE FROM Marcas_Aliadas WHERE id_Marcas_Aliadas = ?";

  db.query(qGet, [id], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ message: "❌ Aliado no encontrado" });
    }

    const image = JSON.parse(result[0].imagen_Marcas_Aliadas || "{}");

    if (image.public_id) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (error) {
        console.error("⚠️ Error al eliminar imagen en Cloudinary:", error);
      }
    }

    db.query(qDelete, [id], (err) => {
      if (err)
        return res.status(500).json({ error: "Error al eliminar el aliado" });
      return res.json({ message: "✅ Aliado eliminado correctamente" });
    });
  });
});

export default router;
