import React, { useState, useRef, useCallback } from 'react';
import './ImageUpload.css';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  isProcessing?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageUpload, 
  isProcessing = false 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onImageUpload(file);
  }, [onImageUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please use file upload instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        onImageUpload(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [onImageUpload, stopCamera]);

  if (showCamera) {
    return (
      <div className="camera-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="camera-video"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div className="camera-controls">
          <button 
            onClick={capturePhoto}
            className="capture-button"
            disabled={isProcessing}
          >
            📷 Capture Photo
          </button>
          <button 
            onClick={stopCamera}
            className="cancel-button"
            disabled={isProcessing}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="image-upload-container">
      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="image-preview" />
          <button 
            onClick={() => {
              setPreview(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="remove-button"
            disabled={isProcessing}
          >
            ✕ Remove
          </button>
        </div>
      ) : (
        <div
          className={`upload-area ${dragActive ? 'drag-active' : ''} ${isProcessing ? 'processing' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <div className="upload-content">
            <div className="upload-icon">📷</div>
            <h3>Upload Food Image</h3>
            <p>Drag and drop an image here, or click to select</p>
            <p className="supported-formats">Supports: JPEG, PNG, WebP</p>
          </div>
        </div>
      )}

      <div className="upload-buttons">
        <button 
          onClick={openFileDialog}
          className="upload-button"
          disabled={isProcessing}
        >
          📁 Choose File
        </button>
        <button 
          onClick={startCamera}
          className="camera-button"
          disabled={isProcessing}
        >
          📷 Use Camera
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {isProcessing && (
        <div className="processing-overlay">
          <div className="spinner"></div>
          <p>Processing image...</p>
        </div>
      )}
    </div>
  );
};