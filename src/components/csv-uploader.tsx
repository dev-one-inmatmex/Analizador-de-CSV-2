'use client';

import { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setFile(event.dataTransfer.files[0]);
      // Clear the input value in case the user wants to re-select the same file via the input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (file) {
      // Replace with your actual upload logic
      console.log('Uploading:', file.name);
      alert(`Simulating upload for: ${file.name}`);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Cargar Documento CSV</CardTitle>
        <CardDescription>
          Arrastra y suelta tu archivo CSV aquí o haz clic para seleccionarlo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer border-border hover:bg-accent hover:border-primary transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta
              </p>
              <p className="text-xs text-muted-foreground">Solo archivos CSV</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <FileIcon className="w-6 h-6 text-foreground" />
                <span className="text-sm font-medium text-foreground truncate max-w-xs">
                  {file.name}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                <X className="w-4 h-4" />
                <span className="sr-only">Eliminar archivo</span>
              </Button>
            </div>
          )}

          <Button onClick={handleUploadClick} disabled={!file} className="w-full">
            Cargar archivo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
