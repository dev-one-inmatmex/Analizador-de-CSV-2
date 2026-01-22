'use client';

import { useState, useRef, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Wand2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { processCsvData } from '@/ai/flows/process-csv-flow';
import { saveToDatabase } from '@/ai/flows/save-to-database-flow';
import type { ProcessCsvDataOutput } from '@/ai/schemas/csv-schemas';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';


type SelectedCell = {
    rowIndex: number;
    colIndex: number;
};

type SpecificCellItem = 
    | { type: 'cell', rowIndex: number, colIndex: number }
    | { type: 'range', startRow: number, startCol: number, endRow: number, endCol: number };

type SelectionMode = 'range' | 'specific' | 'manual' | 'mapping';

const columnToLetter = (colIndex: number): string => {
    let letter = '';
    let temp = colIndex;
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
};

const letterToColumn = (letter: string): number => {
    if (!letter) return -1;
    let column = 0;
    const length = letter.length;
    for (let i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column - 1;
};

const initialMapping = {
    '# de venta': '',
    'fecha de venta': '',
    'sku': '',
    '# de publicacion': '',
    'Tienda oficial': '',
    'Titulo de la publicacion': '',
    'Variante': '',
    'Comprador': '',
    'Municipio': '',
    'Estado': '',
};

const availableTables = [
    { value: 'skus', label: 'Catálogo de SKUs' },
    { value: 'productos_madre', label: 'Catálogo de Productos Madre' },
];

export default function CsvUploader() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [rowRange, setRowRange] = useState({ start: 1, end: 0 });
  const [colRange, setColRange] = useState({ start: 'A', end: 'A' });
  const [specificCellsInput, setSpecificCellsInput] = useState('');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('range');

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProcessCsvDataOutput | null>(null);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [targetTable, setTargetTable] = useState('');

  const parsedSpecificItems = useMemo((): SpecificCellItem[] => {
    const items: SpecificCellItem[] = [];
    if (!specificCellsInput) return items;

    const parts = specificCellsInput.split(',').map(p => p.trim().toUpperCase());
    
    parts.forEach(part => {
        if (!part) return;

        const rangeMatch = part.match(/^([A-Z]+)(\d+)-([A-Z]+)(\d+)$/);
        if (rangeMatch) {
            const startColLetter = rangeMatch[1];
            const startRowNumber = parseInt(rangeMatch[2], 10);
            const endColLetter = rangeMatch[3];
            const endRowNumber = parseInt(rangeMatch[4], 10);

            const startCol = letterToColumn(startColLetter);
            const endCol = letterToColumn(endColLetter);
            const startRow = startRowNumber - 1;
            const endRow = endRowNumber - 1;

            if (startCol >= 0 && startRow >= 0 && endCol >= 0 && endRow >= 0) {
                 items.push({ 
                    type: 'range',
                    startRow: Math.min(startRow, endRow), 
                    startCol: Math.min(startCol, endCol), 
                    endRow: Math.max(startRow, endRow),
                    endCol: Math.max(startCol, endCol)
                });
            }
            return;
        }

        const singleCellMatch = part.match(/^([A-Z]+)(\d+)$/);
        if (singleCellMatch) {
            const colLetter = singleCellMatch[1];
            const rowNumber = parseInt(singleCellMatch[2], 10);
            const colIndex = letterToColumn(colLetter);
            const rowIndex = rowNumber - 1;

            if (colIndex >= 0 && rowIndex >= 0) {
                items.push({ type: 'cell', rowIndex, colIndex });
            }
            return;
        }
    });

    return items;
  }, [specificCellsInput]);

  const manualSelectedSet = useMemo(() => 
    new Set(selectedCells.map(cell => `${cell.rowIndex},${cell.colIndex}`))
  , [selectedCells]);

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
      setColRange({ start: 'A', end: columnToLetter(paddedHeaders.length > 0 ? paddedHeaders.length - 1 : 0) });
    };
    reader.readAsText(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      setFile(droppedFile);
      parseCsv(droppedFile);
      if (inputRef.current) inputRef.current.value = '';
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
    setSelectionMode('range');
    setAnalysisResult(null);
    setMapping(initialMapping);
    if (inputRef.current) inputRef.current.value = '';
  };
  
  const handleMappingChange = (field: string, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const handleAnalyzeClick = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    if (selectionMode === 'mapping') {
        try {
            const requiredFields = Object.entries(mapping).filter(([, value]) => value !== '');
            if (requiredFields.length === 0) {
                toast({
                    title: 'Mapeo Incompleto',
                    description: 'Por favor, especifica la celda de inicio para al menos un campo.',
                    variant: 'destructive',
                });
                setIsAnalyzing(false);
                return;
            }

            const parsedMappings = requiredFields.map(([field, cell]) => {
                const match = cell.match(/^([A-Z]+)(\d+)$/);
                if (!match) return null;
                return {
                    field,
                    col: letterToColumn(match[1]),
                    row: parseInt(match[2], 10) - 1,
                };
            }).filter((m): m is { field: string; col: number; row: number } => m !== null);

            if (parsedMappings.length !== requiredFields.length) {
                toast({
                    title: 'Formato de Celda Inválido',
                    description: 'Usa un formato como A7, B12, etc. para todos los campos mapeados.',
                    variant: 'destructive',
                });
                setIsAnalyzing(false);
                return;
            }

            const startRow = Math.min(...parsedMappings.map(m => m.row));
            const extractedRows: Record<string, string>[] = [];

            for (let i = startRow; i < data.length; i++) {
                const row = data[i];
                if (!row || row.every(cell => cell.trim() === '')) continue; 

                const newRow: Record<string, string> = {};
                let hasData = false;
                for (const { field, col } of parsedMappings) {
                    const cellValue = row[col] || '';
                    newRow[field] = cellValue.trim();
                    if (cellValue.trim() !== '') {
                        hasData = true;
                    }
                }
                if (hasData) {
                    extractedRows.push(newRow);
                }
            }
            
            if (extractedRows.length === 0) {
                 toast({ title: 'No se extrajeron datos', description: 'Revisa la configuración del mapeo y el rango de filas.' });
                 setIsAnalyzing(false);
                 return;
            }

            const tableHeaders = Object.keys(extractedRows[0]);
            const tableRows = extractedRows.map(rowObject => tableHeaders.map(header => rowObject[header] || ''));

            setAnalysisResult({
                analysis: `Se extrajeron ${extractedRows.length} filas de datos usando el mapeo de columnas.`,
                table: { headers: tableHeaders, rows: tableRows },
            });
            setIsAnalysisDialogOpen(true);

        } catch (error) {
            console.error("Extraction error:", error);
            toast({
                title: 'Error de Extracción',
                description: 'No se pudo procesar el archivo. Revisa el formato y el mapeo.',
                variant: 'destructive',
            });
        } finally {
            setIsAnalyzing(false);
        }
        return;
    }

    const combinedSelection = new Set<string>();

    if (selectionMode === 'range') {
        const startRow = Math.max(0, rowRange.start - 1);
        const endRow = Math.min(data.length - 1, rowRange.end - 1);
        const startCol = Math.max(0, letterToColumn(colRange.start.toUpperCase()));
        const endCol = Math.min(headers.length - 1, letterToColumn(colRange.end.toUpperCase()));

        if (rowRange.end > 0 && colRange.end && startCol <= endCol && startRow <= endRow) {
            for (let i = startRow; i <= endRow; i++) {
                for (let j = startCol; j <= endCol; j++) {
                    combinedSelection.add(`${i},${j}`);
                }
            }
        }
    } else if (selectionMode === 'specific') {
        parsedSpecificItems.forEach(item => {
            if (item.type === 'cell') {
                if (item.rowIndex < data.length && item.colIndex < headers.length) {
                    combinedSelection.add(`${item.rowIndex},${item.colIndex}`);
                }
            } else if (item.type === 'range') {
                for (let r = item.startRow; r <= item.endRow; r++) {
                    for (let c = item.startCol; c <= item.endCol; c++) {
                         if (r < data.length && c < headers.length) {
                            combinedSelection.add(`${r},${c}`);
                         }
                    }
                }
            }
        });
    } else if (selectionMode === 'manual') {
        manualSelectedSet.forEach(coord => {
            combinedSelection.add(coord);
        });
    }

    const selectedData = Array.from(combinedSelection).map(coord => {
      const [rowIndex, colIndex] = coord.split(',').map(Number);
      if (data[rowIndex] && data[rowIndex][colIndex] !== undefined) {
          return {
              header: headers[colIndex] || `Column ${columnToLetter(colIndex)}`,
              value: data[rowIndex][colIndex],
              row: rowIndex + 1,
              column: columnToLetter(colIndex),
          };
      }
      return null;
    }).filter((item): item is { header: string; value: string; row: number; column: string; } => item !== null);

    if (selectedData.length === 0) {
        toast({
            title: 'No se seleccionaron celdas',
            description: 'Por favor, elige los datos que quieres analizar.',
            variant: 'destructive'
        });
        setIsAnalyzing(false);
        return;
    }

    try {
        const analysis = await processCsvData({ cells: selectedData });
        setAnalysisResult(analysis);
        setIsAnalysisDialogOpen(true);
    } catch (error) {
        console.error('Error processing CSV data:', error);
        setAnalysisResult({ analysis: 'Ocurrió un error al procesar los datos. Por favor, inténtalo de nuevo.', table: { headers: [], rows: [] } });
        setIsAnalysisDialogOpen(true);
        toast({
            title: 'Error en el Análisis',
            description: 'Ocurrió un error al procesar los datos con la IA. Revisa la consola para más detalles.',
            variant: 'destructive'
        });
    } finally {
        setIsAnalyzing(false);
    }
  };
  
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (selectionMode !== 'manual') return;
    
    setSelectedCells(prev => {
      const index = prev.findIndex(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex);
      if (index > -1) {
        return prev.filter((_, i) => i !== index);
      } else {
        return [...prev, { rowIndex, colIndex }];
      }
    });
  };
  
  const handleDownloadCsv = () => {
    if (!analysisResult?.table) {
        toast({ title: 'No hay datos para descargar', variant: 'destructive' });
        return;
    }

    const { headers, rows } = analysisResult.table;

    const escapeCell = (cell: string): string => {
        const strCell = String(cell ?? '');
        if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
            const escaped = strCell.replace(/"/g, '""');
            return `"${escaped}"`;
        }
        return strCell;
    };

    try {
        const headerRow = headers.map(escapeCell).join(',');
        const csvRows = rows.map(row => row.map(escapeCell).join(','));
        const csvContent = [headerRow, ...csvRows].join('\n');
        
        // Add BOM for Excel compatibility
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'datos_analizados.csv');
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to download CSV:", error);
        toast({
            title: "Error de Descarga",
            description: "No se pudo generar el archivo CSV.",
            variant: "destructive"
        });
    }
  };

  const isCellSelected = (rowIndex: number, colIndex: number): boolean => {
    if (selectionMode === 'mapping') return false;

    switch (selectionMode) {
      case 'range':
        const startRow = rowRange.start - 1;
        const endRow = rowRange.end - 1;
        if (rowIndex < startRow || rowIndex > endRow) return false;
        
        const startCol = letterToColumn(colRange.start.toUpperCase());
        const endCol = letterToColumn(colRange.end.toUpperCase());
        return colIndex >= startCol && colIndex <= endCol;
      
      case 'specific':
        return parsedSpecificItems.some(item => {
            if (item.type === 'cell') {
                return item.rowIndex === rowIndex && item.colIndex === colIndex;
            }
            return rowIndex >= item.startRow && rowIndex <= item.endRow &&
                   colIndex >= item.startCol && colIndex <= item.endCol;
        });

      case 'manual':
        return manualSelectedSet.has(`${rowIndex},${colIndex}`);
      
      default:
        return false;
    }
  }

  const handleSaveToDb = async () => {
    if (!analysisResult || !targetTable) {
        toast({
            title: 'Faltan datos para guardar',
            description: 'Asegúrate de haber analizado los datos y seleccionado una tabla de destino.',
            variant: 'destructive',
        });
        return;
    }

    setIsSaving(true);
    try {
        const result = await saveToDatabase({
            targetTable: targetTable,
            data: analysisResult.table,
        });

        if (result.success) {
            toast({
                title: 'Éxito',
                description: result.message,
            });
        } else {
            toast({
                title: 'Error al Guardar',
                description: result.message,
                variant: 'destructive',
            });
        }
    } catch (error) {
        console.error('Error saving to database:', error);
        toast({
            title: 'Error Inesperado',
            description: 'Ocurrió un error al intentar guardar en la base de datos.',
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const mappingFields = Object.keys(initialMapping);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Cargar Documento CSV</CardTitle>
          <CardDescription>
            Arrastra y suelta tu archivo aquí o haz clic para seleccionarlo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary hover:border-primary transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta
                </p>
                <p className="text-xs text-muted-foreground">Solo archivos CSV (tamaño máximo: 5MB)</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="w-6 h-6 text-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                <X className="w-4 h-4" />
                <span className="sr-only">Eliminar archivo</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {file && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Paso 2: Selecciona tus datos</CardTitle>
              <CardDescription>
                Elige un modo y define el rango o las celdas específicas que quieres que la IA analice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                  <Label className="text-base font-semibold">Modo de Selección</Label>
                  <RadioGroup value={selectionMode} onValueChange={(value) => setSelectionMode(value as SelectionMode)} className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Label htmlFor="r-range" className={cn("flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer", selectionMode === 'range' ? 'border-primary' : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground')}>
                          <RadioGroupItem value="range" id="r-range" className="sr-only" />
                          Por Rango
                      </Label>
                      <Label htmlFor="r-specific" className={cn("flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer", selectionMode === 'specific' ? 'border-primary' : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground')}>
                          <RadioGroupItem value="specific" id="r-specific" className="sr-only" />
                          Celdas Específicas
                      </Label>
                       <Label htmlFor="r-manual" className={cn("flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer", selectionMode === 'manual' ? 'border-primary' : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground')}>
                          <RadioGroupItem value="manual" id="r-manual" className="sr-only" />
                          Manual (Clic)
                      </Label>
                      <Label htmlFor="r-mapping" className={cn("flex flex-col items-center justify-between rounded-md border-2 p-4 cursor-pointer", selectionMode === 'mapping' ? 'border-primary' : 'border-muted bg-popover hover:bg-accent hover:text-accent-foreground')}>
                          <RadioGroupItem value="mapping" id="r-mapping" className="sr-only" />
                          Por Mapeo
                      </Label>
                  </RadioGroup>
              </div>

              {selectionMode === 'mapping' ? (
                <Card className="bg-muted/30">
                  <CardHeader>
                      <CardTitle className="text-lg">Mapeo de Celdas (Columnas)</CardTitle>
                      <CardDescription>
                        Especifica la celda de inicio para cada campo (ej. A7, B7). La extracción continuará hacia abajo desde esa celda.
                      </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                    {mappingFields.map(field => (
                      <div key={field} className="space-y-1.5">
                        <Label htmlFor={field} className="text-sm capitalize">{field.replace(/_/g, ' ')}</Label>
                        <Input 
                          id={field} 
                          placeholder="EJ: A7" 
                          value={mapping[field]}
                          onChange={e => handleMappingChange(field, e.target.value)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <fieldset className="space-y-2" disabled={selectionMode !== 'range'}>
                          <Label htmlFor="start-row" className="font-semibold">Rango de Filas</Label>
                          <div className="flex items-center gap-2">
                              <Input id="start-row" type="number" min="1" max={data.length} value={rowRange.start} onChange={e => setRowRange(r => ({ ...r, start: parseInt(e.target.value, 10) || 1 }))} aria-label="Fila inicial" />
                              <span className="text-muted-foreground">-</span>
                              <Input id="end-row" type="number" min={rowRange.start} max={data.length} value={rowRange.end} onChange={e => setRowRange(r => ({ ...r, end: parseInt(e.target.value, 10) || data.length }))} aria-label="Fila final" />
                          </div>
                      </fieldset>
                      
                      <fieldset className="space-y-2" disabled={selectionMode !== 'range'}>
                          <Label htmlFor="start-col" className="font-semibold">Rango de Columnas</Label>
                          <div className="flex items-center gap-2">
                              <Input id="start-col" type="text" value={colRange.start} onChange={e => setColRange(c => ({...c, start: e.target.value.toUpperCase()}))} aria-label="Columna inicial" />
                              <span className="text-muted-foreground">-</span>
                              <Input id="end-col" type="text" value={colRange.end} onChange={e => setColRange(c => ({...c, end: e.target.value.toUpperCase()}))} aria-label="Columna final" />
                          </div>
                      </fieldset>

                      <fieldset className="space-y-2 md:col-span-2" disabled={selectionMode !== 'specific'}>
                          <Label htmlFor="specific-cells" className="font-semibold">Celdas Específicas</Label>
                          <Input id="specific-cells" type="text" placeholder="Ej: A1, B5, C10-C20" value={specificCellsInput} onChange={e => setSpecificCellsInput(e.target.value)} aria-label="Celdas específicas separadas por coma" />
                      </fieldset>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Previsualiza tu selección</CardTitle>
                      <CardDescription>
                        {selectionMode === 'manual' 
                          ? 'Los datos que elegiste aparecerán resaltados. Puedes hacer clic en celdas individuales para ajustar tu selección.' 
                          : 'Los datos que elegiste con los controles de arriba aparecerán resaltados en la tabla.'
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative mt-2 border rounded-lg">
                        <div className="w-full overflow-auto max-h-[24rem]">
                          <Table>
                              <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                                  <TableRow>
                                      <TableHead className="w-16">#</TableHead>
                                      {headers.map((header, index) => (
                                          <TableHead key={index} className="whitespace-nowrap">{columnToLetter(index)} ({header || 'Vacío'})</TableHead>
                                      ))}
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {data.map((row, rowIndex) => (
                                      <TableRow key={rowIndex}>
                                          <TableHead className="font-mono">{rowIndex + 1}</TableHead>
                                          {row.map((cell, cellIndex) => (
                                              <TableCell 
                                                  key={cellIndex}
                                                  onClick={() => handleCellClick(rowIndex, cellIndex)}
                                                  className={cn(
                                                      'transition-colors border',
                                                      selectionMode === 'manual' ? 'cursor-pointer' : 'cursor-default',
                                                      { 'bg-accent/50 text-accent-foreground': isCellSelected(rowIndex, cellIndex) }
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
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="items-center text-center">
              <CardTitle>Paso 3: Analiza los datos</CardTitle>
              <CardDescription>¡Ahora deja que el sistema procese tu selección!</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button onClick={handleAnalyzeClick} disabled={!file || isAnalyzing} size="lg" className="w-full max-w-md text-lg py-7">
                    {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    {isAnalyzing ? 'Procesando...' : 'Procesar Datos Seleccionados'}
                </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Resultado del Análisis</DialogTitle>
                <DialogDescription>
                    La IA ha procesado los datos seleccionados. Aquí tienes el análisis y la tabla formateada.
                </DialogDescription>
            </DialogHeader>
            
            {analysisResult && (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Análisis General</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap bg-secondary/50 p-3 rounded-md border">{analysisResult.analysis}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Tabla de Datos Formateada</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mt-2 border rounded-lg">
                                <div className="w-full overflow-auto max-h-[24rem]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {analysisResult.table.headers.map((header, index) => (
                                                <TableHead key={index}>{header}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {analysisResult.table.rows.map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                {row.map((cell, cellIndex) => (
                                                    <TableCell key={cellIndex}>{cell}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Guardar en Base de Datos</CardTitle>
                            <CardDescription>
                                Selecciona la tabla de destino y guarda los datos procesados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4 text-center">
                            <div className="w-full max-w-sm space-y-2">
                                <Label htmlFor="target-table-modal">Seleccionar Tabla de Destino</Label>
                                <Select value={targetTable} onValueChange={setTargetTable}>
                                    <SelectTrigger id="target-table-modal">
                                        <SelectValue placeholder="Elige una tabla..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTables.map(table => (
                                            <SelectItem key={table.value} value={table.value}>
                                                {table.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleSaveToDb} disabled={isSaving || !targetTable} size="lg" className="w-full md:w-1/2">
                              {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                              {isSaving ? 'Guardando...' : 'Guardar en Base de Datos'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            <DialogFooter className="sm:justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={handleDownloadCsv} disabled={!analysisResult}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar CSV
                </Button>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cerrar</Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
