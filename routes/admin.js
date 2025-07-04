// routes/admin.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// Obtener todos los administradores
router.get("/", (req, res) => {
  const q = "SELECT * FROM Administrador";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error al obtener datos" });
    return res.json(data);
  });
});

// Registro de administrador
router.post("/register", (req, res) => {
  const {
    nombre_Administrador,
    contraseña_Administrador,
    correo_Administrador,
    rol_Administrador,
    pin_seguridad,
  } = req.body;

  const chekUsuario =
    "SELECT * FROM Administrador WHERE nombre_Administrador = ? OR correo_Administrador = ?";

  db.query(
    chekUsuario,
    [nombre_Administrador, correo_Administrador],
    (err, data) => {
      if (err) {
        return res.status(500).json({
          message: "❌ Error al verificar , duplicado usuario",
          error: err,
        });
      }

      if (data.length > 0) {
        return res.status(400).json({
          message: "❌ Usuario o correo ya registrado",
        });
      }
      if (!pin_seguridad || pin_seguridad.length !== 4) {
        return res.status(400).json({
          message: "El PIN de seguridad debe tener exactamente 4 caracteres.",
        });
      }
      const q = `
        INSERT INTO Administrador 
        (nombre_Administrador, contraseña_Administrador, correo_Administrador, rol_Administrador, pin_seguridad) 
        VALUES (?, ?, ?, ? , ?)`;

      db.query(
        q,
        [
          nombre_Administrador,
          contraseña_Administrador,
          correo_Administrador,
          rol_Administrador,
          pin_seguridad,
        ],
        (err) => {
          if (err) {
            return res.status(500).json({
              message: "❌ Error al registrar",
              error: err,
            });
          }

          return res.json({
            message: "✅ Usuario registrado exitosamente",
          });
        }
      );
    }
  );
});

// Inicio de sesión
router.post("/login", (req, res) => {
  const { correo_Administrador, contraseña_Administrador } = req.body;
  const q =
    "SELECT * FROM Administrador WHERE correo_Administrador = ? AND contraseña_Administrador = ?";

  db.query(q, [correo_Administrador, contraseña_Administrador], (err, data) => {
    if (err)
      return res.status(500).json({ message: "❌ Error en el servidor", error: err });

    if (data.length > 0) {
      return res.json({
        message: "✅ Inicio de sesión exitoso",
        usuario: data[0],
      });
    }

    return res.status(401).json({ message: "❌ Credenciales incorrectas" });
  });
});

// Actualizar contraseña por correo y PIN
router.put("/update", (req, res) => {
  const { correo_Administrador, pin_seguridad, nuevaContraseña } = req.body;

  const verificarQuery = "SELECT pin_seguridad FROM Administrador WHERE correo_Administrador = ?";

  db.query(verificarQuery, [correo_Administrador], (err, data) => {
    if (err)
      return res.status(500).json({ message: "❌ Error al verificar pin", error: err });

    if (data.length === 0) {
      return res.status(404).json({ message: "❌ Correo no registrado" });
    }

    const pinActual = data[0].pin_seguridad;

    if (pin_seguridad != pinActual) {
      return res.status(400).json({ message: "❌ El pin no es correcto" });
    }

    const actualizarQuery =
      "UPDATE Administrador SET contraseña_Administrador = ? WHERE correo_Administrador = ?";

    db.query(actualizarQuery, [nuevaContraseña, correo_Administrador], (err) => {
      if (err)
        return res.status(500).json({ message: "❌ Error al actualizar contraseña", error: err });

      return res.json({ message: "🔁 Contraseña actualizada exitosamente" });
    });
  });
});

// Actualizar administrador por ID
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const {
    nombre_Administrador,
    correo_Administrador,
    rol_Administrador,
    pin_seguridad,
  } = req.body;

  const q = `
    UPDATE Administrador SET
      nombre_Administrador = ?,
      correo_Administrador = ?,
      rol_Administrador = ?,
      pin_seguridad = ?
    WHERE id_Administrador = ?`;

  db.query(
    q,
    [
      nombre_Administrador,
      correo_Administrador,
      rol_Administrador,
      pin_seguridad,
      id,
    ],
    (err) => {
      if (err)
        return res.status(500).json({ message: "❌ Error al actualizar", error: err });
      return res.json({ message: "🔁 Administrador actualizado correctamente" });
    }
  );
});

// Eliminar administrador por ID
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const getUsuario = "SELECT * FROM Administrador WHERE id_Administrador = ?";

  db.query(getUsuario, [id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error buscando Usuario" });
    if (!results || results.length === 0) {
      return res.status(404).json({ message: "❌ Administrador no encontrado" });
    }

    const deleteQuery = "DELETE FROM Administrador WHERE id_Administrador = ?";
    db.query(deleteQuery, [id], (err) => {
      if (err) return res.status(500).json({ error: "Error al eliminar usuario" });
      return res.json({ message: "✅ Administrador eliminado correctamente" });
    });
  });
});

export default router;
