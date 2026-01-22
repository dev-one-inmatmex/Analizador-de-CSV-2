'use client';

import { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Database, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Helper function from analyzer
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

type ExtractedRow = Record<string, string>;

export default function CsvClassifier() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<string[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Step 2 State
  const [empresa, setEmpresa] = useState('');
  const [imprimio, setImprimio] = useState('');
  
  // Step 3 State
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);

  // Step 4 State
  const [extractedData, setExtractedData] = useState<ExtractedRow[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
      // Handle both LF and CRLF line endings
      const rows = text.split(/\r\n|\n/).map(row => row.split(','));
      setData(rows);
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
    setExtractedData(null);
    setMapping(initialMapping);
    setEmpresa('');
    setImprimio('');
    if (inputRef.current) inputRef.current.value = '';
  };
  
  const handleMappingChange = (field: string, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const handleExtractData = () => {
    setIsProcessing(true);
    setExtractedData(null);

    try {
        const requiredFields = Object.entries(mapping).filter(([, value]) => value !== '');
        if (requiredFields.length === 0) {
            toast({
                title: 'Mapeo Incompleto',
                description: 'Por favor, especifica la celda de inicio para al menos un campo.',
                variant: 'destructive',
            });
            setIsProcessing(false);
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

        if (parsedMappings.length === 0) {
            toast({
                title: 'Formato de Celda Inválido',
                description: 'Usa un formato como A7, B12, etc.',
                variant: 'destructive',
            });
            setIsProcessing(false);
            return;
        }

        const startRow = Math.min(...parsedMappings.map(m => m.row));
        const results: ExtractedRow[] = [];

        for (let i = startRow; i < data.length; i++) {
            const row = data[i];
            if (!row || row.every(cell => cell.trim() === '')) continue; // Skip empty rows

            const newRow: ExtractedRow = {};
            let hasData = false;
            for (const { field, col } of parsedMappings) {
                const cellValue = row[col] || '';
                newRow[field] = cellValue.trim();
                if (cellValue.trim() !== '') {
                    hasData = true;
                }
            }
            if (hasData) {
                results.push(newRow);
            }
        }
        
        setExtractedData(results);
        toast({
            title: 'Extracción Completa',
            description: `Se procesaron ${results.length} filas de datos.`,
        });

    } catch (error) {
        console.error("Extraction error:", error);
        toast({
            title: 'Error de Extracción',
            description: 'No se pudo procesar el archivo. Revisa el formato y el mapeo.',
            variant: 'destructive',
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveToDb = () => {
    setIsSaving(true);
    toast({
        title: 'Guardando Datos...',
        description: 'Esta función no está implementada en esta demo.',
    });
    setTimeout(() => setIsSaving(false), 1500);
  };

  const mappingFields = Object.keys(initialMapping);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Step 1 */}
      <Card>
        <CardHeader>
          <CardTitle>1. Cargar Archivo CSV</CardTitle>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-10 h-10 mb-4 text-primary" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Haz clic para subir</span> o arrastra
                </p>
                <p className="text-xs text-muted-foreground">Solo archivos CSV</p>
              </div>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="w-6 h-6 text-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleRemoveFile}><X className="w-4 h-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 & 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>2. Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select value={empresa} onValueChange={setEmpresa}>
                  <SelectTrigger id="empresa"><SelectValue placeholder="Selecciona una empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtm">MTM</SelectItem>
                    <SelectItem value="tal">TAL</SelectItem>
                    <SelectItem value="omeska">OMESKA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imprimio">Imprimió</Label>
                <Input id="imprimio" placeholder="Nombre de la persona" value={imprimio} onChange={e => setImprimio(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>3. Mapeo de Celdas (Columnas)</CardTitle>
              <CardDescription>
                Especifica la celda de inicio para cada campo (ej. A7, B7). La extracción continuará hacia abajo desde esa celda.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
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
        </div>
      </div>
      
      {/* Step 4 */}
      <Card>
        <CardHeader>
          <CardTitle>4. Resultados de la Clasificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleExtractData} disabled={!file || isProcessing} className="w-full sm:w-auto">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Extrayendo...' : 'Extraer Datos'}
                </Button>
                 <Button onClick={handleSaveToDb} disabled={!extractedData || isSaving} variant="secondary" className="w-full sm:w-auto">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4" />}
                    {isSaving ? 'Guardando...' : 'Guardar en Base de Datos'}
                </Button>
            </div>

            {extractedData && (
                 <div className="relative mt-4 border rounded-lg">
                    <div className="w-full overflow-auto max-h-[24rem]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                                <TableRow>
                                    {Object.keys(extractedData[0] || {}).map(header => <TableHead key={header} className="capitalize">{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {extractedData.length > 0 ? extractedData.map((row, index) => (
                                    <TableRow key={index}>
                                        {Object.keys(row).map(key => <TableCell key={key}>{row[key]}</TableCell>)}
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={Object.keys(mapping).length}>No se extrajeron datos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
