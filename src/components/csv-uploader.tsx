
'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Wand2, RefreshCw, GitCompareArrows, ArrowRight, Settings2 } from 'lucide-react';
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
      'id', 'numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 
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
  skus: {
    pk: 'sku',
    columns: ['id', 'sku', 'variacion', 'id_producto_madre', 'costo', 'fecha_registro', 'tiempo_preparacion']
  },
  productos_madre: {
    pk: 'id_producto_madre',
    columns: ['id', 'id_producto_madre', 'nombre_madre', 'costo', 'tiempo_preparacion', 'observaciones', 'fecha_registro']
  }
};


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

  const processFile = (file: File) => {
    resetAll();
    setFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      
      // Regex to split CSV row, handling quoted fields.
      const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
          toast({ title: 'Archivo CSV inválido', description: 'El archivo debe contener al menos una fila de cabeceras y una de datos.', variant: 'destructive' });
          return;
      }

      const headerRow = lines[0];
      const dataRows = lines.slice(1);

      const cleanCell = (cell: string): string => {
        let value = cell.trim();
        // Repeatedly remove surrounding quotes
        while (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }
        // Handle escaped quotes inside the string (e.g., "a""b")
        value = value.replace(/""/g, '"');
        return value;
      };

      const csvHeaders = headerRow.split(re).map(cleanCell);
      const parsedData = dataRows.map(row => row.split(re).map(cleanCell));

      setHeaders(csvHeaders);
      setCsvData(parsedData);
      toast({ title: 'Archivo Procesado', description: `${file.name} ha sido cargado. Ahora selecciona la tabla de destino.` });
    };
    reader.readAsText(file, 'latin1'); // Use 'latin1' to avoid issues with special characters
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      processFile(event.target.files[0]);
    }
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

          const initialMap: Record<number, string> = {};
          const usedDbColumns = new Set<string>();

          headers.forEach((header, index) => {
            const suggestedDbColumn = mappingResult.headerMap[header];
            if (suggestedDbColumn && !usedDbColumns.has(suggestedDbColumn)) {
              initialMap[index] = suggestedDbColumn;
              usedDbColumns.add(suggestedDbColumn);
            }
          });

          setHeaderMap(initialMap);

          if (Object.keys(initialMap).length === 0) {
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

  const handleMappingChange = (csvHeaderIndex: number, dbColumn: string) => {
    setHeaderMap(prev => {
        const newMap = { ...prev };
        newMap[csvHeaderIndex] = dbColumn;
        return newMap;
    });
  };

  const handleConfirmMappingAndCompare = async () => {
    if (!targetTable || !Object.keys(cleanHeaderMap).length) {
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
      const csvPkHeaderIndexStr = Object.keys(cleanHeaderMap).find(key => cleanHeaderMap[parseInt(key, 10)] === dbPk);

      if (csvPkHeaderIndexStr === undefined) {
          toast({
            title: 'Análisis sin Clave Primaria',
            description: "No se mapeó una clave primaria. Todos los registros se tratarán como nuevos.",
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
          for (const indexStr in cleanHeaderMap) {
             const csvIndex = parseInt(indexStr, 10);
             const dbKey = cleanHeaderMap[csvIndex];
             if (dbKey && Object.prototype.hasOwnProperty.call(dbRow, dbKey)) {
                const csvVal = (csvRow[csvIndex] === null || csvRow[csvIndex] === undefined) ? '' : String(csvRow[csvIndex]).trim();
                const dbVal = (dbRow[dbKey] === null || dbRow[dbKey] === undefined) ? '' : String(dbRow[dbKey]).trim();
                
                if (csvVal !== dbVal) {
                    changes[dbKey] = { from: dbRow[dbKey], to: csvRow[csvIndex] };
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
    const dataToSync: CsvRow[] = [];
    
    selectedNew.forEach(index => dataToSync.push(csvData[index]));
    selectedUpdates.forEach(index => dataToSync.push(csvData[index]));

    const mappedData = dataToSync.map(row => {
        const newRow: Record<string, string> = {};
        Object.entries(cleanHeaderMap).forEach(([indexStr, dbColumn]) => {
          const index = parseInt(indexStr, 10);
          newRow[dbColumn] = row[index];
        });
        return newRow;
    });

    const dbHeaders = [...new Set(Object.values(cleanHeaderMap))];
    
    try {
        const result = await saveToDatabase({
            targetTable: targetTable.dbTable,
            data: { headers: dbHeaders, rows: mappedData.map(row => dbHeaders.map(h => row[h] || '')) },
            conflictKey: targetTable.pk,
        });

        if (result.success) {
            toast({ title: 'Sincronización Exitosa', description: result.message });
            setSelectedNew(new Set());
            setSelectedUpdates(new Set());
            await handleConfirmMappingAndCompare(); // Re-run comparison
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
    const set = type === 'new' ? setSelectedNew : setSelectedUpdates;
    set(prev => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
    });
  };

  const pkHeaderIndex = useMemo(() => {
    const idxStr = Object.keys(cleanHeaderMap).find(key => cleanHeaderMap[parseInt(key,10)] === targetTable?.pk);
    return idxStr !== undefined ? parseInt(idxStr, 10) : -1;
  }, [cleanHeaderMap, targetTable]);

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
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange}/>
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
                <CardContent>
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
                <CardContent>
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
                        pkIndex={pkHeaderIndex}
                        selection={selectedNew}
                        onSelectRow={(index) => toggleSelection(index, 'new')}
                    />
                </TabsContent>
                <TabsContent value="updated" className="mt-4">
                    <UpdateTable rows={comparison.updatedRows} pk={targetTable?.pk || ''} selection={selectedUpdates} onSelectRow={(index) => toggleSelection(index, 'update')} />
                </TabsContent>
                <TabsContent value="unchanged" className="mt-4">
                    <DataTable rows={comparison.unchangedRows} headers={headers} pkIndex={pkHeaderIndex} />
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
                        {headers.map((h, i) => <TableHead key={`${h}-${i}`} className={cn(i === pkIndex && "font-bold text-primary")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ index, data }) => {
                        const isSelected = selection ? selection.has(index) : false;
                        return (
                            <TableRow key={index} data-state={isSelected ? "selected" : ""} onClick={() => onSelectRow && onSelectRow(index)} className={cn(onSelectRow && 'cursor-pointer')}>
                                {onSelectRow && <TableCell><Checkbox checked={isSelected} /></TableCell>}
                                {data.map((cell, cellIndex) => <TableCell key={cellIndex}>{cell}</TableCell>)}
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
                            <TableRow key={row.index} data-state={isSelected ? "selected" : ""} onClick={() => onSelectRow(row.index)} className="cursor-pointer">
                                <TableCell><Checkbox checked={isSelected} /></TableCell>
                                {allHeaders.map(header => (
                                    <TableCell key={header}>
                                        {header in row.changes ? (
                                            <div>
                                                <span className="text-xs text-destructive line-through">{String(row.changes[header].from ?? 'Vacío')}</span>
                                                <ArrowRight className="h-3 w-3 inline-block mx-1 text-muted-foreground" />
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
