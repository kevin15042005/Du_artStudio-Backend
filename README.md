# DUART-STUDIO Backend (API REST)

API de la plataforma web de un taller de pintura y personalización de motocicletas en Bogotá. Expone los servicios que consume el frontend: autenticación de administradores y clientes, publicación de noticias y trabajos de pintura, catálogo de la tienda, marcas aliadas, seguimiento del proceso de pintura de cada vehículo e inventario de insumos.

---

## Integrantes

| Integrante | Rol |
|---|---|
| Kevin Alejandro Reyes Sarmiento | Desarrollador Full Stack |

---

## Tecnologías

| Tecnología | Uso en el proyecto |
|---|---|
| **Node.js** | Entorno de ejecución del servidor (módulos ES, `"type": "module"`). |
| **Express** | Framework HTTP; define el servidor y un router por módulo. |
| **MySQL + mysql2** | Base de datos relacional. `mysql2` gestiona la conexión y las consultas (callbacks y `db.promise()`). |
| **bcryptjs** | Hash de contraseñas de administradores y clientes. |
| **Multer + Cloudinary** | Recepción de imágenes (`multipart/form-data`) mediante `multer-storage-cloudinary`; las imágenes se almacenan en Cloudinary, carpeta `Assets`. |
| **dotenv** | Carga de variables de entorno desde el archivo `.env`. |
| **cors** | Restringe el acceso a la API al dominio del frontend. |
| **Render** | Plataforma de despliegue de la API. |

---

## Arquitectura general

El backend es una **API REST** construida con Express. Cada módulo funcional tiene su propio router en `routes/`, que se monta sobre un prefijo en `index.js`. Todos los routers comparten una única conexión MySQL (`db.js`) y, cuando manejan imágenes, el middleware de subida configurado en `config/cloudinary.js`.

Al arrancar, el servidor:

1. Configura CORS para permitir el frontend en Vercel (`https://du-art-studio-fron-end.vercel.app`) y el servidor local de Vite (`http://localhost:5173` y `http://localhost:4173`), con los métodos `GET`, `POST`, `PUT` y `DELETE`.
2. Habilita el parseo de JSON y sirve la carpeta `uploads/` como estática (la crea si no existe).
3. Ejecuta `initSchema(db)`, que crea las tablas de clientes, vehículos, proceso de pintura e inventario si no existen y siembra los cinco pasos del proceso de pintura.
4. Inicia el servidor en el puerto definido por `PORT` (por defecto `8080`).

Las tablas `Administrador`, `Noticias`, `Noticias_Pintura`, `Shop` y `Marcas_Aliadas` no se crean automáticamente; deben existir previamente en la base de datos.

### Estructura de carpetas

```
Du_artStudio-Backend/
├── index.js              # Punto de entrada: configura Express, CORS, rutas, crea el esquema e inicia el servidor
├── db.js                 # Conexión única a MySQL con mysql2, a partir de las variables DB_*
├── db/
│   └── schema.js         # initSchema(): crea las tablas de cliente/proceso/inventario y siembra los pasos de pintura
├── config/
│   └── cloudinary.js     # Configura Cloudinary y exporta el middleware `upload` de Multer (máx. 5 MB, jpg/jpeg/png/webp)
├── routes/
│   ├── admin.js          # Registro, login, recuperación de contraseña con PIN y CRUD de administradores
│   ├── noticias.js       # CRUD de noticias con imágenes y enlace opcional
│   ├── pintura.js        # CRUD de publicaciones de trabajos de pintura con imágenes
│   ├── Shop.js           # CRUD de artículos de la tienda por catálogo
│   ├── aliados.js        # CRUD de marcas aliadas con logo
│   ├── cliente.js        # Registro y login de clientes; registro y consulta de sus vehículos
│   ├── proceso.js        # Pasos del proceso de pintura, catálogo de modelos y gestión de vehículos en taller
│   └── inventario.js     # Productos, plantillas de insumos por modelo/paso y solicitudes de materiales
├── uploads/              # Carpeta estática servida en /uploads (imágenes locales heredadas)
├── .env.example          # Plantilla de variables de entorno
└── package.json          # Dependencias y scripts (npm start → node index.js, npm run dev → nodemon index.js)
```

