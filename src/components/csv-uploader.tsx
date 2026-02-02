'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Wand2, RefreshCw, GitCompareArrows, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { saveToDatabase } from '@/ai/flows/save-to-database-flow';
import { mapHeaders } from '@/ai/flows/map-headers-flow';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types
type CsvRow = Record<string, string>;
type DbRow = Record<string, any>;
type ComparisonResult = {
  newRows: { index: number; data: CsvRow }[];
  updatedRows: { index: number; csv: CsvRow; db: DbRow; changes: Record<string, { from: any; to: any }> }[];
  unchangedRows: { index: number; data: CsvRow }[];
};
type TableConfig = {
  dbTable: string;
  pk: string;
  columns: string[];
};
type Step = 'upload' | 'mapping' | 'compare';

// Defines the structure of the database tables for header-based detection.
const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
  ventas: {
    pk: 'numero_venta',
    columns: [
      'numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 
      'es_paquete_varios', 'pertenece_kit', 'unidades', 'ingreso_productos', 
      'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 
      'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'venta_publicidad', 
      'sku', 'numero_publicacion', 'tienda_oficial', 'titulo_publicacion', 'variante', 
      'precio_unitario', 'tipo_publicacion', 'factura_adjunta', 'datos_personales_empresa', 
      'tipo_numero_documento', 'direccion_fiscal', 'tipo_contribuyente', 'cfdi', 
      'tipo_usuario', 'regimen_fiscal', 'comprador', 'negocio', 'ife', 'domicilio_entrega', 
      'municipio_alcaldia', 'estado_comprador', 'codigo_postal', 'pais', 
      'forma_entrega_envio', 'fecha_en_camino_envio', 'fecha_entregado_envio', 
      'transportista_envio', 'numero_seguimiento_envio', 'url_seguimiento_envio', 
      'unidades_envio', 'forma_entrega', 'fecha_en_camino', 'fecha_entregado', 
      'transportista', 'numero_seguimiento', 'url_seguimiento', 'revisado_por_ml', 
      'fecha_revision', 'dinero_a_favor', 'resultado', 'destino', 'motivo_resultado', 
      'unidades_reclamo', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion', 'created_at'
    ]
  },
  publicaciones: {
    pk: 'item_id',
    columns: ['id', 'item_id', 'sku', 'product_number', 'variation_id', 'title', 'status', 'category', 'price', 'company', 'created_at']
  },
  base_madre_productos: {
    pk: 'sku',
    columns: ['id', 'tiempo_produccion', 'landed_cost', 'piezas_por_sku', 'sbm', 'created_at', 'sku', 'category', 'company']
  }
};

