
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Wand2, RefreshCw, GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { saveToDatabase } from '@/ai/flows/save-to-database-flow';
import { supabaseAdmin, supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

// Types
type CsvRow = string[];
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

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

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

/* =========================
   Comparison Helpers
========================= */

function parseValueForComparison(key: string, value: string): any {
    const numericFields = [
      'id', 'costo', 'tiempo_preparacion',
      'numero_venta', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos',
      'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso',
      'anulaciones_reembolsos', 'total', 'precio_unitario', 'unidades_envio',
      'dinero_a_favor', 'unidades_reclamo', 'price',
    ];
  
    const booleanFields = [
      'es_paquete_varios', 'pertenece_kit', 'venta_publicidad', 'negocio',
      'revisado_por_ml', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion',
    ];
  
    const dateFields = [
      'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro',
    ];

    if (value === undefined || value === null) {
      return null;
    }
    
    const trimmedValue = value.trim();
    if (trimmedValue.toLowerCase() === 'null') {
      return null;
    }
    if (trimmedValue === '') {
      return '';
    }
    
    if (numericFields.includes(key)) {
      const num = parseFloat(trimmedValue.replace(',', '.'));
      return isNaN(num) ? trimmedValue : num;
    }
  
    if (booleanFields.includes(key)) {
      const v = trimmedValue.toLowerCase();
      if (v === 'true' || v === '1' || v === 'verdadero' || v === 'si' || v === 'sí') return true;
      if (v === 'false' || v === '0' || v === 'falso' || v === 'no') return false;
      return trimmedValue;
    }
  
    if (dateFields.includes(key)) {
      const date = new Date(trimmedValue);
      if (!isNaN(date.getTime()) && trimmedValue.length > 4) {
          // Compare just the date part for date fields, not time, to avoid timezone issues
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      }
    }
  
    return trimmedValue;
}

function parseDbValueForComparison(key: string, value: any): any {
    const dateFields = [
      'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro',
    ];
    
    if (value === null || value === undefined) return null;

    if (dateFields.includes(key) && value) {
      const date = new Date(value);
       if (!isNaN(date.getTime())) {
          return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
       }
    }
    
    const numericFields = [
      'id', 'costo', 'tiempo_preparacion',
      'numero_venta', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos',
      'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso',
      'anulaciones_reembolsos', 'total', 'precio_unitario', 'unidades_envio',
      'dinero_a_favor', 'unidades_reclamo', 'price',
    ];
    if (numericFields.includes(key) && typeof value === 'string') {
        const num = parseFloat(value.replace(',', '.'));
        return isNaN(num) ? value : num;
    }
    
    return value;
}


export default function CsvUploader() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [selectedTableName, setSelectedTableName] = useState<string>("");
  const [targetTable, setTargetTable] = useState<TableConfig | null>(null);
  const [headerMap, setHeaderMap] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(new Set());
  
  const isSupabaseConfigured = !!supabase;

  const cleanHeaderMap = useMemo(() => {
    const cleanMap: Record<number, string> = {};
    for (const key in headerMap) {
      if (Object.prototype.hasOwnProperty.call(headerMap, key) && headerMap[key] && headerMap[key] !== IGNORE_COLUMN_VALUE) {
        cleanMap[parseInt(key, 10)] = headerMap[key];
      }
    }
    return cleanMap;
  }, [headerMap]);

  const resetAll = () => {
    setFile(null);
    setHeaders([]);
    setCsvData([]);
    setComparison(null);
    setSelectedNew(new Set());
    setSelectedUpdates(new Set());
    setSelectedTableName("");
    setTargetTable(null);
    setCurrentStep('upload');
    setHeaderMap({});
    if (inputRef.current) inputRef.current.value = '';
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
    const parsedData = lines.slice(1).map(line => parseRow(line));

    return { headers: csvHeaders, data: parsedData };
  };

  const processFile = (fileToProcess: File) => {
    setFile(fileToProcess);
    setComparison(null);
    setHeaderMap({});
    setSelectedTableName("");
    setTargetTable(null);

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        
        if (!text) {
            toast({ title: 'Archivo Vacío', description: 'El archivo seleccionado está vacío o no se pudo leer.', variant: 'destructive' });
            return;
        }

        const { headers: csvHeaders, data: parsedData } = parseCsv(text);
        
        if (csvHeaders.length === 0 || parsedData.length === 0) {
             toast({ title: 'Archivo CSV inválido', description: 'No se pudieron encontrar cabeceras o filas de datos. Revisa el formato.', variant: 'destructive' });
            return;
        }

        setHeaders(csvHeaders);
        setCsvData(parsedData);
        setCurrentStep('mapping');
        toast({ title: 'Archivo Procesado', description: `Se cargaron ${parsedData.length} filas. Ahora, selecciona la tabla de destino.` });
    };
    reader.readAsText(fileToProcess, 'latin1');
  };
  
  const handleTableSelect = (tableName: string) => {
    if (!tableName) {
        setSelectedTableName("");
        setTargetTable(null);
        setHeaderMap({});
        return;
    }

    if (tableName) {
        const schema = TABLE_SCHEMAS[tableName];
        if (schema) {
            setSelectedTableName(tableName);
            const newTargetTable = { dbTable: tableName, pk: schema.pk, columns: schema.columns };
            setTargetTable(newTargetTable);
            toast({ title: 'Tabla Seleccionada', description: `Mapea las columnas para la tabla: ${tableName}` });

            // Auto-map headers
            const finalMap: Record<number, string> = {};
            const usedDbCols = new Set<string>();
            const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '');
            const dbColumnsNormalized = newTargetTable.columns.map(col => ({ original: col, normalized: normalize(col) }));
        
            headers.forEach((csvHeader, csvIndex) => {
                const normalizedCsvHeader = normalize(csvHeader);
                if (!normalizedCsvHeader) return;
        
                let bestMatch: { score: number, column: string } | null = null;
        
                for (const dbCol of dbColumnsNormalized) {
                    if (!dbCol.normalized || usedDbCols.has(dbCol.original)) continue;
                    
                    let score = 0;
                    if (normalizedCsvHeader === dbCol.normalized) {
                        score = 100;
                    } else if (dbCol.normalized.includes(normalizedCsvHeader)) {
                        score = (normalizedCsvHeader.length / dbCol.normalized.length) * 90;
                    } else if (normalizedCsvHeader.includes(dbCol.normalized)) {
                        score = (dbCol.normalized.length / normalizedCsvHeader.length) * 90;
                    }

                    if (score > (bestMatch?.score || 0)) {
                        bestMatch = { score, column: dbCol.original };
                    }
                }
                
                if (bestMatch && bestMatch.score > 50) {
                    finalMap[csvIndex] = bestMatch.column;
                    usedDbCols.add(bestMatch.column);
                }
            });
            setHeaderMap(finalMap);
        }
    } else {
        setSelectedTableName("");
        setTargetTable(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFile(event.target.files[0]);
    }
  };

  const handleConfirmMappingAndCompare = async () => {
    if (!targetTable || !Object.keys(cleanHeaderMap).length) {
        toast({ title: 'Mapeo Incompleto', description: 'Asegúrate de que las columnas importantes estén mapeadas.', variant: 'destructive' });
        return;
    }
    
    setIsLoading(true);
    toast({ title: 'Analizando diferencias', description: 'Comparando tu archivo con la base de datos...', duration: 5000 });
    if (!isSupabaseConfigured) {
        toast({ title: 'Configuración de DB Incompleta', description: 'No se pueden comparar los datos.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }
    
    try {
      const dbPk = targetTable.pk;
      const csvPkHeaderIndexStr = Object.keys(cleanHeaderMap).find(key => cleanHeaderMap[parseInt(key, 10)] === dbPk);

      if (csvPkHeaderIndexStr === undefined) {
          toast({
              title: 'Modo de "Solo Altas"',
              description: `No se mapeó la clave primaria '${dbPk}'. Todos los registros se tratarán como nuevos.`,
              variant: 'default',
          });
          const newRows = csvData.map((data, index) => ({ index, data }));
          setComparison({ newRows, updatedRows: [], unchangedRows: [] });
          setCurrentStep('compare');
          setIsLoading(false);
          return;
      }

      const csvPkHeaderIndex = parseInt(csvPkHeaderIndexStr, 10);
      const csvPks = csvData.map(row => row[csvPkHeaderIndex]).filter(Boolean);

      if (csvPks.length === 0) {
        toast({
          title: 'Clave Primaria Vacía',
          description: `La columna mapeada como clave primaria ('${headers[csvPkHeaderIndex]}') está vacía en tu CSV.`,
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
        const pkValue = String(csvRow[csvPkHeaderIndex]);
        const dbRow = dbMap.get(pkValue);

        if (!pkValue || !dbRow) {
          newRows.push({ index, data: csvRow });
        } else {
          const changes: ComparisonResult['updatedRows'][0]['changes'] = {};
          let hasChanges = false;
          for (const indexStr in cleanHeaderMap) {
             const csvIndex = parseInt(indexStr, 10);
             const dbKey = cleanHeaderMap[csvIndex];
             if (dbKey && Object.prototype.hasOwnProperty.call(dbRow, dbKey)) {
                const parsedCsvVal = parseValueForComparison(dbKey, csvRow[csvIndex]);
                const parsedDbVal = parseDbValueForComparison(dbKey, dbRow[dbKey]);
                
                if (String(parsedCsvVal) !== String(parsedDbVal)) {
                    // Avoid false positives for empty/null values
                    if (parsedCsvVal === null && (parsedDbVal === '' || parsedDbVal === null)) continue;
                    if (parsedCsvVal === '' && (parsedDbVal === null || parsedDbVal === '')) continue;
                    changes[dbKey] = { from: dbRow[dbKey], to: csvRow[csvIndex] };
                    hasChanges = true;
                }
             }
          }
          if (hasChanges) {
            updatedRows.push({ index, csv: csvRow, db: dbRow, changes });
          } else {
            unchangedRows.push({ index, data: csvRow });
          }
        }
      });
      
      setComparison({ newRows, updatedRows, unchangedRows });
      setCurrentStep('compare');

    } catch (err: any) {
      toast({ title: 'Error de Comparación', description: `No se pudo comparar con la base de datos. Revisa la conexión, la configuración de la tabla y que la clave primaria mapeada sea correcta. Error: ${err.message}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSync = async () => {
    if (!targetTable || !Object.keys(cleanHeaderMap).length || (!selectedNew.size && !selectedUpdates.size)) {
        toast({ title: 'Nada que Sincronizar', description: 'Por favor, selecciona registros para añadir o actualizar.', variant: 'destructive'});
        return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Iniciando sincronización...');
    
    const BATCH_SIZE = 50; // Process 50 rows at a time
    const rowsToSync = [
        ...Array.from(selectedNew).map(index => ({ type: 'new', data: csvData[index] })),
        ...Array.from(selectedUpdates).map(index => ({ type: 'update', data: csvData[index] }))
    ];

    const totalBatches = Math.ceil(rowsToSync.length / BATCH_SIZE);
    let success = true;

    for (let i = 0; i < totalBatches; i++) {
        const batch = rowsToSync.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const newInBatch = batch.filter(r => r.type === 'new').length;
        const updatedInBatch = batch.filter(r => r.type === 'update').length;

        setSyncMessage(`Procesando lote ${i + 1} de ${totalBatches}... (${batch.length} registros)`);
        
        const dbHeaders = [...new Set(Object.values(cleanHeaderMap))];
        
        const isUpsert = !!Object.values(cleanHeaderMap).find(col => col === targetTable.pk);
        
        try {
            const result = await saveToDatabase({
                targetTable: targetTable.dbTable,
                data: { headers: dbHeaders, rows: batch.map(item => dbHeaders.map(h => {
                    const csvHeaderIndex = Object.keys(cleanHeaderMap).find(key => cleanHeaderMap[parseInt(key,10)] === h);
                    return csvHeaderIndex !== undefined ? item.data[parseInt(csvHeaderIndex,10)] : '';
                })) },
                conflictKey: isUpsert ? targetTable.pk : undefined,
                newCount: newInBatch,
                updateCount: updatedInBatch,
            });

            if (!result.success) {
                toast({ title: `Error en Lote ${i + 1}`, description: result.message, variant: 'destructive', duration: 10000 });
                success = false;
                break; // Stop on first error
            }
        } catch(err: any) {
            toast({ title: `Error Crítico en Lote ${i + 1}`, description: err.message, variant: 'destructive', duration: 10000 });
            success = false;
            break;
        }

        setSyncProgress(Math.round(((i + 1) / totalBatches) * 100));
    }

    if (success) {
        toast({ title: 'Sincronización Completa', description: 'Los datos se han guardado con éxito. Actualizando vista...' });
        setSelectedNew(new Set());
        setSelectedUpdates(new Set());
        await handleConfirmMappingAndCompare();
    }

    setIsSyncing(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      processFile(event.dataTransfer.files[0]);
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

  const handleMappingChange = (csvIndex: number, dbColumn: string) => {
    setHeaderMap(prev => ({...prev, [csvIndex]: dbColumn}));
  };

  const pkHeaderIndex = useMemo(() => {
    const idxStr = Object.keys(cleanHeaderMap).find(key => cleanHeaderMap[parseInt(key,10)] === targetTable?.pk);
    return idxStr !== undefined ? parseInt(idxStr, 10) : -1;
  }, [cleanHeaderMap, targetTable]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Paso 1: Cargar Documento CSV</CardTitle>
                <CardDescription>Arrastra y suelta un archivo CSV, o haz clic para seleccionarlo.</CardDescription>
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
                        <Badge variant="secondary">{csvData.length} filas</Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={resetAll}><X className="w-4 h-4" /><span className="sr-only">Eliminar</span></Button>
                </div>
            )}
            </CardContent>
        </Card>

        {currentStep === 'mapping' && !isLoading && (
            <Card>
                <CardHeader>
                    <CardTitle>Paso 2: Seleccionar Tabla y Mapear Columnas</CardTitle>
                    <CardDescription>Elige la tabla de destino y ajusta el mapeo de columnas sugerido por el sistema.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="table-select">Tabla de Destino</Label>
                        <Select onValueChange={handleTableSelect} value={selectedTableName} disabled={!isSupabaseConfigured}>
                            <SelectTrigger id="table-select" className="w-full">
                                <SelectValue placeholder={isSupabaseConfigured ? "Selecciona una tabla..." : "Configuración de Supabase incompleta"} />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(TABLE_SCHEMAS).map(tableName => (
                                    <SelectItem key={tableName} value={tableName}>{tableName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {targetTable && (
                        <div className="border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead className="w-[50%]">Cabecera del CSV</TableHead>
                                        <TableHead className="w-[50%]">Columna de la Base de Datos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {headers.map((csvHeader, i) => (
                                        <TableRow key={`${csvHeader}-${i}`}>
                                            <TableCell className="font-medium truncate" title={csvHeader}>
                                                {csvHeader}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={headerMap[i] || IGNORE_COLUMN_VALUE}
                                                    onValueChange={(newDbColumn) => handleMappingChange(i, newDbColumn)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Ignorar esta columna" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={IGNORE_COLUMN_VALUE}>
                                                            -- Ignorar esta columna --
                                                        </SelectItem>
                                                        {targetTable.columns.map(col => (
                                                            <SelectItem key={col} value={col}>
                                                                {col}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleConfirmMappingAndCompare} disabled={isLoading || !targetTable} size="lg">
                        <GitCompareArrows className="mr-2 h-5 w-5"/>
                        Analizar y Previsualizar Cambios
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
                        pkIndex={pkHeaderIndex}
                        selection={selectedNew}
                        onSelectRow={(index) => toggleSelection(index, 'new')}
                    />
                </TabsContent>
                <TabsContent value="updated" className="mt-4">
                    <UpdateTable 
                        rows={comparison.updatedRows} 
                        pk={targetTable?.pk || ''} 
                        selection={selectedUpdates} 
                        onSelectRow={(index) => toggleSelection(index, 'update')}
                    />
                </TabsContent>
                <TabsContent value="unchanged" className="mt-4">
                    <DataTable rows={comparison.unchangedRows} headers={headers} pkIndex={pkHeaderIndex} />
                </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex-col items-center gap-4 pt-6 border-t">
            {isSyncing ? (
                <div className="w-full text-center p-4">
                    <Progress value={syncProgress} className="w-full mb-2" />
                    <p className="text-sm text-muted-foreground mt-2">{syncMessage}</p>
                    <p className="text-lg font-semibold">{syncProgress}%</p>
                </div>
            ) : (
                (selectedNew.size > 0 || selectedUpdates.size > 0) && (
                <>
                    <p className="text-sm text-muted-foreground">
                        Se agregarán <span className="font-bold text-primary">{selectedNew.size}</span> registros y se actualizarán <span className="font-bold text-primary">{selectedUpdates.size}</span>.
                    </p>
                    <Button onClick={handleSync} size="lg" className="w-full max-w-md">
                        <Save className="mr-2 h-5 w-5" />
                        Guardar Cambios en la Base de Datos
                    </Button>
                </>
                )
            )}
            </CardFooter>
        </Card>
      )}
    </div>
  );
}

// --- Sub-components for tables ---

interface DataTableProps {
    rows: { index: number, data: CsvRow }[];
    headers: string[];
    pkIndex: number;
    selection?: Set<number>;
    onSelectRow?: (index: number) => void;
}

function DataTable({ rows, headers, pkIndex, selection, onSelectRow }: DataTableProps) {
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
                        {headers.map((h, i) => <TableHead key={`${h}-${i}`} className={cn(i === pkIndex && "font-bold text-primary", "truncate")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ index, data }) => {
                        const isSelected = selection ? selection.has(index) : false;
                        return (
                            <TableRow key={index} data-state={isSelected ? "selected" : ""} className={cn(isSelected && "bg-green-100/50 dark:bg-green-900/20")}>
                                {onSelectRow && <TableCell><Checkbox checked={isSelected} onClick={() => onSelectRow(index)} /></TableCell>}
                                {data.map((cell, cellIndex) => <TableCell key={cellIndex} className="truncate max-w-xs" title={cell}>{cell}</TableCell>)}
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
        const h = new Set<string>();
        rows.forEach(row => { Object.keys(row.changes).forEach(key => h.add(key)); });
        return [pk, ...Array.from(h).filter(header => header !== pk).sort()];
    }, [rows, pk]);

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
                            <TableRow key={row.index} data-state={isSelected ? "selected" : ""} className={cn(isSelected && "bg-yellow-100/50 dark:bg-yellow-900/20")}>
                                <TableCell><Checkbox checked={isSelected} onClick={() => onSelectRow(row.index)} /></TableCell>
                                {allHeaders.map(header => (
                                    <TableCell key={header} className="truncate max-w-[200px]">
                                        {header in row.changes ? (
                                            <span title={`De: ${String(row.changes[header].from ?? '')}\nA: ${String(row.changes[header].to ?? '')}`}>
                                                <span className="text-red-500 line-through">{String(row.changes[header].from ?? '')}</span>
                                                {' -> '}
                                                <span className="text-green-500 font-bold">{String(row.changes[header].to ?? '')}</span>
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground" title={String(row.db[header])}>{String(row.db[header] ?? '')}</span>
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

    