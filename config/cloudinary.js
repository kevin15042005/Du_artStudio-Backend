import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Validación de variables de entorno
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("❌ Faltan variables de configuración de Cloudinary");
}

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ✅ Almacenamiento en Cloudinary (CORREGIDO: usar `filename` y `folder`)
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Assets", // ✅ Tu carpeta en Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"], // ✅ Tipos permitidos
    resource_type: "image",
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
    format: "jpg", // opcional: fuerza formato final
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // ✅ OJO: debe ser función si necesitas personalizar
  },
});

// ✅ Multer con Cloudinary
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite 5 MB por imagen
});

export { cloudinary, upload };
