// routes/cliente.js
import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";

const router = express.Router();

// Registro de cliente
router.post("/register", async (req, res) => {
  const { nombre_Cliente, correo_Cliente, contraseña_Cliente, telefono_Cliente } = req.body;

  if (!nombre_Cliente || !correo_Cliente || !contraseña_Cliente) {
    return res.status(400).json({ message: "Faltan datos obligatorios" });
  }
  if (contraseña_Cliente.length < 6) {
    return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });
  }

  try {
    const [existente] = await db
      .promise()
      .query("SELECT id_Cliente FROM Cliente WHERE correo_Cliente = ?", [correo_Cliente]);

    if (existente.length > 0) {
      return res.status(400).json({ message: "❌ Ya existe una cuenta con ese correo" });
    }

    const hash = await bcrypt.hash(contraseña_Cliente, 10);

    const [result] = await db.promise().query(
      `INSERT INTO Cliente (nombre_Cliente, correo_Cliente, contraseña_Cliente, telefono_Cliente)
       VALUES (?, ?, ?, ?)`,
      [nombre_Cliente, correo_Cliente, hash, telefono_Cliente || null]
    );

    return res.status(201).json({
      message: "✅ Cuenta creada correctamente",
      cliente: {
        id_Cliente: result.insertId,
        nombre_Cliente,
        correo_Cliente,
        telefono_Cliente: telefono_Cliente || null,
      },
    });
  } catch (err) {
    console.error("❌ Error al registrar cliente:", err);
    return res.status(500).json({ message: "Error al registrar cliente" });
  }
});

// Inicio de sesión de cliente
router.post("/login", async (req, res) => {
  const { correo_Cliente, contraseña_Cliente } = req.body;

  if (!correo_Cliente || !contraseña_Cliente) {
    return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
  }

  try {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM Cliente WHERE correo_Cliente = ?", [correo_Cliente]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "❌ Credenciales incorrectas" });
    }

    const cliente = rows[0];
    const coincide = await bcrypt.compare(contraseña_Cliente, cliente.contraseña_Cliente);

    if (!coincide) {
      return res.status(401).json({ message: "❌ Credenciales incorrectas" });
    }

    delete cliente.contraseña_Cliente;

    return res.json({ message: "✅ Inicio de sesión exitoso", cliente });
  } catch (err) {
    console.error("❌ Error al iniciar sesión:", err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
});

// Vehículos de un cliente
router.get("/:id/vehiculos", async (req, res) => {
  const { id } = req.params;

  try {
    const [vehiculos] = await db.promise().query(
      `SELECT v.*, m.nombre_Modelo, p.nombre_Paso, p.orden AS paso_orden
       FROM Vehiculo v
       LEFT JOIN ModeloVehiculo m ON v.id_Modelo = m.id_Modelo
       LEFT JOIN PasoProceso p ON v.id_Paso_Actual = p.id_Paso
       WHERE v.id_Cliente = ?
       ORDER BY v.fecha_Ingreso DESC`,
      [id]
    );

    return res.json(vehiculos);
  } catch (err) {
    console.error("❌ Error al obtener vehículos:", err);
    return res.status(500).json({ message: "Error al obtener vehículos" });
  }
});

// Registrar un vehículo nuevo para el cliente
router.post("/:id/vehiculos", async (req, res) => {
  const { id } = req.params;
  const { id_Modelo, nombre_Modelo_Texto, placa, color } = req.body;

  if (!id_Modelo && !nombre_Modelo_Texto) {
    return res.status(400).json({ message: "Selecciona un modelo o escribe uno" });
  }

  try {
    const [primerPaso] = await db
      .promise()
      .query("SELECT id_Paso FROM PasoProceso ORDER BY orden ASC LIMIT 1");

    if (primerPaso.length === 0) {
      return res.status(500).json({ message: "El proceso de pintura no está configurado" });
    }

    const [result] = await db.promise().query(
      `INSERT INTO Vehiculo (id_Cliente, id_Modelo, nombre_Modelo_Texto, placa, color, id_Paso_Actual)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        id_Modelo || null,
        nombre_Modelo_Texto || null,
        placa || null,
        color || null,
        primerPaso[0].id_Paso,
      ]
    );

    return res.status(201).json({
      message: "✅ Vehículo registrado, ya está en el proceso",
      id_Vehiculo: result.insertId,
    });
  } catch (err) {
    console.error("❌ Error al registrar vehículo:", err);
    return res.status(500).json({ message: "Error al registrar vehículo" });
  }
});

export default router;
