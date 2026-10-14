// db/schema.js
//
// Crea (si no existen) las tablas necesarias para la zona de clientes,
// el proceso de pintura y el inventario. Se ejecuta una vez al arrancar
// el servidor, igual que index.js crea la carpeta "uploads" si falta.

const TABLAS = [
  `CREATE TABLE IF NOT EXISTS Cliente (
    id_Cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre_Cliente VARCHAR(150) NOT NULL,
    correo_Cliente VARCHAR(150) NOT NULL UNIQUE,
    contraseña_Cliente VARCHAR(255) NOT NULL,
    telefono_Cliente VARCHAR(30),
    fecha_Registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS PasoProceso (
    id_Paso INT AUTO_INCREMENT PRIMARY KEY,
    nombre_Paso VARCHAR(100) NOT NULL,
    orden INT NOT NULL UNIQUE
  )`,

  `CREATE TABLE IF NOT EXISTS ModeloVehiculo (
    id_Modelo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_Modelo VARCHAR(100) NOT NULL UNIQUE
  )`,

  `CREATE TABLE IF NOT EXISTS Vehiculo (
    id_Vehiculo INT AUTO_INCREMENT PRIMARY KEY,
    id_Cliente INT NOT NULL,
    id_Modelo INT,
    nombre_Modelo_Texto VARCHAR(100),
    placa VARCHAR(20),
    color VARCHAR(50),
    id_Paso_Actual INT,
    estado ENUM('en_proceso', 'finalizado') NOT NULL DEFAULT 'en_proceso',
    fecha_Ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_Actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_Cliente) REFERENCES Cliente(id_Cliente) ON DELETE CASCADE,
    FOREIGN KEY (id_Modelo) REFERENCES ModeloVehiculo(id_Modelo) ON DELETE SET NULL,
    FOREIGN KEY (id_Paso_Actual) REFERENCES PasoProceso(id_Paso) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS Producto (
    id_Producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_Producto VARCHAR(150) NOT NULL,
    unidad_medida VARCHAR(50) DEFAULT 'unidad'
  )`,

  `CREATE TABLE IF NOT EXISTS ModeloProductoTemplate (
    id_Template INT AUTO_INCREMENT PRIMARY KEY,
    id_Modelo INT NOT NULL,
    id_Paso INT,
    id_Producto INT NOT NULL,
    cantidad_Recomendada DECIMAL(10,2) NOT NULL DEFAULT 1,
    FOREIGN KEY (id_Modelo) REFERENCES ModeloVehiculo(id_Modelo) ON DELETE CASCADE,
    FOREIGN KEY (id_Paso) REFERENCES PasoProceso(id_Paso) ON DELETE CASCADE,
    FOREIGN KEY (id_Producto) REFERENCES Producto(id_Producto) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS Solicitud (
    id_Solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_Vehiculo INT NOT NULL,
    id_Administrador INT,
    fecha_Solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente', 'entregada') NOT NULL DEFAULT 'pendiente',
    FOREIGN KEY (id_Vehiculo) REFERENCES Vehiculo(id_Vehiculo) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS SolicitudDetalle (
    id_Detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_Solicitud INT NOT NULL,
    id_Producto INT NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
    FOREIGN KEY (id_Solicitud) REFERENCES Solicitud(id_Solicitud) ON DELETE CASCADE,
    FOREIGN KEY (id_Producto) REFERENCES Producto(id_Producto) ON DELETE CASCADE
  )`,
];

const PASOS_INICIALES = [
  "Alistamiento de pintura",
  "Lijado",
  "Preparación de pintura",
  "Detallado",
  "Pulido",
];

export async function initSchema(db) {
  const conn = db.promise();

  for (const sql of TABLAS) {
    await conn.query(sql);
  }

  const [pasos] = await conn.query("SELECT COUNT(*) AS total FROM PasoProceso");
  if (pasos[0].total === 0) {
    const values = PASOS_INICIALES.map((nombre, i) => [nombre, i + 1]);
    await conn.query("INSERT INTO PasoProceso (nombre_Paso, orden) VALUES ?", [values]);
    console.log("🎨 Pasos del proceso de pintura sembrados");
  }

  console.log("🗄️  Esquema de cliente/proceso/inventario listo");
}
