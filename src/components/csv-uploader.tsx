'use client';

import { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rowRange, setRowRange] = useState({ start: 1, end: 0 });


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
      const headerRow = rows[0];
      const dataRows = rows.slice(1);
      setHeaders(headerRow);
      setData(dataRows);
      setSelectedColumns(headerRow);
      setRowRange({ start: 1, end: dataRows.length });
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
    setSelectedColumns([]);
    setRowRange({ start: 1, end: 0 });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (file) {
      console.log('Uploading:', file.name);

      const combinedSelection = new Set<string>();

      // Add individually selected cells
      selectedCells.forEach(cell => {
          combinedSelection.add(`${cell.rowIndex},${cell.colIndex}`);
      });

      // Add cells from selected rows and columns
      const startRow = Math.max(0, rowRange.start - 1);
      const endRow = Math.min(data.length - 1, rowRange.end - 1);

      if (rowRange.end > 0) {
        const columnIndices = selectedColumns.map(col => headers.indexOf(col));

        for (let i = startRow; i <= endRow; i++) {
          columnIndices.forEach(j => {
              if (j !== -1) {
                  combinedSelection.add(`${i},${j}`);
              }
          });
        }
      }
      
      const selectedData = Array.from(combinedSelection).map(coord => {
        const [rowIndex, colIndex] = coord.split(',').map(Number);
        if (data[rowIndex] && data[rowIndex][colIndex] !== undefined) {
            return {
                header: headers[colIndex],
                value: data[rowIndex][colIndex],
                rowIndex,
                colIndex,
            };
        }
        return null;
      }).filter(item => item !== null);

      console.log('Selected cells data:', selectedData);
      alert(`Simulating upload for: ${file.name} with ${selectedData.length} cells selected.`);
    }
  };

  const handleColumnToggle = (header: string) => {
    setSelectedColumns(prev => 
      prev.includes(header)
        ? prev.filter(h => h !== header)
        : [...prev, header]
    );
  };

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    setSelectedCells(prev => {
      const index = prev.findIndex(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex);
      if (index > -1) {
        return prev.filter((_, i) => i !== index);
      } else {
        return [...prev, { rowIndex, colIndex }];
      }
    });
  };
  
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    const isManuallySelected = selectedCells.some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex);
    if (isManuallySelected) return true;

    const isColumnSelected = selectedColumns.includes(headers[colIndex]);
    const isInRange = rowIndex >= rowRange.start - 1 && rowIndex < rowRange.end;

    return isInRange && isColumnSelected;
  }


  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle>Cargar Documento CSV</CardTitle>
        <CardDescription>
          Arrastra y suelta tu archivo CSV aquí o haz clic para seleccionarlo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Controles de Selección</h3>
                    <p className="text-sm text-muted-foreground">
                      Usa estas opciones para seleccionar los datos por rango y columnas.
                    </p>
                  </div>
                  
                  <div className="space-y-4 p-4 border rounded-lg max-h-96 overflow-hidden flex flex-col">
                    <div className="space-y-2">
                      <Label className="font-semibold">Rango de Filas</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="start-row"
                          type="number"
                          min="1"
                          max={data.length}
                          value={rowRange.start}
                          onChange={e => setRowRange(r => ({ ...r, start: parseInt(e.target.value, 10) || 1 }))}
                          className="w-full"
                          aria-label="Fila inicial"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          id="end-row"
                          type="number"
                          min={rowRange.start}
                          max={data.length}
                          value={rowRange.end}
                          onChange={e => setRowRange(r => ({ ...r, end: parseInt(e.target.value, 10) || data.length }))}
                          className="w-full"
                          aria-label="Fila final"
                        />
                      </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-2 flex-1 flex flex-col min-h-0">
                       <Label className="font-semibold">Columnas</Label>
                       <div className="space-y-2 overflow-y-auto pr-2 flex-1">
                        {headers.map((header, index) => (
                           <div key={index} className="flex items-center gap-2">
                             <Checkbox
                               id={`col-select-${index}`}
                               checked={selectedColumns.includes(header)}
                               onCheckedChange={() => handleColumnToggle(header)}
                             />
                             <label htmlFor={`col-select-${index}`} className="text-sm cursor-pointer select-none">{header}</label>
                           </div>
                        ))}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Previsualización y Selección Manual</h3>
                     <p className="text-sm text-muted-foreground">
                      Los datos seleccionados se resaltarán. Haz clic en una celda para seleccionarla o deseleccionarla individualmente.
                    </p>
                  </div>
                  <div className="relative overflow-auto border rounded-lg max-h-96">
                      <Table>
                          <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                              <TableRow>
                                  {headers.map((header, index) => (
                                      <TableHead key={index}>{header}</TableHead>
                                  ))}
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {data.map((row, rowIndex) => (
                                  <TableRow key={rowIndex} className="border-b">
                                      {row.map((cell, cellIndex) => (
                                          <TableCell 
                                              key={cellIndex}
                                              onClick={() => handleCellClick(rowIndex, cellIndex)}
                                              className={cn(
                                                  'transition-colors cursor-pointer',
                                                  { 'bg-accent text-accent-foreground': isCellSelected(rowIndex, cellIndex) }
                                              )}
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
              </div>


              <Button onClick={handleUploadClick} disabled={!file} className="w-full mt-4">
                Cargar datos seleccionados
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