export default function CsvUploader() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);

  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [selectedTableName, setSelectedTableName] = useState<string>("");
  const [targetTable, setTargetTable] = useState<TableConfig | null>(null);
  
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(new Set());
  
  const isSupabaseConfigured = !!supabase;

  const resetAll = (keepFile = false) => {
    setCurrentStep('upload');
    if (!keepFile) {
        setFile(null);
        setHeaders([]);
        setCsvData([]);
        if (inputRef.current) inputRef.current.value = '';
    }
    setComparison(null);
    setSelectedNew(new Set());
    setSelectedUpdates(new Set());
    setSelectedTableName("");
    setTargetTable(null);
    setHeaderMap({});
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFile(event.target.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFile(event.dataTransfer.files[0]);
    }
  };

  const parseCsv = (text: string): { headers: string[], data: CsvRow[] } => {
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length < 1) return { headers: [], data: [] };

    let delimiter = ',';
    if (lines[0].split(';').length > lines[0].split(',').length) delimiter = ';';
    else if (lines[0].split('\t').length > lines[0].split(',').length) delimiter = '\t';
    
    const parseRow = (rowStr: string): string[] => {
        const result = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < rowStr.length; i++) {
            const char = rowStr[i];
            if (char === '"' && inQuotes && i + 1 < rowStr.length && rowStr[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(field);
                field = '';
            } else {
                field += char;
            }
        }
        result.push(field);
        return result;
    };
    
    const csvHeaders = parseRow(lines[0]);
    const dataRows = lines.slice(1);
    
    const parsedData = dataRows.map(rowStr => {
        const row = parseRow(rowStr);
        const rowObject: CsvRow = {};
        csvHeaders.forEach((header, index) => {
            rowObject[header] = row[index] || '';
        });
        return rowObject;
    }).filter(row => Object.values(row).some(cell => cell.trim() !== ''));

    return { headers: csvHeaders, data: parsedData };
  };

  const processFile = (fileToProcess: File) => {
    resetAll();
    setFile(fileToProcess);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        const { headers: csvHeaders, data: parsedData } = parseCsv(text);
        setHeaders(csvHeaders);
        setCsvData(parsedData);
        toast({ title: 'Archivo Procesado', description: `${parsedData.length} filas cargadas. Ahora selecciona la tabla de destino.` });
    };
    reader.readAsText(fileToProcess, 'latin1');
  };

  const handleTableSelectAndInitiateMapping = async (tableName: string) => {
    if (!tableName) {
        resetAll(true); // Keep file but reset steps
        return;
    }

    const schema = TABLE_SCHEMAS[tableName];
    if (schema) {
        setIsLoading(true);
        setSelectedTableName(tableName);
        const newTargetTable = { dbTable: tableName, pk: schema.pk, columns: schema.columns };
        setTargetTable(newTargetTable);
        setComparison(null);
        setHeaderMap({});
        
        toast({ title: 'Tabla Seleccionada', description: `Iniciando mapeo con IA para: ${tableName}` });

        try {
          const mappingResult = await mapHeaders({ csvHeaders: headers, dbColumns: schema.columns });
          setHeaderMap(mappingResult.headerMap);

          if (Object.keys(mappingResult.headerMap).length === 0) {
            toast({ title: 'Mapeo por IA incompleto', description: 'Revisa y completa el mapeo manualmente.', variant: 'default' });
          } else {
            toast({ title: 'Mapeo por IA completado', description: 'Revisa las sugerencias antes de continuar.' });
          }
          setCurrentStep('mapping');
        } catch (err: any) {
          toast({ title: 'Error en Mapeo por IA', description: err.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleMappingChange = (csvHeader: string, dbColumn: string) => {
    setHeaderMap(prev => ({
        ...prev,
        [csvHeader]: dbColumn,
    }));
  };

  const handleConfirmMappingAndCompare = async () => {
    if (!targetTable || !Object.keys(headerMap).length) {
        toast({ title: 'Mapeo Incompleto', description: 'Asegúrate de que las columnas importantes estén mapeadas.', variant: 'destructive' });
        return;
    }
    
    setIsLoading(true);
    if (!isSupabaseConfigured) {
        toast({ title: 'Configuración de DB Incompleta', description: 'No se pueden comparar los datos.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    try {
      const dbPk = targetTable.pk;
      const csvPkHeader = Object.keys(headerMap).find(key => headerMap[key] === dbPk);

      if (!csvPkHeader) {
        toast({
          title: 'Clave Primaria no Mapeada',
          description: `La clave primaria '${dbPk}' es necesaria para la comparación. Por favor, mapea una columna del CSV a '${dbPk}'.`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      const csvPks = csvData.map(row => row[csvPkHeader]).filter(Boolean);

      if (csvPks.length === 0) {
        toast({
          title: 'Clave Primaria Vacía',
          description: `La columna '${csvPkHeader}' está vacía en tu CSV.`,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      if (!supabase) throw new Error("Cliente de Supabase no disponible");

      const { data: dbData, error } = await supabase.from(targetTable.dbTable).select('*').in(dbPk, csvPks);
      if (error) throw error;

      const dbMap = new Map(dbData.map(row => [String(row[dbPk]), row]));
      
      const newRows: ComparisonResult['newRows'] = [];
      const updatedRows: ComparisonResult['updatedRows'] = [];
      const unchangedRows: ComparisonResult['unchangedRows'] = [];

      csvData.forEach((csvRow, index) => {
        const pkValue = String(csvRow[csvPkHeader]);
        const dbRow = dbMap.get(pkValue);

        if (!pkValue || !dbRow) {
          newRows.push({ index, data: csvRow });
        } else {
          const changes: ComparisonResult['updatedRows'][0]['changes'] = {};
          for (const csvHeader in headerMap) {
             const dbKey = headerMap[csvHeader];
             if (dbKey && Object.prototype.hasOwnProperty.call(dbRow, dbKey) && Object.prototype.hasOwnProperty.call(csvRow, csvHeader)) {
                const csvVal = (csvRow[csvHeader] === null || csvRow[csvHeader] === undefined) ? '' : String(csvRow[csvHeader]).trim();
                const dbVal = (dbRow[dbKey] === null || dbRow[dbKey] === undefined) ? '' : String(dbRow[dbKey]).trim();

                if (csvVal !== dbVal) {
                    changes[dbKey] = { from: dbRow[dbKey], to: csvRow[csvHeader] };
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
      setCurrentStep('compare');

    } catch (err: any) {
      toast({ title: 'Error de Comparación', description: `No se pudo conectar a la base de datos: ${err.message}`, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!targetTable || !Object.keys(headerMap).length || (!selectedNew.size && !selectedUpdates.size)) {
        toast({ title: 'Nada que Sincronizar', description: 'Por favor, selecciona registros para añadir o actualizar.', variant: 'destructive'});
        return;
    }

    setIsSyncing(true);
    const dataToSync: CsvRow[] = [];
    selectedNew.forEach(index => dataToSync.push(csvData[index]));
    selectedUpdates.forEach(index => dataToSync.push(csvData[index]));

    const mappedData = dataToSync.map(row => {
        const newRow: Record<string, string> = {};
        for (const csvHeader in row) {
            const dbColumn = headerMap[csvHeader];
            if (dbColumn) {
                newRow[dbColumn] = row[csvHeader];
            }
        }
        return newRow;
    });

    const dbHeaders = [...new Set(mappedData.flatMap(Object.keys))];

    try {
        const result = await saveToDatabase({
            targetTable: targetTable.dbTable,
            data: { headers: dbHeaders, rows: mappedData.map(row => dbHeaders.map(h => row[h] || '')) },
            conflictKey: targetTable.pk,
            newCount: selectedNew.size,
            updateCount: selectedUpdates.size
        });

        if (result.success) {
            toast({ title: 'Sincronización Exitosa', description: result.message });
            setSelectedNew(new Set());
            setSelectedUpdates(new Set());
            await handleConfirmMappingAndCompare(); // Re-run comparison
        } else {
            throw new Error(result.message);
        }
    } catch (err: any) {
        toast({ title: 'Error de Sincronización', description: err.message, variant: 'destructive' });
    } finally {
        setIsSyncing(false);
    }
  };

  const toggleSelection = (index: number, type: 'new' | 'update') => {
    const set = type === 'new' ? setSelectedNew : setSelectedUpdates;
    set(prev => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Paso 1: Cargar y Seleccionar</CardTitle>
                <CardDescription>Arrastra o selecciona un archivo CSV, luego elige la tabla de destino.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {!file ? (
                <div
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary hover:border-primary transition-colors col-span-2"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                >
                <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta</p>
                <input ref={inputRef} type="file" accept=".csv, .txt, .tsv" className="hidden" onChange={handleFileChange}/>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3 min-w-0">
                            <FileIcon className="w-6 h-6 text-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                            <Badge variant="secondary">{csvData.length} filas</Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => resetAll(false)}><X className="w-4 h-4" /><span className="sr-only">Eliminar</span></Button>
                    </div>
                    <div className="space-y-2">
                        <Select onValueChange={handleTableSelectAndInitiateMapping} value={selectedTableName} disabled={!isSupabaseConfigured || !file || isLoading}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={isSupabaseConfigured ? "Selecciona una tabla de destino..." : "Configuración de Supabase incompleta"} />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(TABLE_SCHEMAS).map(tableName => (
                                    <SelectItem key={tableName} value={tableName}>{tableName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!isSupabaseConfigured && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTitle>Acción Requerida</AlertTitle>
                                <AlertDescription>
                                    La conexión con la DB no está configurada. Edita <code>.env</code> y reinicia el servidor.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </>
            )}
            </CardContent>
        </Card>
        
        {isLoading && (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-40 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Procesando...</p>
                    </div>
                </CardContent>
            </Card>
        )}

        {currentStep === 'mapping' && !isLoading && targetTable && (
            <Card>
                <CardHeader>
                    <CardTitle>Paso 2: Revisar Mapeo de Columnas</CardTitle>
                    <CardDescription>La IA ha sugerido un mapeo. Ajústalo si es necesario y luego confirma para analizar los datos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                        {headers.map((csvHeader) => (
                            <div key={csvHeader} className="grid grid-cols-2 items-center gap-2">
                                <label className="text-sm font-medium text-right truncate" title={csvHeader}>{csvHeader}</label>
                                <Select
                                    value={headerMap[csvHeader] || ""}
                                    onValueChange={(newDbColumn) => handleMappingChange(csvHeader, newDbColumn)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Ignorar columna" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Ignorar columna</SelectItem>
                                        {targetTable.columns.map(col => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleConfirmMappingAndCompare} disabled={isLoading} size="lg">
                        <Settings2 className="mr-2 h-5 w-5"/>
                        Confirmar Mapeo y Analizar
                    </Button>
                </CardFooter>
            </Card>
        )}

      {currentStep === 'compare' && comparison && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 3: Comparar y Sincronizar</CardTitle>
            <CardDescription>Revisa los datos. Selecciona lo que quieres sincronizar y guarda los cambios.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="new">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="new">Nuevos ({comparison.newRows.length})</TabsTrigger>
                    <TabsTrigger value="updated">Actualizaciones ({comparison.updatedRows.length})</TabsTrigger>
                    <TabsTrigger value="unchanged">Sin Cambios ({comparison.unchangedRows.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="new" className="mt-4">
                    <DataTable 
                        rows={comparison.newRows}
                        headers={headers}
                        pk={Object.keys(headerMap).find(key => headerMap[key] === targetTable?.pk) || ''}
                        selection={selectedNew}
                        onSelectRow={(index) => toggleSelection(index, 'new')}
                    />
                </TabsContent>
                <TabsContent value="updated" className="mt-4">
                    <UpdateTable rows={comparison.updatedRows} pk={targetTable?.pk || ''} selection={selectedUpdates} onSelectRow={(index) => toggleSelection(index, 'update')} />
                </TabsContent>
                <TabsContent value="unchanged" className="mt-4">
                    <DataTable rows={comparison.unchangedRows} headers={headers} pk={Object.keys(headerMap).find(key => headerMap[key] === targetTable?.pk) || ''} />
                </TabsContent>
            </Tabs>
          </CardContent>
          {(selectedNew.size > 0 || selectedUpdates.size > 0) && (
            <CardFooter className="flex-col items-center gap-4 pt-6">
                <p className="text-sm text-muted-foreground">
                    Se agregarán <span className="font-bold text-primary">{selectedNew.size}</span> registros y se actualizarán <span className="font-bold text-primary">{selectedUpdates.size}</span>.
                </p>
                <Button onClick={handleSync} disabled={isSyncing} size="lg" className="w-full max-w-md">
                    {isSyncing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Guardar Cambios en la Base de Datos
                </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}

// --- Sub-components for tables ---

interface DataTableProps {
    rows: { index: number, data: CsvRow }[];
    headers: string[];
    pk: string;
    selection?: Set<number>;
    onSelectRow?: (index: number) => void;
}

function DataTable({ rows, headers, pk, selection, onSelectRow }: DataTableProps) {
    if (rows.length === 0) return <p className="text-center text-muted-foreground py-8">No hay registros en esta categoría.</p>;
    
    const isAllSelected = selection ? rows.length > 0 && rows.every(r => selection.has(r.index)) : false;

    const handleSelectAll = () => {
        if (!onSelectRow || !selection) return;
        if (isAllSelected) {
            rows.forEach(r => selection.has(r.index) && onSelectRow(r.index));
        } else {
            rows.forEach(r => !selection.has(r.index) && onSelectRow(r.index));
        }
    };

    return (
        <div className="relative border rounded-lg max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <TableRow>
                        {onSelectRow && (
                           <TableHead className="w-12">
                               <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                           </TableHead>
                        )}
                        {headers.map((h) => <TableHead key={h} className={cn(h === pk && "font-bold text-primary")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ index, data }) => {
                        const isSelected = selection ? selection.has(index) : false;
                        return (
                            <TableRow key={index} data-state={isSelected ? "selected" : ""} onClick={() => onSelectRow && onSelectRow(index)} className={cn(onSelectRow && 'cursor-pointer')}>
                                {onSelectRow && <TableCell><Checkbox checked={isSelected} /></TableCell>}
                                {headers.map((h, i) => <TableCell key={i} className="truncate max-w-xs" title={data[h]}>{data[h]}</TableCell>)}
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

    const allHeaders = [...new Set(rows.flatMap(row => Object.keys(row.changes)))].sort();
    if (!allHeaders.includes(pk)) allHeaders.unshift(pk);


    const isAllSelected = rows.length > 0 && rows.every(r => selection.has(r.index));
    const handleSelectAll = () => {
        if (isAllSelected) {
            rows.forEach(r => selection.has(r.index) && onSelectRow(r.index));
        } else {
            rows.forEach(r => !selection.has(r.index) && onSelectRow(r.index));
        }
    };

    return (
        <div className="relative border rounded-lg max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <TableRow>
                       <TableHead className="w-12">
                           <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                       </TableHead>
                        {allHeaders.map((h) => <TableHead key={h} className={cn(h === pk && "font-bold text-primary")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(row => {
                        const isSelected = selection.has(row.index);
                        return (
                            <TableRow key={row.index} data-state={isSelected ? "selected" : ""} onClick={() => onSelectRow(row.index)} className="cursor-pointer">
                                <TableCell><Checkbox checked={isSelected} /></TableCell>
                                {allHeaders.map(header => (
                                    <TableCell key={header}>
                                        {header in row.changes ? (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-destructive line-through">{String(row.changes[header].from ?? 'Vacío')}</span>
                                                <span className="text-sm text-green-600 font-medium">{String(row.changes[header].to)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">{String(row.db[header] ?? '')}</span>
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
