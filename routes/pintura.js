// ✅ BACKEND: rutas de Noticias_Pintura (Versión Corregida)
import express from "express";
import db from "../db.js";
import { upload, cloudinary } from "../config/cloudinary.js";

const router = express.Router();

// Obtener todas las noticias de pintura
router.get("/", async (req, res) => {
  try {
    const [noticias] = await db.promise().query(
      `SELECT id_Noticias_Pintura, nombre_Noticia_Pintura, 
       contenido_Noticia_Pintura, fecha_Publicacion, cover 
       FROM Noticias_Pintura 
       ORDER BY fecha_Publicacion DESC`
    );
    
    // Parsear el campo cover para asegurar consistencia
    const noticiasFormateadas = noticias.map(noticia => ({
      ...noticia,
      cover: safeParseJSON(noticia.cover)
    }));
    
    res.json(noticiasFormateadas);
  } catch (err) {
    console.error("Error al obtener noticias de pintura:", err);
    res.status(500).json({ error: "Error al obtener noticias de pintura" });
  }
});

// Crear noticia de pintura con Cloudinary
router.post("/crear", upload.array("cover", 10), async (req, res) => {
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!nombre_Noticia_Pintura || !contenido_Noticia_Pintura || !req.files.length) {
    return res.status(400).json({ 
      message: "Todos los campos son obligatorios y al menos una imagen es requerida" 
    });
  }

  try {
    // Mapear las imágenes subidas a Cloudinary
    const coverData = req.files.map(file => ({
      url: file.secure_url,
      public_id: file.public_id
    }));

    const q = `INSERT INTO Noticias_Pintura 
               (nombre_Noticia_Pintura, contenido_Noticia_Pintura, fecha_Publicacion, id_Administrador, cover) 
               VALUES (?, ?, NOW(), ?, ?)`;

    const [result] = await db.promise().query(q, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      1, // ID del administrador (ajustar según tu sistema)
      JSON.stringify(coverData)
    ]);

    return res.status(201).json({ 
      message: "✅ Noticia publicada correctamente",
      id: result.insertId
    });
    
  } catch (err) {
    console.error("Error al crear noticia:", err);
    
    // Eliminar imágenes de Cloudinary si hubo error
    if (req.files?.length) {
      await Promise.all(req.files.map(file => 
        cloudinary.uploader.destroy(file.public_id).catch(e => 
          console.error("Error limpiando imágenes fallidas:", e)
        )
      ));
    }
    
    return res.status(500).json({ 
      error: "Error al crear noticia",
      details: err.message 
    });
  }
});

// Actualizar noticia de pintura con Cloudinary
router.put("/:id", upload.array("cover", 10), async (req, res) => {
  const { id } = req.params;
  const { nombre_Noticia_Pintura, contenido_Noticia_Pintura } = req.body;

  if (!id || !nombre_Noticia_Pintura || !contenido_Noticia_Pintura) {
    return res.status(400).json({ 
      message: "ID, título y contenido son obligatorios" 
    });
  }

  try {
    // Obtener noticia actual
    const [noticia] = await db.promise().query(
      `SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?`, 
      [id]
    );

    if (!noticia.length) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    // Parsear el cover actual
    let currentCover = safeParseJSON(noticia[0].cover) || [];

    // Si hay nuevas imágenes, reemplazar las existentes
    if (req.files.length > 0) {
      // Eliminar imágenes antiguas de Cloudinary
      await deleteCloudinaryImages(currentCover);
      
      // Crear nuevo array con las nuevas imágenes
      currentCover = req.files.map(file => ({
        url: file.secure_url,
        public_id: file.public_id
      }));
    }

    // Actualizar la noticia en la base de datos
    const q = `UPDATE Noticias_Pintura 
               SET nombre_Noticia_Pintura = ?, 
                   contenido_Noticia_Pintura = ?, 
                   cover = ?
               WHERE id_Noticias_Pintura = ?`;

    await db.promise().query(q, [
      nombre_Noticia_Pintura,
      contenido_Noticia_Pintura,
      JSON.stringify(currentCover),
      id
    ]);

    return res.json({ 
      message: "✅ Noticia actualizada correctamente",
      cover: currentCover
    });

  } catch (err) {
    console.error("Error al actualizar noticia:", err);
    
    // Eliminar nuevas imágenes si hubo error
    if (req.files?.length) {
      await Promise.all(req.files.map(file => 
        cloudinary.uploader.destroy(file.public_id).catch(e => 
          console.error("Error limpiando imágenes fallidas:", e)
        )
      ));
    }
    
    return res.status(500).json({ 
      error: "Error al actualizar noticia",
      details: err.message 
    });
  }
});

// Eliminar noticia de pintura
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la noticia para eliminar las imágenes
    const [noticia] = await db.promise().query(
      "SELECT cover FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?",
      [id]
    );

    if (noticia.length === 0) {
      return res.status(404).json({ error: "Noticia no encontrada" });
    }

    // Parsear y eliminar imágenes de Cloudinary
    const coverData = safeParseJSON(noticia[0].cover) || [];
    await deleteCloudinaryImages(coverData);

    // Eliminar la noticia de la base de datos
    const [result] = await db.promise().query(
      "DELETE FROM Noticias_Pintura WHERE id_Noticias_Pintura = ?", 
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No se pudo eliminar la noticia" });
    }

    return res.json({ 
      message: "✅ Noticia e imágenes eliminadas correctamente",
      deletedImages: coverData.length
    });

  } catch (err) {
    console.error("Error al eliminar noticia:", err);
    return res.status(500).json({ 
      error: "Error al eliminar noticia",
      details: err.message 
    });
  }
});

// Funciones auxiliares

function safeParseJSON(str) {
  if (Array.isArray(str)) return str;
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

async function deleteCloudinaryImages(images) {
  if (!Array.isArray(images)) return;
  
  await Promise.all(
    images.map(img => {
      if (img?.public_id) {
        return cloudinary.uploader.destroy(img.public_id)
          .catch(err => 
            console.error(`Error eliminando imagen ${img.public_id}:`, err)
          );
      }
      return Promise.resolve();
    })
  );
}

export default router;