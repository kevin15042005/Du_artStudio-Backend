import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

function safeParseJSON(str) {
  try {
    const parsed = typeof str === "string" ? JSON.parse(str) : str;
    return parsed;
  } catch {
    return {};
  }
}

// ✅ Obtener todos los aliados
router.get("/", async (req, res) => {
  try {
    const [aliados] = await db.promise().query("SELECT * FROM Marcas_Aliadas");

    const formateados = aliados.map((a) => ({
      ...a,
      imagen_Marcas_Aliadas: safeParseJSON(a.imagen_Marcas_Aliadas),
    }));

    res.json(formateados);
  } catch (err) {
    console.error("❌ Error al obtener aliados:", err);
    res.status(500).json({ error: "Error al obtener aliados" });
  }
});

// ✅ Crear un aliado con imagen en Cloudinary
router.post("/", upload.single("cover"), async (req, res) => {
  try {
    const { nombre_Marcas_Aliadas } = req.body;

    if (!nombre_Marcas_Aliadas || !req.file) {
      return res
        .status(400)
        .json({ message: "Se requiere nombre e imagen del aliado" });
    }

    const imageData = {
      url: req.file?.secure_url || req.file?.path || "",
      public_id: req.file?.public_id || req.file?.filename || "",
    };

    const cover = JSON.stringify(imageData);

    const q = `
      INSERT INTO Marcas_Aliadas (nombre_Marcas_Aliadas, imagen_Marcas_Aliadas)
      VALUES (?, ?)`;

    await db.promise().query(q, [nombre_Marcas_Aliadas, cover]);

    res.json({ message: "✅ Aliado publicado correctamente" });
  } catch (err) {
    console.error("❌ Error al crear aliado:", err);
    res.status(500).json({ error: "Error al crear aliado" });
  }
});

// ✅ Actualizar aliado (nombre e imagen)
router.put("/:id", upload.single("cover"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_Marcas_Aliadas } = req.body;

    const campos = [];
    const valores = [];

    if (nombre_Marcas_Aliadas) {
      campos.push("nombre_Marcas_Aliadas = ?");
      valores.push(nombre_Marcas_Aliadas);
    }

    if (req.file) {
      // Eliminar imagen anterior
      const [rows] = await db
        .promise()
        .query("SELECT imagen_Marcas_Aliadas FROM Marcas_Aliadas WHERE id_Marcas_Aliadas = ?", [id]);

      const oldImage = safeParseJSON(rows[0]?.imagen_Marcas_Aliadas);
      if (oldImage?.public_id) {
        try {
          await cloudinary.uploader.destroy(oldImage.public_id);
        } catch (error) {
          console.warn("⚠️ Error al eliminar imagen antigua:", error);
        }
      }

      const newImage = {
        url: req.file?.secure_url || req.file?.path || "",
        public_id: req.file?.public_id || req.file?.filename || "",
      };

      campos.push("imagen_Marcas_Aliadas = ?");
      valores.push(JSON.stringify(newImage));
    }

    if (!campos.length) {
      return res.status(400).json({
        message: "Debes enviar al menos el nombre o una imagen para actualizar",
      });
    }

    valores.push(id);
    const q = `UPDATE Marcas_Aliadas SET ${campos.join(", ")} WHERE id_Marcas_Aliadas = ?`;

    const [result] = await db.promise().query(q, valores);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "❌ Aliado no encontrado" });
    }

    res.json({ message: "✅ Aliado actualizado correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar aliado:", err);
    res.status(500).json({ error: "Error al actualizar aliado" });
  }
});

// ✅ Eliminar aliado + imagen Cloudinary
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db
      .promise()
      .query("SELECT imagen_Marcas_Aliadas FROM Marcas_Aliadas WHERE id_Marcas_Aliadas = ?", [id]);

    if (!rows.length) {
      return res.status(404).json({ message: "❌ Aliado no encontrado" });
    }

    const image = safeParseJSON(rows[0].imagen_Marcas_Aliadas);

    if (image?.public_id) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (error) {
        console.error("⚠️ Error al eliminar imagen en Cloudinary:", error);
      }
    }

    await db
      .promise()
      .query("DELETE FROM Marcas_Aliadas WHERE id_Marcas_Aliadas = ?", [id]);

    res.json({ message: "✅ Aliado eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar aliado:", err);
    res.status(500).json({ error: "Error al eliminar aliado" });
  }
});

export default router;
