// routes/inventario.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// ---------- Productos ----------
router.get("/productos", async (req, res) => {
  try {
    const [productos] = await db
      .promise()
      .query("SELECT * FROM Producto ORDER BY nombre_Producto ASC");
    res.json(productos);
  } catch (err) {
    console.error("❌ Error al obtener productos:", err);
    res.status(500).json({ message: "Error al obtener productos" });
  }
});

router.post("/productos", async (req, res) => {
  const { nombre_Producto, unidad_medida } = req.body;
  if (!nombre_Producto) {
    return res.status(400).json({ message: "El nombre del producto es obligatorio" });
  }

  try {
    const [result] = await db
      .promise()
      .query("INSERT INTO Producto (nombre_Producto, unidad_medida) VALUES (?, ?)", [
        nombre_Producto,
        unidad_medida || "unidad",
      ]);
    res.status(201).json({ message: "✅ Producto creado", id_Producto: result.insertId });
  } catch (err) {
    console.error("❌ Error al crear producto:", err);
    res.status(500).json({ message: "Error al crear producto" });
  }
});

router.put("/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre_Producto, unidad_medida } = req.body;

  try {
    await db
      .promise()
      .query("UPDATE Producto SET nombre_Producto = ?, unidad_medida = ? WHERE id_Producto = ?", [
        nombre_Producto,
        unidad_medida,
        id,
      ]);
    res.json({ message: "✅ Producto actualizado" });
  } catch (err) {
    console.error("❌ Error al actualizar producto:", err);
    res.status(500).json({ message: "Error al actualizar producto" });
  }
});

router.delete("/productos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM Producto WHERE id_Producto = ?", [id]);
    res.json({ message: "✅ Producto eliminado" });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ message: "Error al eliminar producto" });
  }
});

// ---------- Plantilla (insumos recurrentes por modelo/paso) ----------
router.get("/plantilla/:idModelo", async (req, res) => {
  const { idModelo } = req.params;
  const { idPaso } = req.query;

  try {
    let q = `
      SELECT t.*, pr.nombre_Producto, pr.unidad_medida, pa.nombre_Paso
      FROM ModeloProductoTemplate t
      JOIN Producto pr ON t.id_Producto = pr.id_Producto
      LEFT JOIN PasoProceso pa ON t.id_Paso = pa.id_Paso
      WHERE t.id_Modelo = ?
    `;
    const params = [idModelo];

    if (idPaso) {
      q += " AND (t.id_Paso = ? OR t.id_Paso IS NULL)";
      params.push(idPaso);
    }

    const [rows] = await db.promise().query(q, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error al obtener plantilla:", err);
    res.status(500).json({ message: "Error al obtener plantilla" });
  }
});

router.post("/plantilla", async (req, res) => {
  const { id_Modelo, id_Paso, id_Producto, cantidad_Recomendada } = req.body;

  if (!id_Modelo || !id_Producto) {
    return res.status(400).json({ message: "Modelo y producto son obligatorios" });
  }

  try {
    const [result] = await db.promise().query(
      `INSERT INTO ModeloProductoTemplate (id_Modelo, id_Paso, id_Producto, cantidad_Recomendada)
       VALUES (?, ?, ?, ?)`,
      [id_Modelo, id_Paso || null, id_Producto, cantidad_Recomendada || 1]
    );
    res.status(201).json({ message: "✅ Agregado a la plantilla", id_Template: result.insertId });
  } catch (err) {
    console.error("❌ Error al agregar a la plantilla:", err);
    res.status(500).json({ message: "Error al agregar a la plantilla" });
  }
});

router.delete("/plantilla/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query("DELETE FROM ModeloProductoTemplate WHERE id_Template = ?", [id]);
    res.json({ message: "✅ Eliminado de la plantilla" });
  } catch (err) {
    console.error("❌ Error al eliminar de la plantilla:", err);
    res.status(500).json({ message: "Error al eliminar de la plantilla" });
  }
});

