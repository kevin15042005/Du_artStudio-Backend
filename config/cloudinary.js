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

// Configurar almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Assets", // Carpeta donde se guardan las imágenes
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image", // Importante para que no lo suba como raw
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  },
});

// Configurar multer con el almacenamiento en Cloudinary
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite 5 MB por archivo
});

export { cloudinary, upload };
