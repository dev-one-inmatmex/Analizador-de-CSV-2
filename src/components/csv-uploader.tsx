'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Wand2, Download, RefreshCw, Bell, GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { saveToDatabase } from '@/ai/flows/save-to-database-flow';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Types
type CsvRow = Record<string, string>;
type DbRow = Record<string, any>;
type ComparisonResult = {
  newRows: { index: number; data: CsvRow }[];
  updatedRows: { index: number; csv: CsvRow; db: DbRow; changes: Record<string, { from: any; to: any }> }[];
  unchangedRows: { index: number; data: CsvRow }[];
};
type Notification = {
  id: number;
  message: string;
  timestamp: string;
  user: string;
};
type TableConfig = {
  dbTable: string;
  pk: string;
};

// Mappings from filename keyword to table configuration
const TABLE_MAPPINGS: Record<string, TableConfig> = {
  'ventas': { dbTable: 'ventas', pk: 'numero_venta' },
  'publicaciones': { dbTable: 'publicaciones', pk: 'item_id' },
  'skus': { dbTable: 'skus', pk: 'sku' },
};

export default function CsvUploader() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  
  const [detectedTable, setDetectedTable] = useState<TableConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(new Set());

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const resetState = () => {
    setFile(null);
    setHeaders([]);
    setCsvData([]);
    setDetectedTable(null);
    setComparison(null);
    setSelectedNew(new Set());
    setSelectedUpdates(new Set());
    if (inputRef.current) inputRef.current.value = '';
  };
  
  const addNotification = (message: string) => {
    const newNotification: Notification = {
      id: Date.now(),
      message,
      timestamp: new Date().toLocaleTimeString('es-MX'),
      user: 'Usuario Actual', // Placeholder for authenticated user
    };
    setNotifications(prev => [newNotification, ...prev]);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    resetState();
    setFile(file);

    // 1. Detect table from filename
    const fileName = file.name.toLowerCase();
    const detectedKey = Object.keys(TABLE_MAPPINGS).find(key => fileName.includes(key));
    const tableConfig = detectedKey ? TABLE_MAPPINGS[detectedKey] : null;
    
    if (tableConfig) {
      setDetectedTable(tableConfig);
      toast({ title: 'Tabla Detectada', description: `Archivo parece corresponder a la tabla: ${tableConfig.dbTable}` });
    } else {
      toast({ title: 'Tabla no Detectada', description: 'No se pudo identificar una tabla de destino por el nombre del archivo.', variant: 'destructive' });
    }

    // 2. Parse CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.trim().split(','));
      const headerRow = rows[0].map(h => h.trim());
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));

      setHeaders(headerRow);
      const parsedData = dataRows.map(row => {
        const rowObject: CsvRow = {};
        headerRow.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });
        return rowObject;
      });
      setCsvData(parsedData);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (csvData.length > 0 && detectedTable) {
      handleCompareData();
    }
  }, [csvData, detectedTable]);

  const handleCompareData = async () => {
    if (!detectedTable || csvData.length === 0 || !supabase) {
        if (!supabase) {
          toast({ title: 'Configuración de DB Incompleta', description: 'No se pueden comparar los datos.', variant: 'destructive' });
        }
        return;
    }

    setIsLoading(true);
    setComparison(null);
    try {
      const pk = detectedTable.pk;
      const csvPks = csvData.map(row => row[pk]).filter(Boolean);

      const { data: dbData, error } = await supabase
        .from(detectedTable.dbTable)
        .select('*')
        .in(pk, csvPks);

      if (error) throw error;

      const dbMap = new Map(dbData.map(row => [String(row[pk]), row]));
      
      const newRows: ComparisonResult['newRows'] = [];
      const updatedRows: ComparisonResult['updatedRows'] = [];
      const unchangedRows: ComparisonResult['unchangedRows'] = [];

      csvData.forEach((csvRow, index) => {
        const pkValue = String(csvRow[pk]);
        const dbRow = dbMap.get(pkValue);

        if (!dbRow) {
          newRows.push({ index, data: csvRow });
        } else {
          const changes: ComparisonResult['updatedRows'][0]['changes'] = {};
          for (const key in csvRow) {
            if (key in dbRow && String(csvRow[key]).trim() !== String(dbRow[key]).trim()) {
              if (csvRow[key] || dbRow[key]) { // Only track meaningful changes
                changes[key] = { from: dbRow[key], to: csvRow[key] };
              }
            }
          }
          if (Object.keys(changes).length > 0) {
            updatedRows.push({ index, csv: csvRow, db: dbRow, changes });
          } else {
            unchangedRows.push({ index, data: csvRow });
          }
        }
      });
      
      setComparison({ newRows, updatedRows, unchangedRows });

    } catch (err: any) {
      toast({ title: 'Error de Comparación', description: `No se pudo conectar a la base de datos: ${err.message}`, variant: 'destructive' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSync = async () => {
    if (!detectedTable || (!selectedNew.size && !selectedUpdates.size)) {
        toast({ title: 'Nada que Sincronizar', description: 'Por favor, selecciona registros para añadir o actualizar.', variant: 'destructive'});
        return;
    }

    setIsSyncing(true);
    const dataToSync: CsvRow[] = [];
    
    selectedNew.forEach(index => dataToSync.push(csvData[index]));
    selectedUpdates.forEach(index => dataToSync.push(csvData[index]));
    
    try {
        const result = await saveToDatabase({
            targetTable: detectedTable.dbTable,
            data: {
                headers: headers,
                rows: dataToSync.map(row => headers.map(h => row[h]))
            },
            conflictKey: detectedTable.pk,
        });

        if (result.success) {
            toast({ title: 'Sincronización Exitosa', description: result.message });
            addNotification(`${dataToSync.length} registros sincronizados con la tabla '${detectedTable.dbTable}'.`);
            // Reset selections and re-compare data
            setSelectedNew(new Set());
            setSelectedUpdates(new Set());
            handleCompareData();
        } else {
            throw new Error(result.message);
        }
    } catch(err: any) {
        toast({ title: 'Error de Sincronización', description: err.message, variant: 'destructive' });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFile(event.dataTransfer.files[0]);
    }
  };

  const toggleSelection = (index: number, type: 'new' | 'update') => {
    if (type === 'new') {
        setSelectedNew(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    } else {
        setSelectedUpdates(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Cargar Documento CSV</CardTitle>
          <CardDescription>Arrastra y suelta un archivo CSV. El sistema intentará detectar la tabla de destino.</CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary hover:border-primary transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange}/>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="w-6 h-6 text-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                {detectedTable && <Badge variant="secondary">{detectedTable.dbTable}</Badge>}
              </div>
              <Button variant="ghost" size="icon" onClick={resetState}><X className="w-4 h-4" /><span className="sr-only">Eliminar</span></Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(isLoading || comparison) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Paso 2: Comparar y Seleccionar Datos</CardTitle>
                    <CardDescription>Revisa los datos del CSV y compáralos con la base de datos. Selecciona lo que quieres sincronizar.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCompareData} disabled={isLoading}>
                    <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Comparando con la base de datos...</p>
                </div>
            ) : comparison && detectedTable ? (
                <Tabs defaultValue="new">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="new">Nuevos ({comparison.newRows.length})</TabsTrigger>
                        <TabsTrigger value="updated">Actualizaciones ({comparison.updatedRows.length})</TabsTrigger>
                        <TabsTrigger value="unchanged">Sin Cambios ({comparison.unchangedRows.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="new" className="mt-4">
                        <DataTable 
                            rows={comparison.newRows.map(r => r.data)}
                            headers={headers}
                            pk={detectedTable.pk}
                            selection={selectedNew}
                            onSelectRow={(pkValue) => {
                                const row = comparison.newRows.find(r => String(r.data[detectedTable.pk]) === pkValue);
                                if (row) toggleSelection(row.index, 'new');
                            }}
                        />
                    </TabsContent>
                    <TabsContent value="updated" className="mt-4">
                        <UpdateTable rows={comparison.updatedRows} pk={detectedTable.pk} selection={selectedUpdates} onSelectRow={(index) => toggleSelection(index, 'update')} />
                    </TabsContent>
                    <TabsContent value="unchanged" className="mt-4">
                        <DataTable rows={comparison.unchangedRows.map(r => r.data)} headers={headers} pk={detectedTable.pk} />
                    </TabsContent>
                </Tabs>
            ) : (
                <Alert>
                    <GitCompareArrows className="h-4 w-4" />
                    <AlertTitle>Sin datos para comparar</AlertTitle>
                    <AlertDescription>No se han encontrado datos en el archivo CSV o no se pudo conectar a la base de datos.</AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {(selectedNew.size > 0 || selectedUpdates.size > 0) && (
        <Card>
            <CardHeader>
                <CardTitle>Paso 3: Sincronizar Cambios</CardTitle>
                <CardDescription>
                    Se agregarán <span className="font-bold text-primary">{selectedNew.size}</span> registros nuevos y se actualizarán <span className="font-bold text-primary">{selectedUpdates.size}</span> registros existentes.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <Button onClick={handleSync} disabled={isSyncing} size="lg" className="w-full max-w-md text-lg py-7">
                    {isSyncing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Sincronizar Datos
                </Button>
            </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5"/> Notificaciones</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                    {notifications.map(n => (
                        <div key={n.id} className="text-sm p-3 bg-secondary/50 border rounded-lg">
                            <p>{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{n.user} a las {n.timestamp}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
         </Card>
      )}

    </div>
  );
}

// --- Sub-components for tables ---

interface DataTableProps {
    rows: CsvRow[];
    headers: string[];
    pk: string;
    selection?: Set<number>;
    onSelectRow?: (pkValue: string) => void;
}

function DataTable({ rows, headers, pk, selection, onSelectRow }: DataTableProps) {
    const pkIndex = headers.indexOf(pk);
    
    if (rows.length === 0) return <p className="text-center text-muted-foreground py-8">No hay registros en esta categoría.</p>;

    return (
        <div className="relative border rounded-lg max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <TableRow>
                        {onSelectRow && <TableHead className="w-12"><Checkbox 
                            checked={selection && rows.length > 0 && selection.size === rows.length} 
                            onCheckedChange={(checked) => {
                                rows.forEach(row => {
                                    const pkValue = String(row[pk]);
                                    if (checked && !selection?.has(rows.findIndex(r => String(r[pk]) === pkValue))) onSelectRow(pkValue);
                                    if (!checked && selection?.has(rows.findIndex(r => String(r[pk]) === pkValue))) onSelectRow(pkValue);
                                })
                            }}
                        /></TableHead>}
                        {headers.map((h, i) => <TableHead key={i} className={cn(i === pkIndex && "font-bold text-primary")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((row, rowIndex) => {
                        const pkValue = String(row[pk]);
                        const isSelected = selection ? selection.has(rows.findIndex(r => String(r[pk]) === pkValue)) : false;
                        return (
                            <TableRow key={rowIndex} data-state={isSelected ? "selected" : ""}>
                                {onSelectRow && <TableCell><Checkbox checked={isSelected} onCheckedChange={() => onSelectRow(pkValue)} /></TableCell>}
                                {headers.map((h, i) => <TableCell key={i}>{row[h]}</TableCell>)}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

interface UpdateTableProps {
    rows: ComparisonResult['updatedRows'];
    pk: string;
    selection: Set<number>;
    onSelectRow: (index: number) => void;
}

function UpdateTable({ rows, pk, selection, onSelectRow }: UpdateTableProps) {
    if (rows.length === 0) return <p className="text-center text-muted-foreground py-8">No hay registros para actualizar.</p>;

    const allHeaders = useMemo(() => {
        const h = new Set<string>([pk]);
        rows.forEach(row => {
            Object.keys(row.changes).forEach(key => h.add(key));
        });
        return [pk, ...Array.from(h).filter(header => header !== pk)];
    }, [rows, pk]);

    return (
        <div className="relative border rounded-lg max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <TableRow>
                        <TableHead className="w-12"><Checkbox 
                           checked={rows.length > 0 && selection.size === rows.length} 
                           onCheckedChange={(checked) => rows.forEach(r => {
                               if (checked && !selection.has(r.index)) onSelectRow(r.index);
                               if (!checked && selection.has(r.index)) onSelectRow(r.index);
                           })}
                        /></TableHead>
                        {allHeaders.map((h, i) => <TableHead key={i} className={cn(h === pk && "font-bold text-primary")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(row => {
                        const isSelected = selection.has(row.index);
                        return (
                            <TableRow key={row.index} data-state={isSelected ? "selected" : ""}>
                                <TableCell><Checkbox checked={isSelected} onCheckedChange={() => onSelectRow(row.index)} /></TableCell>
                                {allHeaders.map(header => (
                                    <TableCell key={header}>
                                        {header in row.changes ? (
                                            <div>
                                                <span className="text-destructive line-through">{String(row.changes[header].from ?? 'Vacío')}</span>
                                                <br />
                                                <span className="text-green-600 font-medium">{String(row.changes[header].to)}</span>
                                            </div>
                                        ) : (
                                            <span>{String(row.csv[header] ?? '')}</span>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
