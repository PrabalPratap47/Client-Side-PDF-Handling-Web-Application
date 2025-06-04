import React, { useState, useRef, useEffect } from 'react';
import { Document, Page,  } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';



const RECT_WIDTH = 200;
const RECT_HEIGHT = 40;

const PdfViewer = ({ pdfUrl, pdfBuffer }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [marker, setMarker] = useState(null); // {x, y, page}
  const [scale] = useState(1.2);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [textBoxPos, setTextBoxPos] = useState(null); // px position for textarea

  const pageRef = useRef();

  useEffect(() => {
    setTimeout(() => {
      const canvas = pageRef.current?.querySelector('canvas');
      if (canvas) {
        setCanvasSize({
          width: canvas.width,
          height: canvas.height
        });
      }
    }, 200);
  }, [currentPage, pdfUrl, scale]);

  const handleDocumentLoad = ({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  };

  const handleLoadError = (err) => {
    setError('Failed to load PDF. Please check the file and try again.');
    console.error('PDF load error:', err);
  };

  const handleSourceError = (err) => {
    setError('Invalid PDF source.');
    console.error('PDF source error:', err);
  };

  const handlePageClick = (event) => {
    if (!editMode) return;

    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (rect.height - (event.clientY - rect.top)) / scale;
    setMarker({ x, y, page: currentPage });

    if (editMode === 'text') {
      setTextBoxPos({
        left: event.clientX - rect.left,
        top: event.clientY - rect.top,
      });
    } else {
      setTextBoxPos(null);
    }
  };

  const applyEdit = async () => {
    if (!marker || marker.page !== currentPage) {
      setError('Click on the page to select where to edit.');
      return;
    }
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      const page = pages[currentPage - 1];
      const { x, y } = marker;

      if (editMode === 'text') {
        page.drawText(text || 'Sample Text', {
          x,
          y,
          size: 20,
          color: rgb(0, 0, 0),
        });
      }
      if (editMode === 'erase') {
        page.drawRectangle({
          x: x - RECT_WIDTH / 2,
          y: y - RECT_HEIGHT / 2,
          width: RECT_WIDTH,
          height: RECT_HEIGHT,
          color: rgb(1, 1, 1),
        });
      }
      if (editMode === 'blur') {
        page.drawRectangle({
          x: x - RECT_WIDTH / 2,
          y: y - RECT_HEIGHT / 2,
          width: RECT_WIDTH,
          height: RECT_HEIGHT,
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.5,
        });
      }

      const editedBytes = await pdfDoc.save();
      const blob = new Blob([editedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited.pdf';
      link.click();

      // Reset states
      setMarker(null);
      setText('');
      setTextBoxPos(null);
      setError(null);
    } catch (err) {
      setError('Failed to edit PDF.');
      console.error('Edit error:', err);
    }
  };

  // Calculate marker styles for erase & blur box
  let markerStyle = { display: 'none' };
  if (marker && marker.page === currentPage && canvasSize.width && canvasSize.height) {
    const left = marker.x * scale;
    const top = canvasSize.height - marker.y * scale;

    if (editMode === 'erase') {
      markerStyle = {
        position: 'absolute',
        left: left - (RECT_WIDTH * scale) / 2,
        top: top - (RECT_HEIGHT * scale) / 2,
        width: RECT_WIDTH * scale,
        height: RECT_HEIGHT * scale,
        background: 'rgba(255,0,0,0.15)',
        border: '2px solid red',
        zIndex: 10,
        pointerEvents: 'none'
      };
    } else if (editMode === 'blur') {
      markerStyle = {
        position: 'absolute',
        left: left - (RECT_WIDTH * scale) / 2,
        top: top - (RECT_HEIGHT * scale) / 2,
        width: RECT_WIDTH * scale,
        height: RECT_HEIGHT * scale,
        background: 'rgba(150,150,150,0.3)',
        border: '2px dashed #333',
        zIndex: 10,
        pointerEvents: 'none'
      };
    }
  }

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '1em'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1em', marginBottom: '1em' }}>
          <button
            onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setMarker(null); setTextBoxPos(null); }}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={() => { setCurrentPage((p) => Math.min(numPages, p + 1)); setMarker(null); setTextBoxPos(null); }}
            disabled={currentPage >= numPages}
          >
            Next
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
          <select
            value={editMode}
            onChange={(e) => { setEditMode(e.target.value); setMarker(null); setTextBoxPos(null); setText(''); }}
          >
            <option value="">Select Edit Mode</option>
            <option value="blur">Blur Section</option>
            <option value="erase">Erase Section</option>
            <option value="text">Add Text</option>
          </select>
          <button
            onClick={applyEdit}
            disabled={!editMode || !marker}
          >
            Apply & Download
          </button>
        </div>
        {editMode && (
          <div style={{ marginTop: '0.5em', color: '#555' }}>
            Click on the PDF page to choose <b>{editMode === 'text' ? 'where to add text' : `where to ${editMode}`}</b>.
          </div>
        )}
        {error && <div style={{ color: 'red', marginTop: '1em' }}>{error}</div>}
      </div>

      {/* PDF display with marker overlay */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <div ref={pageRef} style={{ position: 'relative', display: 'inline-block' }}>
          <Document
            file={pdfUrl}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={handleLoadError}
            onSourceError={handleSourceError}
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              onClick={handlePageClick}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              style={{ cursor: editMode ? 'crosshair' : 'default' }}
            />
          </Document>

          {/* Erase or Blur marker box */}
          {(editMode === 'erase' || editMode === 'blur') && <div style={markerStyle}></div>}

          {/* Text input box */}
          {editMode === 'text' && marker && marker.page === currentPage && textBoxPos && (
            <textarea
              style={{
                position: 'absolute',
                left: textBoxPos.left,
                top: textBoxPos.top,
                width: RECT_WIDTH * scale,
                height: RECT_HEIGHT * scale,
                resize: 'none',
                fontSize: 16,
                zIndex: 20,
                border: '2px solid blue',
                background: 'rgba(255,255,255,0.9)',
              }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="Type here..."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
