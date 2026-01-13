'use client';

import { useState, useRef, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';


type SelectedCell = {
    rowIndex: number;
    colIndex: number;
};

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);


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
      setHeaders(rows[0]);
      setData(rows.slice(1));
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
    setSelectedCells([]);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (file) {
      // Replace with your actual upload logic
      console.log('Uploading:', file.name);
      const selectedData = selectedCells.map(cell => ({
        header: headers[cell.colIndex],
        value: data[cell.rowIndex][cell.colIndex],
        rowIndex: cell.rowIndex,
        colIndex: cell.colIndex,
      }));
      console.log('Selected cells data:', selectedData);
      alert(`Simulating upload for: ${file.name} with ${selectedCells.length} cells selected.`);
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCells(prevSelectedCells => {
        const isSelected = prevSelectedCells.some(
            cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex
        );

        if (isSelected) {
            return prevSelectedCells.filter(
                cell => !(cell.rowIndex === rowIndex && cell.colIndex === colIndex)
            );
        } else {
            return [...prevSelectedCells, {rowIndex, colIndex}];
        }
    });
  };

  const isCellSelected = (rowIndex: number, colIndex: number) => {
    return selectedCells.some(
        cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex
    );
  }


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
                  <h3 className="text-lg font-medium mb-2">Seleccionar Celdas</h3>
                  <p className="text-sm text-muted-foreground">
                    Haz clic en las celdas para seleccionarlas o deseleccionarlas.
                  </p>
                </div>
                
                <div className="relative max-h-96 overflow-auto border rounded-lg">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                {headers.map((header, index) => (
                                    <TableHead key={index}>{header}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <TableCell 
                                            key={cellIndex}
                                            className={cn(
                                                'cursor-pointer',
                                                { 'bg-accent text-accent-foreground': isCellSelected(rowIndex, cellIndex) }
                                            )}
                                            onClick={() => handleCellClick(rowIndex, cellIndex)}
                                        >
                                            {cell}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              </div>


              <Button onClick={handleUploadClick} disabled={!file} className="w-full">
                Cargar datos seleccionados
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
