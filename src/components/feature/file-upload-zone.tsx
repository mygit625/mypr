"use client";

import { useCallback, useState, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, File as FileIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  accept?: string; // e.g., "application/pdf"
  maxFiles?: number;
}

export function FileUploadZone({
  onFilesSelected,
  multiple = false,
  accept = "application/pdf",
  maxFiles = 5,
}: FileUploadZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      updateSelectedFiles(newFiles);
    }
  };

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragOver(false);
      if (event.dataTransfer.files) {
        const newFiles = Array.from(event.dataTransfer.files).filter(file => 
          accept === "*" || file.type === accept || accept.split(',').map(s => s.trim()).includes(file.type)
        );
        if (newFiles.length > 0) {
           updateSelectedFiles(newFiles);
        }
      }
    },
    [accept, multiple, maxFiles, selectedFiles]
  );

  const updateSelectedFiles = (newFiles: File[]) => {
    let updatedFiles;
    if (multiple) {
      updatedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
    } else {
      updatedFiles = newFiles.slice(0, 1);
    }
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const removeFile = (fileName: string) => {
    const newFiles = selectedFiles.filter(file => file.name !== fileName);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed hover:border-primary transition-colors
                    ${dragOver ? 'border-primary bg-accent/20' : 'border-border'}
                    ${selectedFiles.length > 0 && !multiple ? 'cursor-not-allowed opacity-70' : ''}`}
        onDrop={multiple || selectedFiles.length === 0 ? handleDrop : undefined}
        onDragOver={multiple || selectedFiles.length === 0 ? handleDragOver : undefined}
        onDragLeave={multiple || selectedFiles.length === 0 ? handleDragLeave : undefined}
      >
        <CardContent className="p-6 text-center">
          <input
            type="file"
            id="file-upload"
            multiple={multiple}
            accept={accept}
            onChange={handleFileChange}
            className="sr-only"
            disabled={!multiple && selectedFiles.length > 0}
          />
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center space-y-2 ${multiple || selectedFiles.length === 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}
          >
            <UploadCloud className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              {accept === "application/pdf" ? "PDF files only. " : ""}
              {multiple ? `Up to ${maxFiles} files.` : 'Single file only.'}
            </p>
          </label>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <div>
          <h4 className="text-md font-medium mb-2">Selected File{selectedFiles.length > 1 ? 's' : ''}:</h4>
          <ScrollArea className="h-40 rounded-md border p-2">
            <ul className="space-y-2">
              {selectedFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
