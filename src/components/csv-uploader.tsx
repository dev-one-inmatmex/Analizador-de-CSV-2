'use client';

import { useState, useRef, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type SelectedCell = {
    rowIndex: number;
    colIndex: number;
};

// Helper function to convert column index to letter
const columnToLetter = (colIndex: number): string => {
    let letter = '';
    let temp = colIndex;
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
};

// Helper function to convert column letter to index
const letterToColumn = (letter: string): number => {
    let column = 0;
    const length = letter.length;
    for (let i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column - 1;
};

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [rowRange, setRowRange] = useState({ start: 1, end: 0 });
  const [colRange, setColRange] = useState({ start: 'A', end: 'A' });
  const [specificCellsInput, setSpecificCellsInput] = useState('');

  const parsedSpecificCells = useMemo(() => {
    const cells: SelectedCell[] = [];
    if (!specificCellsInput) return cells;

    const parts = specificCellsInput.split(',').map(p => p.trim().toUpperCase());
    
    parts.forEach(part => {
        const match = part.match(/^([A-Z]+)(\d+)$/);
        if (match) {
            const colLetter = match[1];
            const rowNumber = parseInt(match[2], 10);
            const colIndex = letterToColumn(colLetter);
            const rowIndex = rowNumber - 1;

            if (colIndex >= 0 && rowIndex >= 0) {
                cells.push({ rowIndex, colIndex });
            }
        }
    });

    return cells;
  }, [specificCellsInput]);

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
      
      const maxLength = Math.max(headerRow.length, ...dataRows.map(r => r.length));
      const paddedHeaders = [...headerRow];
      while(paddedHeaders.length < maxLength) paddedHeaders.push('');
      
      const paddedData = dataRows.map(row => {
          const newRow = [...row];
          while(newRow.length < maxLength) newRow.push('');
          return newRow;
      });

      setHeaders(paddedHeaders);
      setData(paddedData);
      setRowRange({ start: 1, end: paddedData.length });
      setColRange({ start: 'A', end: columnToLetter(paddedHeaders.length - 1) });
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
    setSpecificCellsInput('');
    setRowRange({ start: 1, end: 0 });
    setColRange({ start: 'A', end: 'A' });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (file) {
      const combinedSelection = new Set<string>();

      // 1. Add cells from row and column ranges
      const startRow = Math.max(0, rowRange.start - 1);
      const endRow = Math.min(data.length - 1, rowRange.end - 1);
      const startCol = Math.max(0, letterToColumn(colRange.start.toUpperCase()));
      const endCol = Math.min(headers.length - 1, letterToColumn(colRange.end.toUpperCase()));

      if (rowRange.end > 0 && colRange.end) {
        for (let i = startRow; i <= endRow; i++) {
          for (let j = startCol; j <= endCol; j++) {
            combinedSelection.add(`${i},${j}`);
          }
        }
      }

      // 2. Add individually clicked cells
      selectedCells.forEach(cell => {
          combinedSelection.add(`${cell.rowIndex},${cell.colIndex}`);
      });
      
      // 3. Add specifically typed cells
      parsedSpecificCells.forEach(cell => {
        combinedSelection.add(`${cell.rowIndex},${cell.colIndex}`);
      });
      
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
    // 1. Check manual click selection
    if (selectedCells.some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex)) {
      return true;
    }
    
    // 2. Check specific cell input
    if(parsedSpecificCells.some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex)) {
      return true;
    }

    // 3. Check range selection
    const isInRowRange = rowIndex >= rowRange.start - 1 && rowIndex < rowRange.end;
    const startCol = letterToColumn(colRange.start.toUpperCase());
    const endCol = letterToColumn(colRange.end.toUpperCase());
    const isInColRange = colIndex >= startCol && colIndex <= endCol;

    return isInRowRange && isInColRange;
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
                      Define rangos, celdas específicas o haz clic en la tabla para seleccionar datos.
                    </p>
                  </div>
                  
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="start-row" className="font-semibold">Rango de Filas</Label>
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

                    <div className="space-y-2">
                      <Label htmlFor="start-col" className="font-semibold">Rango de Columnas</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="start-col"
                          type="text"
                          value={colRange.start}
                          onChange={e => setColRange(c => ({...c, start: e.target.value.toUpperCase()}))}
                          className="w-full"
                          aria-label="Columna inicial"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          id="end-col"
                          type="text"
                          value={colRange.end}
                          onChange={e => setColRange(c => ({...c, end: e.target.value.toUpperCase()}))}
                          className="w-full"
                          aria-label="Columna final"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label htmlFor="specific-cells" className="font-semibold">Celdas Específicas</Label>
                        <Input
                            id="specific-cells"
                            type="text"
                            placeholder="Ej: A1, B5, C10"
                            value={specificCellsInput}
                            onChange={e => setSpecificCellsInput(e.target.value)}
                            className="w-full"
                            aria-label="Celdas específicas separadas por coma"
                        />
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
                                      <TableHead key={index}>{columnToLetter(index)}</TableHead>
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
                                                  'transition-colors cursor-pointer border',
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
