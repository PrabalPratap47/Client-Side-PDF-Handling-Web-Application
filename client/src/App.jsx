import React, { useState } from 'react';
import PdfViewer from './components/PdfViewer';

const App = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBuffer, setPdfBuffer] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url); // blob URL for rendering
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => setPdfBuffer(reader.result);
    }
  };

  return (
    <div>
      <h1>React PDF Editor</h1>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        style={{ margin: '1em 0' }}
      />
      {pdfUrl && pdfBuffer && (
        <PdfViewer pdfUrl={pdfUrl} pdfBuffer={pdfBuffer} />
      )}
    </div>
  );
};

export default App;
