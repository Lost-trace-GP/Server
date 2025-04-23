// import multer from 'multer';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
// import cloudinary from './cloudinary';
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: 'lost-trace-reports',
//     allowed_formats: ['jpg', 'jpeg', 'png'],
//     transformation: [{ width: 500, height: 500, crop: 'limit' }, { quality: 'auto' }],
//   } as any,
// });

// export default multer({ storage });

import multer from 'multer';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
