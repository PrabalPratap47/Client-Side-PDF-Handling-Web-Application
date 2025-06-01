import React, { useState, useRef, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
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

  const pageRef = useRef();
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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

  // Convert click to PDF coordinates
  const handlePageClick = (event) => {
    if (!editMode) return;
    const rect = event.target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (rect.height - (event.clientY - rect.top)) / scale;
    setMarker({ x, y, page: currentPage });
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
      setMarker(null); // reset marker after edit
      setText('');
    } catch (err) {
      setError('Failed to edit PDF.');
      console.error('Edit error:', err);
    }
  };

  // Marker style calculation (centered under cursor)
  let markerStyle = { display: 'none' };
  if (marker && marker.page === currentPage && canvasSize.width && canvasSize.height) {
    const left = marker.x * scale;
    const top = canvasSize.height - marker.y * scale;
    if (editMode === 'text') {
      markerStyle = {
        position: 'absolute',
        left: left - 5,
        top: top - 5,
        width: 10,
        height: 10,
        background: 'blue',
        borderRadius: '50%',
        border: '2px solid white',
        zIndex: 10,
        pointerEvents: 'none'
      };
    } else if (editMode === 'erase') {
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
            onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); setMarker(null); }}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={() => { setCurrentPage((p) => Math.min(numPages, p + 1)); setMarker(null); }}
            disabled={currentPage >= numPages}
          >
            Next
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1em' }}>
          <select
            value={editMode}
            onChange={(e) => { setEditMode(e.target.value); setMarker(null); }}
          >
            <option value="">Select Edit Mode</option>
            <option value="blur">Blur Section</option>
            <option value="erase">Erase Section</option>
            <option value="text">Add Text</option>
          </select>
          {editMode === 'text' && (
            <input
              type="text"
              placeholder="Enter text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
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
              renderTextLayer={true}
              style={{ cursor: editMode ? 'crosshair' : 'default' }}
            />
          </Document>
          <div style={markerStyle}></div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