### Modelo de datos creado por `db/schema.js`

| Tabla | Descripción |
|---|---|
| `Cliente` | Cuentas de clientes (contraseña con hash bcrypt, correo único). |
| `PasoProceso` | Pasos ordenados del proceso de pintura: Alistamiento de pintura, Lijado, Preparación de pintura, Detallado y Pulido. |
| `ModeloVehiculo` | Catálogo de modelos de moto. |
| `Vehiculo` | Vehículo de un cliente, su paso actual y su estado (`en_proceso` / `finalizado`). |
| `Producto` | Insumos del inventario y su unidad de medida. |
| `ModeloProductoTemplate` | Plantilla de insumos recomendados por modelo y, opcionalmente, por paso. |
| `Solicitud` | Solicitud de materiales para un vehículo (`pendiente` / `entregada`). |
| `SolicitudDetalle` | Productos y cantidades de cada solicitud. |

---

## Endpoints

Las rutas que reciben imágenes esperan `multipart/form-data` con el campo `cover`; el resto recibe y responde JSON.

### Administradores — `/admin`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin` | Lista los administradores (id, nombre, correo y rol). |
| POST | `/admin/register` | Registra un administrador. Valida duplicados por nombre/correo y exige un PIN de seguridad de 4 caracteres. |
| POST | `/admin/login` | Inicia sesión por correo y contraseña. Migra a bcrypt las contraseñas antiguas en texto plano. |
| PUT | `/admin/update` | Cambia la contraseña verificando correo y PIN de seguridad. |
| PUT | `/admin/:id` | Actualiza nombre, correo, rol y PIN de un administrador. |
| DELETE | `/admin/:id` | Elimina un administrador. |

### Noticias — `/noticias`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/noticias` | Lista las noticias con el nombre del administrador autor, ordenadas por fecha. |
| POST | `/noticias/crear` | Crea una noticia con hasta 10 imágenes (`cover`) y un enlace opcional. |
| PUT | `/noticias/:id` | Actualiza una noticia; si se envían imágenes nuevas, reemplaza y elimina las anteriores en Cloudinary. |
| DELETE | `/noticias/:id` | Elimina una noticia y sus imágenes en Cloudinary. |

### Pintura — `/pintura`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/pintura` | Lista las publicaciones de trabajos de pintura, ordenadas por fecha. |
| POST | `/pintura/crear` | Crea una publicación con hasta 10 imágenes (`cover`) y el `id_Administrador` autor (por defecto `1`). |
| PUT | `/pintura/:id` | Actualiza una publicación y, opcionalmente, sus imágenes. |
| DELETE | `/pintura/:id` | Elimina una publicación y sus imágenes en Cloudinary. |

### Tienda — `/Shop`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/Shop` | Lista los artículos del catálogo. |
| POST | `/Shop/crear` | Crea un artículo (nombre, descripción, precio) con hasta 10 imágenes (`cover`) y el `id_Administrador` autor (por defecto `1`). |
| PUT | `/Shop` | Actualiza un artículo; el `id_Shop` se envía en el cuerpo de la petición. |
| DELETE | `/Shop/:id` | Elimina un artículo y sus imágenes en Cloudinary. |

### Marcas aliadas — `/api/aliados`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/aliados` | Lista las marcas aliadas con su logo. |
| POST | `/api/aliados` | Crea una marca aliada con una imagen (`cover`). |
| PUT | `/api/aliados/:id` | Actualiza el nombre y/o la imagen; elimina la imagen anterior en Cloudinary. |
| DELETE | `/api/aliados/:id` | Elimina una marca aliada y su imagen. |

### Clientes — `/cliente`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/cliente/register` | Registra un cliente (contraseña mínima de 6 caracteres, correo único). |
| POST | `/cliente/login` | Inicia sesión de cliente por correo y contraseña. |
| GET | `/cliente/:id/vehiculos` | Lista los vehículos del cliente con su modelo y paso actual. |
| POST | `/cliente/:id/vehiculos` | Registra un vehículo (modelo del catálogo o texto libre, placa, color) y lo ubica en el primer paso del proceso. |

