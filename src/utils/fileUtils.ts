export const formatFileSize = (bytes: any) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export const getFileUrl = (fileId: string | number) =>
  `${import.meta.env.VITE_BACKEND_URL}/api/files/${fileId}`;

export const isImageFile = (attachment: any) => attachment?.is_image;
