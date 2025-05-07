const multer = require('multer');
const path = require('path');

// Configure where and how images are stored
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save in uploads/ folder
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${file.fieldname}${ext}`;
        cb(null, uniqueName);
    }
});

// Only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
};

const upload  = multer({ storage, fileFilter });

module.exports = upload;