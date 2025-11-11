// Utility to map file extensions to React Icons
// Extend this mapping as needed.
import {
  FiFileText,
  FiFile,
  FiImage,
  FiMusic,
  FiFilm,
  FiArchive,
  FiTable,
  FiCode,
} from 'react-icons/fi';

const EXT_ICON_MAP = {
  // Documents
  pdf: FiFileText,
  txt: FiFileText,
  doc: FiFileText,
  docx: FiFileText,
  ppt: FiFileText,
  pptx: FiFileText,
  xml: FiCode,
  // Spreadsheets
  xls: FiTable,
  xlsx: FiTable,
  csv: FiTable,
  // Images
  jpg: FiImage,
  jpeg: FiImage,
  png: FiImage,
  gif: FiImage,
  svg: FiImage,
  webp: FiImage,
  // Audio
  mp3: FiMusic,
  wav: FiMusic,
  ogg: FiMusic,
  flac: FiMusic,
  // Video
  mp4: FiFilm,
  mov: FiFilm,
  avi: FiFilm,
  mkv: FiFilm,
  webm: FiFilm,
  // Archives
  zip: FiArchive,
  rar: FiArchive,
  '7z': FiArchive,
  tar: FiArchive,
  gz: FiArchive,
};

export function getFileExtension(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.split('?')[0].split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

export function getFileIcon(name) {
  const ext = getFileExtension(name);
  const Icon = EXT_ICON_MAP[ext] || FiFile;
  return Icon;
}

export function getExtensionBadge(name) {
  const ext = getFileExtension(name);
  return ext ? ext.toUpperCase() : 'FILE';
}
