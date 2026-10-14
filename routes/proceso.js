// routes/proceso.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// Los 5 pasos fijos del proceso de pintura
router.get("/pasos", async (req, res) => {
  try {
    const [pasos] = await db
      .promise()
      .query("SELECT * FROM PasoProceso ORDER BY orden ASC");
    res.json(pasos);
  } catch (err) {
    console.error("❌ Error al obtener pasos:", err);
    res.status(500).json({ message: "Error al obtener pasos" });
  }
});

// Catálogo de modelos de vehículo
router.get("/modelos", async (req, res) => {
  try {
    const [modelos] = await db
      .promise()
      .query("SELECT * FROM ModeloVehiculo ORDER BY nombre_Modelo ASC");
    res.json(modelos);
  } catch (err) {
    console.error("❌ Error al obtener modelos:", err);
    res.status(500).json({ message: "Error al obtener modelos" });
  }
});

router.post("/modelos", async (req, res) => {
  const { nombre_Modelo } = req.body;
  if (!nombre_Modelo) {
    return res.status(400).json({ message: "El nombre del modelo es obligatorio" });
  }

  try {
    const [result] = await db
      .promise()
      .query("INSERT INTO ModeloVehiculo (nombre_Modelo) VALUES (?)", [nombre_Modelo]);
    res.status(201).json({ message: "✅ Modelo creado", id_Modelo: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "❌ Ese modelo ya existe" });
    }
    console.error("❌ Error al crear modelo:", err);
    res.status(500).json({ message: "Error al crear modelo" });
  }
});

router.put("/modelos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre_Modelo } = req.body;

  try {
    await db
      .promise()
      .query("UPDATE ModeloVehiculo SET nombre_Modelo = ? WHERE id_Modelo = ?", [
        nombre_Modelo,
        id,
      ]);
    res.json({ message: "✅ Modelo actualizado" });
  } catch (err) {
    console.error("❌ Error al actualizar modelo:", err);
    res.status(500).json({ message: "Error al actualizar modelo" });
  }
});

router.delete("/modelos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM ModeloVehiculo WHERE id_Modelo = ?", [id]);
    res.json({ message: "✅ Modelo eliminado" });
  } catch (err) {
    console.error("❌ Error al eliminar modelo:", err);
    res.status(500).json({ message: "Error al eliminar modelo" });
  }
});

// Todos los vehículos en taller (vista de administrador)
router.get("/vehiculos", async (req, res) => {
  try {
    const [vehiculos] = await db.promise().query(`
      SELECT v.*, c.nombre_Cliente, c.correo_Cliente,
             m.nombre_Modelo, p.nombre_Paso, p.orden AS paso_orden
      FROM Vehiculo v
      JOIN Cliente c ON v.id_Cliente = c.id_Cliente
      LEFT JOIN ModeloVehiculo m ON v.id_Modelo = m.id_Modelo
      LEFT JOIN PasoProceso p ON v.id_Paso_Actual = p.id_Paso
      ORDER BY v.estado ASC, v.fecha_Actualizacion DESC
    `);
    res.json(vehiculos);
  } catch (err) {
    console.error("❌ Error al obtener vehículos:", err);
    res.status(500).json({ message: "Error al obtener vehículos" });
  }
});

// Avanzar / retroceder el paso actual de un vehículo
router.put("/vehiculos/:id/paso", async (req, res) => {
  const { id } = req.params;
  const { id_Paso } = req.body;

  if (!id_Paso) {
    return res.status(400).json({ message: "id_Paso es obligatorio" });
  }

  try {
    await db
      .promise()
      .query("UPDATE Vehiculo SET id_Paso_Actual = ?, estado = 'en_proceso' WHERE id_Vehiculo = ?", [
        id_Paso,
        id,
      ]);
    res.json({ message: "✅ Paso actualizado" });
  } catch (err) {
    console.error("❌ Error al actualizar paso:", err);
    res.status(500).json({ message: "Error al actualizar paso" });
  }
});

// Marcar un vehículo como finalizado
router.put("/vehiculos/:id/finalizar", async (req, res) => {
  const { id } = req.params;

  try {
    await db
      .promise()
      .query("UPDATE Vehiculo SET estado = 'finalizado' WHERE id_Vehiculo = ?", [id]);
    res.json({ message: "✅ Vehículo marcado como finalizado" });
  } catch (err) {
    console.error("❌ Error al finalizar vehículo:", err);
    res.status(500).json({ message: "Error al finalizar vehículo" });
  }
});

export default router;