// ---------- Solicitar materiales de un solo clic ----------
router.post("/solicitar", async (req, res) => {
  const { id_Vehiculo, id_Administrador } = req.body;

  if (!id_Vehiculo) {
    return res.status(400).json({ message: "id_Vehiculo es obligatorio" });
  }

  const conn = db.promise();

  try {
    const [vehiculoRows] = await conn.query(
      "SELECT id_Modelo, id_Paso_Actual FROM Vehiculo WHERE id_Vehiculo = ?",
      [id_Vehiculo]
    );

    if (vehiculoRows.length === 0) {
      return res.status(404).json({ message: "Vehículo no encontrado" });
    }

    const { id_Modelo, id_Paso_Actual } = vehiculoRows[0];

    if (!id_Modelo) {
      return res.status(400).json({
        message: "Este vehículo no tiene un modelo del catálogo asignado, no hay plantilla de insumos",
      });
    }

    const [productos] = await conn.query(
      `SELECT id_Producto, cantidad_Recomendada
       FROM ModeloProductoTemplate
       WHERE id_Modelo = ? AND (id_Paso = ? OR id_Paso IS NULL)`,
      [id_Modelo, id_Paso_Actual]
    );

    if (productos.length === 0) {
      return res.status(400).json({
        message: "Este modelo no tiene productos configurados en su plantilla todavía",
      });
    }

    await conn.beginTransaction();

    let id_Solicitud;
    try {
      const [solicitudResult] = await conn.query(
        "INSERT INTO Solicitud (id_Vehiculo, id_Administrador) VALUES (?, ?)",
        [id_Vehiculo, id_Administrador || null]
      );
      id_Solicitud = solicitudResult.insertId;

      const detalleValues = productos.map((p) => [
        id_Solicitud,
        p.id_Producto,
        p.cantidad_Recomendada,
      ]);
      await conn.query(
        "INSERT INTO SolicitudDetalle (id_Solicitud, id_Producto, cantidad) VALUES ?",
        [detalleValues]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    const [detalleCompleto] = await conn.query(
      `SELECT sd.*, pr.nombre_Producto, pr.unidad_medida
       FROM SolicitudDetalle sd
       JOIN Producto pr ON sd.id_Producto = pr.id_Producto
       WHERE sd.id_Solicitud = ?`,
      [id_Solicitud]
    );

    res.status(201).json({
      message: `✅ Solicitud creada con ${detalleCompleto.length} producto(s)`,
      id_Solicitud,
      productos: detalleCompleto,
    });
  } catch (err) {
    console.error("❌ Error al solicitar materiales:", err);
    res.status(500).json({ message: "Error al solicitar materiales" });
  }
});

// ---------- Solicitudes (historial) ----------
router.get("/solicitudes", async (req, res) => {
  try {
    const [solicitudes] = await db.promise().query(`
      SELECT s.*, v.placa, v.nombre_Modelo_Texto, m.nombre_Modelo, c.nombre_Cliente
      FROM Solicitud s
      JOIN Vehiculo v ON s.id_Vehiculo = v.id_Vehiculo
      JOIN Cliente c ON v.id_Cliente = c.id_Cliente
      LEFT JOIN ModeloVehiculo m ON v.id_Modelo = m.id_Modelo
      ORDER BY s.fecha_Solicitud DESC
    `);

    const conn = db.promise();
    for (const s of solicitudes) {
      const [detalle] = await conn.query(
        `SELECT sd.*, pr.nombre_Producto, pr.unidad_medida
         FROM SolicitudDetalle sd
         JOIN Producto pr ON sd.id_Producto = pr.id_Producto
         WHERE sd.id_Solicitud = ?`,
        [s.id_Solicitud]
      );
      s.productos = detalle;
    }

    res.json(solicitudes);
  } catch (err) {
    console.error("❌ Error al obtener solicitudes:", err);
    res.status(500).json({ message: "Error al obtener solicitudes" });
  }
});

router.put("/solicitudes/:id", async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!["pendiente", "entregada"].includes(estado)) {
    return res.status(400).json({ message: "Estado inválido" });
  }

  try {
    await db.promise().query("UPDATE Solicitud SET estado = ? WHERE id_Solicitud = ?", [
      estado,
      id,
    ]);
    res.json({ message: "✅ Solicitud actualizada" });
  } catch (err) {
    console.error("❌ Error al actualizar solicitud:", err);
    res.status(500).json({ message: "Error al actualizar solicitud" });
  }
});

export default router;