### Proceso de pintura — `/proceso`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/proceso/pasos` | Lista los pasos del proceso de pintura en orden. |
| GET | `/proceso/modelos` | Lista el catálogo de modelos de vehículo. |
| POST | `/proceso/modelos` | Crea un modelo (rechaza duplicados). |
| PUT | `/proceso/modelos/:id` | Renombra un modelo. |
| DELETE | `/proceso/modelos/:id` | Elimina un modelo. |
| GET | `/proceso/vehiculos` | Lista todos los vehículos en taller con datos del cliente, modelo y paso (vista de administrador). |
| PUT | `/proceso/vehiculos/:id/paso` | Cambia el paso actual de un vehículo y lo marca como `en_proceso`. |
| PUT | `/proceso/vehiculos/:id/finalizar` | Marca un vehículo como `finalizado`. |

### Inventario — `/inventario`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/inventario/productos` | Lista los productos del inventario. |
| POST | `/inventario/productos` | Crea un producto con su unidad de medida (por defecto `unidad`). |
| PUT | `/inventario/productos/:id` | Actualiza un producto. |
| DELETE | `/inventario/productos/:id` | Elimina un producto. |
| GET | `/inventario/plantilla/:idModelo` | Lista los insumos de la plantilla de un modelo; admite el filtro `?idPaso=`. |
| POST | `/inventario/plantilla` | Agrega un producto y su cantidad recomendada a la plantilla de un modelo/paso. |
| DELETE | `/inventario/plantilla/:id` | Elimina un registro de la plantilla. |
| POST | `/inventario/solicitar` | Genera, en una transacción, una solicitud de materiales para un vehículo a partir de la plantilla de su modelo y paso actual. |
| GET | `/inventario/solicitudes` | Lista el historial de solicitudes con sus productos. |
| PUT | `/inventario/solicitudes/:id` | Cambia el estado de una solicitud (`pendiente` / `entregada`). |

---

## Instalación y ejecución

Requisitos: Node.js 18 o superior, una base de datos MySQL accesible y una cuenta de Cloudinary.

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd Du_artStudio-Backend

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno a partir de la plantilla y completar los valores
cp .env.example .env

# 4. Iniciar el servidor
npm start

# (Opcional) Iniciar con recarga automática durante el desarrollo
npm run dev
```

El servidor queda disponible en `http://localhost:8080` (o en el puerto definido en `PORT`). En el primer arranque se crean las tablas de cliente, proceso e inventario.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto en el que escucha el servidor. Opcional; por defecto `8080`. Render lo asigna automáticamente. |
| `DB_HOST` | Host del servidor MySQL. |
| `DB_PORT` | Puerto del servidor MySQL. |
| `DB_USER` | Usuario de la base de datos. |
| `DB_PASSWORD` | Contraseña del usuario de la base de datos. |
| `DB_NAME` | Nombre de la base de datos. |
| `CLOUDINARY_CLOUD_NAME` | Nombre de la cuenta (cloud name) de Cloudinary. Obligatoria. |
| `CLOUDINARY_API_KEY` | API key de Cloudinary. Obligatoria. |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary. Obligatoria. |
| `VITE_API_URL` | URL pública de la API. Opcional; solo se usa en el mensaje de arranque del servidor. |

Si falta alguna de las variables `CLOUDINARY_*`, `config/cloudinary.js` lanza un error y el servidor no arranca. El archivo [.env.example](.env.example) contiene la plantilla con valores de ejemplo.

---

## Despliegue

| Componente | Plataforma | URL |
|---|---|---|
| API (este repositorio) | Render | https://du-artstudio-backend.onrender.com |
| Frontend | Vercel | https://du-art-studio-fron-end.vercel.app |

En Render, el servicio se ejecuta con `npm install` como comando de build y `npm start` como comando de inicio. Las variables de entorno se configuran en el panel del servicio, no en el repositorio.
