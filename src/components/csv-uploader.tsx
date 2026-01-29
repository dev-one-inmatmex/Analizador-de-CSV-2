'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Wand2, Download, RefreshCw, Bell, GitCompareArrows, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
type Notification = {
  id: number;
  message: string;
  timestamp: string;
  user: string;
};
type TableConfig = {
  dbTable: string;
  pk: string;
  columns: string[];
};

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
  
  const [selectedTableName, setSelectedTableName] = useState<string>("");
  const [targetTable, setTargetTable] = useState<TableConfig | null>(null);
  
  const [isMapping, setIsMapping] = useState(false);
  const [userHeaderMap, setUserHeaderMap] = useState<Record<string, string>>({});
  const [isMappingConfirmed, setIsMappingConfirmed] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [selectedNew, setSelectedNew] = useState<Set<number>>(new Set());
  const [selectedUpdates, setSelectedUpdates] = useState<Set<number>>(new Set());

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const isSupabaseConfigured = !!supabase;

  const resetAll = () => {
    setFile(null);
    setHeaders([]);
    setCsvData([]);
    setComparison(null);
    setSelectedNew(new Set());
    setSelectedUpdates(new Set());
    setSelectedTableName("");
    setTargetTable(null);
    setUserHeaderMap({});
    setIsMappingConfirmed(false);
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
    resetAll();
    setFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').map(row => row.trim().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
      const csvHeaders = rows[0].map(h => (h || '').trim().replace(/"/g, ''));
      
      const dataRows = rows.slice(1).filter(row => row.length > 1 && row.some(cell => cell.trim() !== ''));
      setHeaders(csvHeaders);
      const parsedData = dataRows.map(row => {
        const rowObject: CsvRow = {};
        csvHeaders.forEach((header, index) => {
          rowObject[header] = (row[index] || '').trim().replace(/"/g, '');
        });
        return rowObject;
      });
      setCsvData(parsedData);
      toast({ title: 'Archivo Procesado', description: `${file.name} ha sido cargado. Ahora selecciona la tabla de destino.` });
    };
    reader.readAsText(file);
  };
  
  const handleTableSelect = async (tableName: string) => {
    if (!tableName) {
        setSelectedTableName("");
        setTargetTable(null);
        setComparison(null);
        setUserHeaderMap({});
        setIsMappingConfirmed(false);
        return;
    }

    const schema = TABLE_SCHEMAS[tableName];
    if (schema) {
        setSelectedTableName(tableName);
        const newTargetTable = { dbTable: tableName, pk: schema.pk, columns: schema.columns };
        setTargetTable(newTargetTable);
        toast({ title: 'Tabla Seleccionada', description: `Iniciando mapeo de cabeceras para: ${tableName}` });

        setIsMapping(true);
        setIsMappingConfirmed(false);
        setComparison(null);
        setUserHeaderMap({});

        try {
          const mappingResult = await mapHeaders({ csvHeaders: headers, dbColumns: schema.columns });
          setUserHeaderMap(mappingResult.headerMap);
          toast({ title: 'Mapeo de IA Completo', description: `La IA ha sugerido un mapeo. Por favor, revísalo.` });
        } catch (err: any) {
          toast({ title: 'Error en Mapeo IA', description: err.message, variant: 'destructive' });
        } finally {
          setIsMapping(false);
        }
    }
  };

  const handleUserMapChange = (csvHeader: string, dbColumn: string) => {
    setUserHeaderMap(prev => ({
        ...prev,
        [csvHeader]: dbColumn === 'none' ? '' : dbColumn
    }));
  };

  const handleConfirmMapping = async () => {
    if(!targetTable) return;
    setIsMappingConfirmed(true);
    toast({ title: 'Mapeo Confirmado', description: 'Iniciando comparación con la base de datos.' });
    await handleCompareData(targetTable, userHeaderMap);
  };

  const handleCompareData = async (currentTable: TableConfig | null, currentHeaderMap: Record<string, string> | null) => {
    if (!currentTable || !currentHeaderMap || csvData.length === 0) {
        return;
    }
    if (!isSupabaseConfigured) {
        toast({ title: 'Configuración de DB Incompleta', description: 'No se pueden comparar los datos.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    setComparison(null);
    try {
      const dbPk = currentTable.pk;
      const csvPkHeader = Object.keys(currentHeaderMap).find(key => currentHeaderMap[key] === dbPk);

      if (!csvPkHeader) {
        toast({
          title: 'Clave Primaria no Mapeada',
          description: `La clave primaria '${dbPk}' debe estar mapeada a una cabecera del CSV.`,
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

      const { data: dbData, error } = await supabase
        .from(currentTable.dbTable)
        .select('*')
        .in(dbPk, csvPks);

      if (error) throw error;

      const dbMap = new Map(dbData.map(row => [String(row[dbPk]), row]));
      
      const newRows: ComparisonResult['newRows'] = [];
      const updatedRows: ComparisonResult['updatedRows'] = [];
      const unchangedRows: ComparisonResult['unchangedRows'] = [];

      csvData.forEach((csvRow, index) => {
        const pkValue = String(csvRow[csvPkHeader]);
        const dbRow = dbMap.get(pkValue);

        if (!dbRow) {
          newRows.push({ index, data: csvRow });
        } else {
          const changes: ComparisonResult['updatedRows'][0]['changes'] = {};
          for (const csvHeader in csvRow) {
             const dbKey = currentHeaderMap[csvHeader];
             if (dbKey && Object.prototype.hasOwnProperty.call(dbRow, dbKey)) {
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

    } catch (err: any) {
      toast({ title: 'Error de Comparación', description: `No se pudo conectar a la base de datos: ${err.message}`, variant: 'destructive' });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSync = async () => {
    if (!targetTable || !userHeaderMap || (!selectedNew.size && !selectedUpdates.size)) {
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
            const dbColumn = userHeaderMap[csvHeader];
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
            data: {
                headers: dbHeaders,
                rows: mappedData.map(row => dbHeaders.map(h => row[h] || ''))
            },
            conflictKey: targetTable.pk,
        });

        if (result.success) {
            toast({ title: 'Sincronización Exitosa', description: result.message });
            addNotification(`${dataToSync.length} registros sincronizados con la tabla '${targetTable.dbTable}'.`);
            setSelectedNew(new Set());
            setSelectedUpdates(new Set());
            await handleCompareData(targetTable, userHeaderMap);
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

        <Card className={cn(!file && "bg-muted/50 pointer-events-none opacity-50")}>
            <CardHeader>
                <CardTitle>Paso 2: Seleccionar Tabla de Destino</CardTitle>
                <CardDescription>Elige la tabla con la que quieres comparar y sincronizar tu archivo CSV.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select onValueChange={handleTableSelect} value={selectedTableName} disabled={!isSupabaseConfigured || !file || isMapping}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={isSupabaseConfigured ? "Selecciona una tabla..." : "Configuración de Supabase incompleta"} />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.keys(TABLE_SCHEMAS).map(tableName => (
                            <SelectItem key={tableName} value={tableName}>{tableName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {!isSupabaseConfigured && (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Acción Requerida</AlertTitle>
                        <AlertDescription>
                            La conexión con la base de datos no está configurada. Por favor, edita el archivo <code>.env</code> con tus credenciales de Supabase y reinicia el servidor.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
        
        { isMapping && (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center h-24 gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">La IA está sugiriendo un mapeo...</p>
                    </div>
                </CardContent>
            </Card>
        )}

        {targetTable && !isMapping && !isMappingConfirmed && (
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wand2 className="text-primary"/>Paso 3: Revisar Mapeo de Columnas</CardTitle>
                    <CardDescription>La IA ha sugerido un mapeo. Revisa y ajusta las columnas según sea necesario. Las no mapeadas no se sincronizarán.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border rounded-lg max-h-80 overflow-auto">
                        <Table>
                             <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead>Cabecera CSV</TableHead>
                                    <TableHead className="w-12 text-center"></TableHead>
                                    <TableHead>Columna Base de Datos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {headers.map(csvHeader => (
                                    <TableRow key={csvHeader}>
                                        <TableCell className="font-medium">{csvHeader}</TableCell>
                                        <TableCell className="text-center">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                                        </TableCell>
                                        <TableCell>
                                            <Select 
                                                value={userHeaderMap[csvHeader] || 'none'}
                                                onValueChange={(dbColumn) => handleUserMapChange(csvHeader, dbColumn)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar columna..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No mapear</SelectItem>
                                                    {targetTable.columns.map(col => (
                                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <Button onClick={handleConfirmMapping} className="w-full">
                        Confirmar Mapeo y Comparar Datos
                    </Button>
                </CardContent>
            </Card>
        )}

      {(isLoading || (comparison && isMappingConfirmed)) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Paso 4: Comparar y Seleccionar Datos</CardTitle>
                    <CardDescription>Revisa los datos del CSV y compáralos con la base de datos. Selecciona lo que quieres sincronizar.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleCompareData(targetTable, userHeaderMap)} disabled={isLoading || !targetTable || !userHeaderMap}>
                    <RefreshCw className={cn("w-5 h-5", (isLoading || isMapping) && "animate-spin")} />
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Comparando con la base de datos...</p>
                </div>
            ) : comparison && targetTable ? (
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
                            pk={Object.keys(userHeaderMap || {}).find(key => (userHeaderMap || {})[key] === targetTable.pk) || ''}
                            selection={selectedNew}
                            onSelectRow={(index) => toggleSelection(index, 'new')}
                        />
                    </TabsContent>
                    <TabsContent value="updated" className="mt-4">
                        <UpdateTable rows={comparison.updatedRows} pk={targetTable.pk} selection={selectedUpdates} onSelectRow={(index) => toggleSelection(index, 'update')} />
                    </TabsContent>
                    <TabsContent value="unchanged" className="mt-4">
                        <DataTable rows={comparison.unchangedRows} headers={headers} pk={Object.keys(userHeaderMap || {}).find(key => (userHeaderMap || {})[key] === targetTable.pk) || ''} />
                    </TabsContent>
                </Tabs>
            ) : (
                 !isMapping && targetTable && (
                    <Alert>
                        <GitCompareArrows className="h-4 w-4" />
                        <AlertTitle>Sin datos para comparar</AlertTitle>
                        <AlertDescription>No se pudo realizar la comparación. Verifica el mapeo de la clave primaria o el contenido del archivo.</AlertDescription>
                    </Alert>
                )
            )}
          </CardContent>
        </Card>
      )}

      {(selectedNew.size > 0 || selectedUpdates.size > 0) && (
        <Card>
            <CardHeader>
                <CardTitle>Paso 5: Sincronizar Cambios</CardTitle>
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
    rows: { index: number, data: CsvRow }[];
    headers: string[];
    pk: string;
    selection?: Set<number>;
    onSelectRow?: (index: number) => void;
}

function DataTable({ rows, headers, pk, selection, onSelectRow }: DataTableProps) {
    const pkIndex = headers.indexOf(pk);
    
    if (rows.length === 0) return <p className="text-center text-muted-foreground py-8">No hay registros en esta categoría.</p>;

    const handleSelectAll = (checked: boolean | "indeterminate") => {
        if (!onSelectRow || !selection) return;
        const rowIndexes = rows.map(r => r.index);
        const allSelected = rowIndexes.every(index => selection.has(index));
        if (checked === true || !allSelected) {
            rowIndexes.forEach(index => { if(!selection.has(index)) onSelectRow(index) });
        } else {
            rowIndexes.forEach(index => { if(selection.has(index)) onSelectRow(index) });
        }
    };
    
    const isAllSelected = selection ? rows.length > 0 && rows.every(r => selection.has(r.index)) : false;
    const isSomeSelected = selection ? !isAllSelected && rows.some(r => selection.has(r.index)) : false;


    return (
        <div className="relative border rounded-lg max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <TableRow>
                        {onSelectRow && (
                           <TableHead className="w-12">
                               <Checkbox 
                                   checked={isAllSelected ? true : (isSomeSelected ? "indeterminate" : false)} 
                                   onCheckedChange={handleSelectAll}
                               />
                           </TableHead>
                        )}
                        {headers.map((h, i) => <TableHead key={i} className={cn(i === pkIndex && "font-bold text-primary")}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map(({ index, data }) => {
                        const isSelected = selection ? selection.has(index) : false;
                        return (
                            <TableRow key={index} data-state={isSelected ? "selected" : ""}>
                                {onSelectRow && <TableCell><Checkbox checked={isSelected} onCheckedChange={() => onSelectRow(index)} /></TableCell>}
                                {headers.map((h, i) => <TableCell key={i}>{data[h]}</TableCell>)}
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

    const handleSelectAll = (checked: boolean | "indeterminate") => {
        const rowIndexes = rows.map(r => r.index);
        const allSelected = rowIndexes.every(index => selection.has(index));
        if (checked === true || !allSelected) {
            rowIndexes.forEach(index => { if(!selection.has(index)) onSelectRow(index) });
        } else {
            rowIndexes.forEach(index => { if(selection.has(index)) onSelectRow(index) });
        }
    };

    const isAllSelected = rows.length > 0 && rows.every(r => selection.has(r.index));
    const isSomeSelected = !isAllSelected && rows.some(r => selection.has(r.index));

    return (
        <div className="relative border rounded-lg max-h-96 overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                    <TableRow>
                       <TableHead className="w-12">
                           <Checkbox 
                               checked={isAllSelected ? true : (isSomeSelected ? "indeterminate" : false)} 
                               onCheckedChange={handleSelectAll}
                           />
                       </TableHead>
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
                                            <span>{String(row.db[header] ?? '')}</span>
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
