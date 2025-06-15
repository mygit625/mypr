// This file can be used for server actions specific to PDF to JPG, if any.
// For now, most logic is client-side.
// We keep the re-export of PageData as PdfPagePreview might implicitly expect it or for future use.
export type { PageData } from '../organize/actions';

// No specific server actions are defined here for the current PDF to JPG client-side conversion logic.
// If server-side processing for JPG conversion were added, it would go here.
