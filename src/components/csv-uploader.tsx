'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, ChevronRight, CheckCircle, AlertTriangle, Search, Database, RefreshCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { saveToDatabase } from '@/ai/flows/save-to-database-flow';
import { supabase } from '@/lib/supabaseClient';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';


const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
    catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre'] },
    categorias_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'landed_cost', 'tiempo_preparacion', 'tiempo_recompra', 'proveedor', 'piezas_por_sku', 'piezas_por_contenedor', 'bodega', 'bloque'] },
    publicaciones: { pk: 'sku', columns: ['id', 'item_id', 'sku', 'product_number', 'variation_id', 'title', 'status', 'nombre_madre', 'price', 'company', 'created_at'] },
    publicaciones_por_sku: { pk: 'sku', columns: ['sku', 'publicaciones'] },
    skus_unicos: { pk: 'sku', columns: ['sku', 'nombre_madre', 'tiempo_produccion', 'landed_cost', 'piezas_por_sku', 'sbm', 'nombre_madre'] },
    skuxpublicaciones: { pk: 'sku', columns: ['sku', 'item_id', 'nombre_madre'] },
    ventas: { pk: 'numero_venta', columns: [ 'id', 'numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 'es_paquete_varios', 'pertenece_kit', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'venta_publicidad', 'sku', 'numero_publicacion', 'tienda_oficial', 'item_id', 'company', 'titulo_publicacion', 'variante', 'precio_unitario', 'tipo_publicacion', 'factura_adjunta', 'datos_personales_empresa', 'tipo_numero_documento', 'direccion_fiscal', 'tipo_contribuyente', 'cfdi', 'tipo_usuario', 'regimen_fiscal', 'comprador', 'negocio', 'ife', 'domicilio_entrega', 'municipio_alcaldia', 'estado_comprador', 'codigo_postal', 'pais', 'forma_entrega_envio', 'fecha_en_camino_envio', 'fecha_entregado_envio', 'transportista_envio', 'numero_seguimiento_envio', 'url_seguimiento_envio', 'unidades_envio', 'forma_entrega', 'fecha_en_camino', 'fecha_entregado', 'transportista', 'numero_seguimiento', 'url_seguimiento', 'revisado_por_ml', 'fecha_revision', 'dinero_a_favor', 'resultado', 'destino', 'motivo_resultado', 'unidades_reclamo', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion', 'created_at'] },
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

type Step = 'upload' | 'mapping' | 'analyzing' | 'syncing' | 'results';

type CsvRowObject = Record<string, any>;
type AnalysisResult = {
  toInsert: CsvRowObject[];
  toUpdate: { old: CsvRowObject; new: CsvRowObject, diff: Record<string, {old: any, new: any}> }[];
  noChange: CsvRowObject[];
};
type SyncSummary = {
  inserted: number;
  updated: number;
  errors: { block: number; recordIdentifier?: string; message: string; type: 'insert' | 'update' }[];
  log: string;
  insertedRecords: CsvRowObject[];
  updatedRecords: CsvRowObject[];
};

