import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../db.js";

const router = express.Router();

// Configuración mejorada de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Obtener todas las noticias
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(`
      SELECT id_Noticia, nombre_Noticias, contenido_Noticia, 
             fecha_Publicacion, cover 
      FROM Noticias 
      ORDER BY fecha_Publicacion DESC
    `);
    res.json(noticias);
  } catch (err) {
    console.error("Error al obtener noticias:", err);
    res.status(500).json({ error: "Error al obtener noticias" });
  }
});

// Crear noticia
router.post("/crear", upload.array("cover", 3), async (req, res) => {
  try {
    const { nombre_Noticias, contenido_Noticia } = req.body;
    const coverFiles = req.files?.map(file => file.filename);
    const cover = coverFiles?.join(",");

    if (!nombre_Noticias || !contenido_Noticia || !cover) {
      // Limpiar archivos subidos si hay error
      if (coverFiles) {
        coverFiles.forEach(file => {
          fs.unlink(`uploads/${file}`, () => {});
        });
      }
      return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    const [result] = await db.promise().query(
      `INSERT INTO Noticias (
        nombre_Noticias, contenido_Noticia, 
        fecha_Publicacion, id_Administrador, cover
      ) VALUES (?, ?, NOW(), 1, ?)`,
      [nombre_Noticias, contenido_Noticia, cover]
    );

    res.status(201).json({ 
      message: "Noticia creada exitosamente",
      id: result.insertId 
    });
  } catch (err) {
    console.error("Error al crear noticia:", err);
    res.status(500).json({ error: "Error al crear noticia" });
  }
});

// Actualizar noticia
router.put("/:id", upload.single("cover"), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_Noticias, contenido_Noticia } = req.body;
    const cover = req.file?.filename;

    // Verificar si existe la noticia
    const [noticia] = await db.promise().query(
      "SELECT cover FROM Noticias WHERE id_Noticia = ?", 
      [id]
    );

    if (noticia.length === 0) {
      if (cover) fs.unlink(`uploads/${cover}`, () => {});
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    // Actualizar con o sin imagen
    let query, params;
    if (cover) {
      // Eliminar imagen anterior si existe
      if (noticia[0].cover) {
        noticia[0].cover.split(',').forEach(file => {
          fs.unlink(`uploads/${file}`, () => {});
        });
      }
      query = `UPDATE Noticias SET 
        nombre_Noticias = ?, contenido_Noticia = ?, cover = ?
        WHERE id_Noticia = ?`;
      params = [nombre_Noticias, contenido_Noticia, cover, id];
    } else {
      query = `UPDATE Noticias SET 
        nombre_Noticias = ?, contenido_Noticia = ?
        WHERE id_Noticia = ?`;
      params = [nombre_Noticias, contenido_Noticia, id];
    }

    const [result] = await db.promise().query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    res.json({ message: "Noticia actualizada exitosamente" });
  } catch (err) {
    console.error("Error al actualizar noticia:", err);
    res.status(500).json({ error: "Error al actualizar noticia" });
  }
});

// Eliminar noticia
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener noticia para eliminar su imagen
    const [noticia] = await db.promise().query(
      "SELECT cover FROM Noticias WHERE id_Noticia = ?", 
      [id]
    );

    if (noticia.length === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    // Eliminar noticia
    const [result] = await db.promise().query(
      "DELETE FROM Noticias WHERE id_Noticia = ?", 
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    // Eliminar imagen asociada si existe
    if (noticia[0].cover) {
      noticia[0].cover.split(',').forEach(file => {
        fs.unlink(`uploads/${file}`, () => {});
      });
    }

    res.json({ message: "Noticia eliminada exitosamente" });
  } catch (err) {
    console.error("Error al eliminar noticia:", err);
    res.status(500).json({ error: "Error al eliminar noticia" });
  }
});

export default router;