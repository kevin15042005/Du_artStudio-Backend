// routes/admin.js
import express from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";

const router = express.Router();

// Los hashes de bcrypt siempre empiezan con $2a$, $2b$ o $2y$
const esHashBcrypt = (valor) => typeof valor === "string" && /^\$2[aby]\$/.test(valor);

// Obtener todos los administradores
router.get("/", (req, res) => {
  const q =
    "SELECT id_Administrador, nombre_Administrador, correo_Administrador, rol_Administrador FROM Administrador";
  db.query(q, (err, data) => {
    if (err) return res.status(500).json({ error: "Error al obtener datos" });
    return res.json(data);
  });
});

// Registro de administrador
router.post("/register", async (req, res) => {
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
    async (err, data) => {
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

      const hash = await bcrypt.hash(contraseña_Administrador, 10);

      const q = `
        INSERT INTO Administrador
        (nombre_Administrador, contraseña_Administrador, correo_Administrador, rol_Administrador, pin_seguridad)
        VALUES (?, ?, ?, ? , ?)`;

      db.query(
        q,
        [
          nombre_Administrador,
          hash,
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
  const q = "SELECT * FROM Administrador WHERE correo_Administrador = ?";

  db.query(q, [correo_Administrador], async (err, data) => {
    if (err)
      return res.status(500).json({ message: "❌ Error en el servidor", error: err });

    if (data.length === 0) {
      return res.status(401).json({ message: "❌ Credenciales incorrectas" });
    }

    const admin = data[0];
    const hashGuardado = admin.contraseña_Administrador;

    // Cuentas ya migradas a bcrypt
    if (esHashBcrypt(hashGuardado)) {
      const coincide = await bcrypt.compare(contraseña_Administrador, hashGuardado);
      if (!coincide) {
        return res.status(401).json({ message: "❌ Credenciales incorrectas" });
      }
      delete admin.contraseña_Administrador;
      return res.json({ message: "✅ Inicio de sesión exitoso", usuario: admin });
    }

    // Cuenta antigua con contraseña en texto plano: si coincide, se migra a bcrypt
    if (contraseña_Administrador !== hashGuardado) {
      return res.status(401).json({ message: "❌ Credenciales incorrectas" });
    }

    try {
      const nuevoHash = await bcrypt.hash(contraseña_Administrador, 10);
      db.query(
        "UPDATE Administrador SET contraseña_Administrador = ? WHERE id_Administrador = ?",
        [nuevoHash, admin.id_Administrador]
      );
    } catch (hashErr) {
      console.error("❌ Error migrando contraseña a bcrypt:", hashErr);
    }

    delete admin.contraseña_Administrador;
    return res.json({ message: "✅ Inicio de sesión exitoso", usuario: admin });
  });
});

// Actualizar contraseña por correo y PIN
router.put("/update", (req, res) => {
  const { correo_Administrador, pin_seguridad, nuevaContraseña } = req.body;

  const verificarQuery = "SELECT pin_seguridad FROM Administrador WHERE correo_Administrador = ?";

  db.query(verificarQuery, [correo_Administrador], async (err, data) => {
    if (err)
      return res.status(500).json({ message: "❌ Error al verificar pin", error: err });

    if (data.length === 0) {
      return res.status(404).json({ message: "❌ Correo no registrado" });
    }

    const pinActual = data[0].pin_seguridad;

    if (pin_seguridad != pinActual) {
      return res.status(400).json({ message: "❌ El pin no es correcto" });
    }

    const nuevoHash = await bcrypt.hash(nuevaContraseña, 10);
    const actualizarQuery =
      "UPDATE Administrador SET contraseña_Administrador = ? WHERE correo_Administrador = ?";

    db.query(actualizarQuery, [nuevoHash, correo_Administrador], (err) => {
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