export default function CsvUploader() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CsvRowObject[]>([]);
  
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string>('');
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({}); // csvHeader -> dbColumn

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const isSupabaseConfigured = !!supabase;

  const resetAll = (keepFile = false) => {
    setCurrentStep('upload');
    if (!keepFile) {
      setFile(null);
      setHeaders([]);
      setCsvData([]);
      if (inputRef.current) inputRef.current.value = '';
    }
    setHeaderMap({});
    setSelectedTableName('');
    setTableColumns([]);
    setPrimaryKey('');
    setIsLoading(false);
    setProgress(0);
    setSyncSummary(null);
    setAnalysisResult(null);
  };

  const processFile = (fileToProcess: File) => {
    resetAll();
    setFile(fileToProcess);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const headerLine = lines[0] || '';
      
      const delimiters = [',', ';', '\t'];
      let bestDelimiter = ',';
      let maxCount = 0;
      
      delimiters.forEach(d => {
        const count = headerLine.split(d).length - 1;
        if (count > maxCount) {
          maxCount = count;
          bestDelimiter = d;
        }
      });
      
      // Use regex for splitting to handle quoted fields
      const splitRegex = new RegExp(`${bestDelimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      const rows = lines.map(row => row.trim().split(splitRegex));
      
      const csvHeaders = rows[0].map(h => (h || '').trim().replace(/"/g, ''));
      const dataRows = rows.slice(1).filter(row => row.length > 1 && row.some(cell => cell.trim() !== ''));
      
      const objects = dataRows.map(row => {
        const obj: CsvRowObject = {};
        csvHeaders.forEach((header, i) => {
          obj[header] = (row[i] || '').trim().replace(/"/g, '');
        });
        return obj;
      });

      setHeaders(csvHeaders);
      setCsvData(objects);
      toast({ title: 'Archivo Procesado', description: `${objects.length} filas de datos encontradas.` });
    };
    reader.readAsText(fileToProcess, 'latin1');
  };

  const handleTableSelect = (tableName: string) => {
    if (!tableName) {
      resetAll(true);
      return;
    }
    const schema = TABLE_SCHEMAS[tableName];
    if (schema) {
      setSelectedTableName(tableName);
      setTableColumns(schema.columns);
      setPrimaryKey(schema.pk);

      const autoMap = getAutoMapping(headers, schema.columns);
      setHeaderMap(autoMap);
      setCurrentStep('mapping');
      toast({ title: 'Tabla seleccionada', description: 'Se ha realizado un mapeo automático. Por favor, revísalo.' });
    }
  };
  
  const getAutoMapping = (csvHeaders: string[], dbCols: string[]): Record<string, string> => {
    const normalize = (str: string) => str.toLowerCase().replace(/[\s_-]+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const map: Record<string, string> = {};
    const usedDbCols = new Set<string>();

    csvHeaders.forEach(csvHeader => {
      if (!csvHeader) return;
      const normalizedCsvHeader = normalize(csvHeader);
      
      // Find exact or normalized match
      let match = dbCols.find(dbCol => normalize(dbCol) === normalizedCsvHeader);
      
      if (match && !usedDbCols.has(match)) {
        map[csvHeader] = match;
        usedDbCols.add(match);
      } else {
        map[csvHeader] = IGNORE_COLUMN_VALUE;
      }
    });
    return map;
  };

  const handleMappingChange = (csvHeader: string, dbColumn: string) => {
    setHeaderMap(prev => ({ ...prev, [csvHeader]: dbColumn }));
  };

  const handleAnalyzeData = async () => {
    const pkMapped = Object.values(headerMap).includes(primaryKey);
    if (!pkMapped) {
        toast({ title: 'Validación Fallida', description: `La columna de clave primaria '${primaryKey}' debe estar mapeada para continuar.`, variant: 'destructive' });
        return;
    }

    if (!supabase) {
        toast({ title: 'Error de Configuración', description: 'El cliente de Supabase no está disponible.', variant: 'destructive' });
        return;
    }
    
    setCurrentStep('analyzing');
    setIsLoading(true);
    setLoadingMessage('Analizando datos... Comparando con la base de datos.');

    try {
        const mappedCsvData = csvData.map(row => {
            const newRow: CsvRowObject = {};
            for (const csvHeader in headerMap) {
                const dbCol = headerMap[csvHeader];
                if (dbCol !== IGNORE_COLUMN_VALUE) {
                    newRow[dbCol] = row[csvHeader];
                }
            }
            return newRow;
        });

        const csvPkValues = mappedCsvData.map(row => row[primaryKey]).filter(Boolean);
        const { data: existingData, error } = await supabase.from(selectedTableName).select('*').in(primaryKey, csvPkValues);

        if (error) throw error;
        
        const existingDataMap = new Map(existingData.map((row: CsvRowObject) => [String(row[primaryKey]), row]));
        
        const result: AnalysisResult = { toInsert: [], toUpdate: [], noChange: [] };

        for (const csvRow of mappedCsvData) {
            const pkValue = String(csvRow[primaryKey]);
            if (existingDataMap.has(pkValue)) {
                const dbRow = existingDataMap.get(pkValue)!;
                const diff: Record<string, {old: any, new: any}> = {};
                let hasChanged = false;

                for (const key in csvRow) {
                    // Basic type-insensitive comparison
                    const csvValue = csvRow[key] !== null && csvRow[key] !== undefined ? String(csvRow[key]) : "";
                    const dbValue = dbRow[key] !== null && dbRow[key] !== undefined ? String(dbRow[key]) : "";
                    if (key !== primaryKey && csvValue !== dbValue) {
                        hasChanged = true;
                        diff[key] = { old: dbRow[key], new: csvRow[key] };
                    }
                }

                if (hasChanged) {
                    result.toUpdate.push({ old: dbRow, new: csvRow, diff });
                } else {
                    result.noChange.push(csvRow);
                }
            } else {
                result.toInsert.push(csvRow);
            }
        }
        
        setAnalysisResult(result);
        setCurrentStep('results');
        toast({
          title: 'Análisis Completo',
          description: `Se encontraron ${result.toInsert.length} registros nuevos, ${result.toUpdate.length} duplicados (para actualizar), y ${result.noChange.length} sin cambios.`
        });

    } catch (e: any) {
        toast({ title: 'Error en el Análisis', description: e.message, variant: 'destructive' });
        resetAll(true);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const handleSyncData = async (syncType: 'insert' | 'update' | 'all') => {
      if (!analysisResult) return;
      
      let dataToInsert = syncType === 'insert' || syncType === 'all' ? analysisResult.toInsert : [];
      let dataToUpdate = syncType === 'update' || syncType === 'all' ? analysisResult.toUpdate.map(u => u.new) : [];
      
      if (dataToInsert.length === 0 && dataToUpdate.length === 0) {
          toast({ title: 'Nada que Sincronizar', description: 'No hay registros nuevos o actualizados para procesar.' });
          return;
      }

      setCurrentStep('syncing');
      setIsLoading(true);
      setProgress(0);
      setLoadingMessage('Sincronizando datos con la base de datos...');
      const finalSummary: SyncSummary = { inserted: 0, updated: 0, errors: [], log: '', insertedRecords: [], updatedRecords: [] };

      const CHUNK_SIZE = 100;
      
      const recordsToProcess = dataToInsert.map(r => ({ type: 'insert', data: r }))
        .concat(dataToUpdate.map(r => ({ type: 'update', data: r })));

      const totalChunks = Math.ceil(recordsToProcess.length / CHUNK_SIZE);
      let chunksProcessed = 0;

      for (let i = 0; i < recordsToProcess.length; i += CHUNK_SIZE) {
        const chunk = recordsToProcess.slice(i, i + CHUNK_SIZE);
        
        const insertChunk = chunk.filter(c => c.type === 'insert').map(c => c.data);
        const updateChunk = chunk.filter(c => c.type === 'update').map(c => c.data);

        if (insertChunk.length > 0) {
            const result = await saveToDatabase({
                targetTable: selectedTableName,
                data: { headers: Object.keys(insertChunk[0]), rows: insertChunk.map(Object.values) },
            });

            finalSummary.inserted += result.processedCount;
            if(result.successfulRecords) finalSummary.insertedRecords.push(...result.successfulRecords);
            if (result.errors) result.errors.forEach(err => finalSummary.errors.push({ block: i / CHUNK_SIZE + 1, ...err, type: 'insert' }));
        }

        if (updateChunk.length > 0) {
             const result = await saveToDatabase({
                targetTable: selectedTableName,
                data: { headers: Object.keys(updateChunk[0]), rows: updateChunk.map(Object.values) },
                conflictKey: primaryKey,
            });
            finalSummary.updated += result.processedCount;
            if(result.successfulRecords) finalSummary.updatedRecords.push(...result.successfulRecords);
            if (result.errors) result.errors.forEach(err => finalSummary.errors.push({ block: i / CHUNK_SIZE + 1, ...err, type: 'update' }));
        }
        
        chunksProcessed++;
        setProgress((chunksProcessed / totalChunks) * 100);
      }
      
      finalSummary.log = `Sincronización completada el ${new Date().toLocaleString()}. Nuevos: ${finalSummary.inserted}, Actualizados: ${finalSummary.updated}, Errores: ${finalSummary.errors.length}.`;
      setSyncSummary(finalSummary);
      setCurrentStep('results');
      setIsLoading(false);
      toast({ title: 'Sincronización Completada', description: 'El proceso de carga de datos ha finalizado.' });
  }

  const usedDbColumns = React.useMemo(() => new Set(Object.values(headerMap).filter(v => v !== IGNORE_COLUMN_VALUE)), [headerMap]);

  const renderStep = () => {
    switch (currentStep) {
        case 'upload':
        case 'mapping':
            return (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Paso 1: Cargar Archivo y Seleccionar Tabla</CardTitle>
                    <CardDescription>Sube tu archivo CSV y elige la tabla de Supabase donde quieres cargar los datos.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {!file ? (
                      <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary hover:border-primary transition-colors col-span-2" onClick={() => inputRef.current?.click()}>
                        <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta</p>
                        <input ref={inputRef} type="file" accept=".csv,.tsv" className="hidden" onChange={(e) => e.target.files && processFile(e.target.files[0])} />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileIcon className="w-6 h-6 text-foreground flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{file.name} ({csvData.length} filas)</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => resetAll(false)}><X className="w-4 h-4" /></Button>
                        </div>
                        <div className="space-y-2">
                          <Select onValueChange={handleTableSelect} value={selectedTableName} disabled={!isSupabaseConfigured || isLoading}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={isSupabaseConfigured ? "Selecciona una tabla de destino..." : "Configuración de Supabase incompleta"} />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(TABLE_SCHEMAS).sort().map(tableName => (
                                <SelectItem key={tableName} value={tableName}>{tableName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!isSupabaseConfigured && <Alert variant="destructive"><AlertDescription>La conexión con la DB no está configurada.</AlertDescription></Alert>}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {currentStep === 'mapping' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Paso 2: Mapeo de Columnas</CardTitle>
                      <CardDescription>Revisa el mapeo automático. La clave primaria <Badge variant="outline">{primaryKey}</Badge> debe estar mapeada para continuar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[450px] w-full rounded-md border">
                        <Table>
                          <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                            <TableRow>
                              <TableHead>Columna en Archivo CSV</TableHead>
                              <TableHead>Mapear a Columna de Destino</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {headers.map(csvHeader => (
                              <TableRow key={csvHeader}>
                                <TableCell className="font-medium">{csvHeader || <span className="italic text-muted-foreground">Columna sin nombre</span>}</TableCell>
                                <TableCell>
                                  <Select value={headerMap[csvHeader] || IGNORE_COLUMN_VALUE} onValueChange={(val) => handleMappingChange(csvHeader, val)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={IGNORE_COLUMN_VALUE}>-- Ignorar esta columna --</SelectItem>
                                      {tableColumns.map(col => (
                                        <SelectItem key={col} value={col} disabled={usedDbColumns.has(col) && headerMap[csvHeader] !== col}>
                                          {col} {col === primaryKey && <span className="text-xs text-primary font-bold ml-2">(PK)</span>}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                      <Button onClick={handleAnalyzeData} size="lg"><Search className="mr-2 h-5 w-5"/>Analizar Datos</Button>
                    </CardFooter>
                  </Card>
                )}
              </>
            );
        case 'analyzing':
            return (
                <Card>
                  <CardHeader><CardTitle>Analizando...</CardTitle></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pt-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{loadingMessage}</p>
                  </CardContent>
                </Card>
            );
        case 'syncing':
            return (
                <Card>
                  <CardHeader><CardTitle>Sincronizando Datos</CardTitle><CardDescription>{loadingMessage}</CardDescription></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pt-4">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-muted-foreground">{Math.round(progress)}% completado</p>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </CardContent>
                </Card>
            );
        case 'results':
            if (syncSummary) { // Final result screen
               const allMappedHeaders = Array.from(usedDbColumns);
               return (
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Sincronización Finalizada</CardTitle>
                          <CardDescription>La carga de datos ha terminado. Aquí tienes el resumen.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => resetAll(false)}>
                          <Undo2 className="mr-2 h-4 w-4" />
                          Empezar de Nuevo
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Alert variant={syncSummary.errors.length > 0 ? "destructive" : "default"}>
                          {syncSummary.errors.length === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          <AlertTitle>Resumen de Carga</AlertTitle>
                          <AlertDescription>
                            <p><span className="font-bold">{syncSummary.inserted}</span> registros insertados.</p>
                            <p><span className="font-bold">{syncSummary.updated}</span> registros actualizados.</p>
                            {syncSummary.errors.length > 0 && <p><span className="font-bold text-destructive">{syncSummary.errors.length}</span> registros con errores.</p>}
                          </AlertDescription>
                        </Alert>

                        {syncSummary.insertedRecords.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Registros Insertados ({syncSummary.insertedRecords.length})</h3>
                                <ScrollArea className="h-60 w-full rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {syncSummary.insertedRecords.map((row, i) => (
                                                <TableRow key={`inserted-${i}`}>
                                                    {allMappedHeaders.map(h => <TableCell key={h}>{String(row[h])}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        )}

                        {syncSummary.updatedRecords.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Registros Actualizados ({syncSummary.updatedRecords.length})</h3>
                                <ScrollArea className="h-60 w-full rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {syncSummary.updatedRecords.map((row, i) => (
                                                <TableRow key={`updated-${i}`}>
                                                    {allMappedHeaders.map(h => <TableCell key={h}>{String(row[h])}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        )}
                        
                        <div className="space-y-2">
                          <h3 className="font-semibold">Registro de Cambios:</h3>
                          <p className="text-sm text-muted-foreground font-mono p-2 bg-muted rounded-md">{syncSummary.log}</p>
                        </div>

                        {syncSummary.errors.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Detalle de Errores:</h3>
                            <ScrollArea className="h-40 w-full rounded-md border p-4">
                              <div className="space-y-2 text-sm">
                                {syncSummary.errors.map((err, i) => (
                                  <div key={i} className="p-2 bg-destructive/10 rounded-md">
                                    <p className="font-semibold text-destructive">
                                      Error en {err.type === 'insert' ? 'Inserción' : 'Actualización'}
                                      {err.recordIdentifier && ` (Registro: ${err.recordIdentifier})`}
                                    </p>
                                    <p className="font-mono text-xs">{err.message}</p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                );
            }

            if (analysisResult) { // Analysis result screen
              const allMappedHeaders = Array.from(usedDbColumns);
              return (
                  <Card>
                    <CardHeader>
                      <CardTitle>Paso 3: Resultados del Análisis</CardTitle>
                      <CardDescription>Revisa los cambios detectados y elige qué acción sincronizar con la base de datos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="toInsert">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="toInsert">Nuevos ({analysisResult.toInsert.length})</TabsTrigger>
                          <TabsTrigger value="toUpdate">A Actualizar ({analysisResult.toUpdate.length})</TabsTrigger>
                          <TabsTrigger value="noChange">Sin Cambios ({analysisResult.noChange.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="toInsert">
                          <ScrollArea className="h-96"><Table><TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{analysisResult.toInsert.map((row, i) => <TableRow key={i}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h])}</TableCell>)}</TableRow>)}</TableBody></Table></ScrollArea>
                        </TabsContent>
                        <TabsContent value="toUpdate">
                           <ScrollArea className="h-96"><Table><TableHeader><TableRow><TableHead>Campo</TableHead><TableHead>Valor Anterior</TableHead><TableHead>Valor Nuevo</TableHead></TableRow></TableHeader><TableBody>{analysisResult.toUpdate.map((item, i) => <React.Fragment key={i}>{Object.entries(item.diff).map(([key, values]) => <TableRow key={`${i}-${key}`}><TableCell className="font-medium">{key}</TableCell><TableCell className="text-destructive">{String(values.old)}</TableCell><TableCell className="text-green-600">{String(values.new)}</TableCell></TableRow>)}</React.Fragment>)}</TableBody></Table></ScrollArea>
                        </TabsContent>
                        <TabsContent value="noChange">
                           <ScrollArea className="h-96"><Table><TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{analysisResult.noChange.map((row, i) => <TableRow key={i}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h])}</TableCell>)}</TableRow>)}</TableBody></Table></ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4">
                        <Button size="lg" onClick={() => handleSyncData('insert')} disabled={analysisResult.toInsert.length === 0 || isLoading}>
                            <Database className="mr-2 h-5 w-5"/>Insertar Nuevos
                        </Button>
                        <Button size="lg" onClick={() => handleSyncData('update')} disabled={analysisResult.toUpdate.length === 0 || isLoading}>
                            <RefreshCcw className="mr-2 h-5 w-5"/>Actualizar Duplicados
                        </Button>
                        <Button size="lg" onClick={() => handleSyncData('all')} disabled={isLoading}>
                            <Save className="mr-2 h-5 w-5"/>Aplicar Todo
                        </Button>
                    </CardFooter>
                  </Card>
              );
            }
            // Fallback screen for results if something goes wrong
            return <Card><CardContent>Error: No hay resultados de análisis para mostrar.</CardContent></Card>;
    }
  }


  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {renderStep()}
    </div>
  );
}
