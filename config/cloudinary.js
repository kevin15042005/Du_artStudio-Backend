import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// Validación de entorno
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  throw new Error("❌ Faltan variables de configuración de Cloudinary");
}

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configurar almacenamiento
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "Assets",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
    public_id: `${Date.now()}-${file.originalname}`, // esto es esencial
  }),
});

// Multer configurado
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export { cloudinary, upload };
