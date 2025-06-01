const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('pdf'), (req, res) => {
  res.json({ filename: req.file.filename });
});

app.post('/process', async (req, res) => {
  const { edits, filename } = req.body;
  const pdfBytes = fs.readFileSync(`uploads/${filename}`);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  edits.forEach(edit => {
    const page = pages[edit.page];
    const { x, y, width, height, type, text } = edit;

    if (type === 'blur' || type === 'erase') {
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color: rgb(1, 1, 1),
        opacity: type === 'blur' ? 0.5 : 1
      });
    } else if (type === 'text') {
      page.drawText(text, { x, y, size: 12 });
    }
  });

  const newPdf = await pdfDoc.save();
  const newFilename = `edited_${filename}`;
  fs.writeFileSync(`uploads/${newFilename}`, newPdf);

  res.json({ filename: newFilename });
});

app.get('/download/:filename', (req, res) => {
  res.download(`uploads/${req.params.filename}`);
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
