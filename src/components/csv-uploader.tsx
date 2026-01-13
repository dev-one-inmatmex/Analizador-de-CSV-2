'use client';

import { useState, useRef, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [startRow, setStartRow] = useState<number>(0);
  const [endRow, setEndRow] = useState<number>(0);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      parseCsv(selectedFile);
    }
  };

  const parseCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      const fileHeaders = rows[0];
      setHeaders(fileHeaders);
      const allColumns = new Set(fileHeaders);
      setSelectedColumns(allColumns);
      const fileData = rows.slice(1);
      setData(fileData);
      setStartRow(1);
      setEndRow(fileData.length);
    };
    reader.readAsText(file);
  };


  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      setFile(droppedFile);
      parseCsv(droppedFile);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setData([]);
    setHeaders([]);
    setSelectedColumns(new Set());
    setStartRow(0);
    setEndRow(0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (file) {
      // Replace with your actual upload logic
      console.log('Uploading:', file.name);
      console.log('Selected columns:', Array.from(selectedColumns));
      console.log('Selected rows:', `from ${startRow} to ${endRow}`);
      alert(`Simulating upload for: ${file.name}`);
    }
  };

  const handleColumnSelectionChange = (header: string) => {
    const newSelectedColumns = new Set(selectedColumns);
    if (newSelectedColumns.has(header)) {
      newSelectedColumns.delete(header);
    } else {
      newSelectedColumns.add(header);
    }
    setSelectedColumns(newSelectedColumns);
  };

  const filteredData = useMemo(() => {
    const start = Math.max(0, startRow - 1);
    const end = Math.min(data.length, endRow);
    return data.slice(start, end);
  }, [data, startRow, endRow]);

  const filteredHeaders = useMemo(() => {
    return headers.filter(header => selectedColumns.has(header));
  }, [headers, selectedColumns]);


  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Cargar Documento CSV</CardTitle>
        <CardDescription>
          Arrastra y suelta tu archivo CSV aquí o haz clic para seleccionarlo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {!file && (
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
          )}

          {file && (
            <>
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

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Seleccionar Columnas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border p-4 rounded-md">
                    {headers.map((header) => (
                      <div key={header} className="flex items-center gap-2">
                        <Checkbox
                          id={header}
                          checked={selectedColumns.has(header)}
                          onCheckedChange={() => handleColumnSelectionChange(header)}
                        />
                        <Label htmlFor={header} className="truncate">{header}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-2">Seleccionar Filas</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="startRow">Desde</Label>
                            <Input
                                id="startRow"
                                type="number"
                                value={startRow}
                                onChange={(e) => setStartRow(Number(e.target.value))}
                                min="1"
                                max={data.length}
                                className="w-24"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="endRow">Hasta</Label>
                            <Input
                                id="endRow"
                                type="number"
                                value={endRow}
                                onChange={(e) => setEndRow(Number(e.target.value))}
                                min="1"
                                max={data.length}
                                className="w-24"
                            />
                        </div>
                    </div>
                </div>
                
                <div className="relative max-h-96 overflow-auto border rounded-lg">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                {headers.map((header, index) => (
                                    selectedColumns.has(header) ? <TableHead key={index}>{header}</TableHead> : null
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        selectedColumns.has(headers[cellIndex]) ? <TableCell key={cellIndex}>{cell}</TableCell> : null
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              </div>


              <Button onClick={handleUploadClick} disabled={!file} className="w-full">
                Cargar archivo
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
