/**
 * Image processing utilities for WorkTrack surveillance audits.
 * Compresses images client-side before storing to avoid localStorage quota limits.
 */

export const processImageFile = (file, maxWidth = 1200, maxHeight = 900, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected.'));
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (JPEG, PNG, WebP, etc.).'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if canvas context fails
          resolve({
            id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: e.target.result,
            uploadedAt: new Date().toISOString(),
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG format
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: Math.round(dataUrl.length * (3 / 4)),
          type: 'image/jpeg',
          dataUrl,
          uploadedAt: new Date().toISOString(),
        });
      };

      img.onerror = () => {
        reject(new Error('Could not parse image data. Please try another image.'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };

    reader.readAsDataURL(file);
  });
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
