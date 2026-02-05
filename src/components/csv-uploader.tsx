
'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Search, Database, RefreshCcw, Undo2, CheckCircle, AlertTriangle } from 'lucide-react';
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
     catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'company'] },
     categorias_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'landed_cost', 'tiempo_preparacion', 'tiempo_recompra', 'proveedor', 'piezas_por_sku', 'piezas_por_contenedor', 'bodega', 'bloque'] },
     publicaciones: { pk: 'sku', columns: ['item_id', 'sku', 'product_number', 'variation_id', 'title', 'status', 'nombre_madre', 'price', 'company'] },
     publicaciones_por_sku: { pk: 'sku', columns: ['sku', 'publicaciones'] },
     skus_unicos: { pk: 'sku', columns: ['sku', 'nombre_madre', 'tiempo_produccion', 'landed_cost', 'piezas_por_sku', 'sbm'] },
     skuxpublicaciones: { pk: 'sku', columns: ['sku', 'item_id', 'nombre_madre'] },
     ventas: { pk: 'numero_venta', columns: [ 'numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 'es_paquete_varios', 'pertenece_kit', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'venta_publicidad', 'sku', 'item_id', 'company', 'title', 'variante', 'price', 'tipo_publicacion', 'factura_adjunta', 'datos_personales_empresa', 'tipo_numero_documento', 'direccion_fiscal', 'tipo_contribuyente', 'cfdi', 'tipo_usuario', 'regimen_fiscal', 'comprador', 'negocio', 'ife', 'domicilio_entrega', 'municipio_alcaldia', 'estado_comprador', 'codigo_postal', 'pais', 'forma_entrega_envio', 'fecha_en_camino_envio', 'fecha_entregado_envio', 'transportista_envio', 'numero_seguimiento_envio', 'url_seguimiento_envio', 'unidades_envio', 'forma_entrega', 'fecha_en_camino', 'fecha_entregado', 'transportista', 'numero_seguimiento', 'url_seguimiento', 'revisado_por_ml', 'fecha_revision', 'dinero_a_favor', 'resultado', 'destino', 'motivo_resultado', 'unidades_reclamo', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion'] },
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
 
 type SaveToDatabaseOutput = Awaited<ReturnType<typeof saveToDatabase>>;
 type RowError = NonNullable<SaveToDatabaseOutput['errors']>[number];

 function parseValue(key: string, value: any): any {
    // Handle null/empty values first
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') {
      return null;
    }
  
    // Combine all field types for comprehensive parsing
    const numericFields = [
      'costo', 'tiempo_preparacion', 'unidades', 'ingreso_productos', 
      'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 
      'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'precio_unitario', 
      'unidades_envio', 'dinero_a_favor', 'unidades_reclamo', 'price',
      'landed_cost', 'piezas_por_sku', 'tiempo_produccion', 'publicaciones', 'tiempo_recompra'
    ];
  
    const booleanFields = [
      'es_paquete_varios', 'pertenece_kit', 'venta_publicidad', 'negocio',
      'revisado_por_ml', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion',
    ];
  
    const dateFields = [
      'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro',
      'fecha_en_camino_envio', 'fecha_entregado_envio'
    ];

    // Ensure value is a string before calling string methods
    const stringValue = String(value).trim();

    // Keep text-based IDs as strings, but trim whitespace
    if (key === 'numero_venta' || key === 'sku' || key === 'item_id' || key === 'product_number' || key === 'variation_id' || key === 'publicacion_id') {
      return stringValue;
    }
    
    // Parse numeric fields
    if (numericFields.includes(key)) {
      // If the string is empty after trimming, return null to avoid "invalid input syntax for type numeric"
      if (stringValue === '') return null;
      const num = parseFloat(stringValue.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? null : num;
    }
  
    // Parse boolean fields, handling "Sí"
    if (booleanFields.includes(key)) {
      const v = stringValue.toLowerCase();
      return v === 'true' || v === '1' || v === 'verdadero' || v === 'si' || v === 'sí';
    }
  
    // Parse date fields
    if (dateFields.includes(key)) {
        if (value instanceof Date) return value.toISOString();
    
        const strValue = String(value).trim();
        if (!strValue) return null;
    
        // Regex to handle DD/MM/YYYY or DD-MM-YYYY, with optional time
        const dateTimeRegex = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T]?(\d{1,2}):(\d{1,2}):?(\d{1,2})?)?/;
        const match = strValue.match(dateTimeRegex);
    
        let date;
        if (match) {
            // We assume DD/MM/YYYY for es locale. This is a common source of bugs if format is MM/DD/YYYY.
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            const hour = match[4] ? parseInt(match[4], 10) : 0;
            const minute = match[5] ? parseInt(match[5], 10) : 0;
            const second = match[6] ? parseInt(match[6], 10) : 0;
            
            // Basic validation for year and month
            if (year > 1900 && year < 3000 && month >= 1 && month <= 12) {
                 date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
            } else {
                // If regex matches but values are weird, treat as invalid
                 date = new Date('invalid');
            }
        } else {
            // Fallback to default browser parsing (for ISO formats YYYY-MM-DD etc.)
            date = new Date(strValue);
        }
    
        return isNaN(date.getTime()) ? null : date.toISOString();
    }
  
    // Return the original value (trimmed if it's a string) for any other fields
    return typeof stringValue === 'string' ? stringValue.trim() : stringValue;
}

 export default function CsvUploader() {
   const { toast } = useToast();
   const inputRef = useRef<HTMLInputElement>(null);
  
   const [file, setFile] = useState<File | null>(null);
   const [headers, setHeaders] = useState<string[]>([]);
   const [rawRows, setRawRows] = useState<string[][]>([]);
  
   const [currentStep, setCurrentStep] = useState<Step>('upload');
   const [selectedTableName, setSelectedTableName] = useState<string>('');
   const [tableColumns, setTableColumns] = useState<string[]>([]);
   const [primaryKey, setPrimaryKey] = useState<string>('');
   const [headerMap, setHeaderMap] = useState<Record<number, string>>({}); // csvHeaderIndex -> dbColumn
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
       setRawRows([]);
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
      
       const splitRegex = new RegExp(`${bestDelimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
       const csvHeaders = (lines[0] || '').split(splitRegex).map(cell => cell.trim().replace(/^"|"$/g, ''));
       const dataRows = lines.slice(1)
         .map(row => row.split(splitRegex).map(cell => cell.trim().replace(/^"|"$/g, '')))
         .filter(row => row.join('').trim() !== '');
       
       setHeaders(csvHeaders);
       setRawRows(dataRows);
       toast({ title: 'Archivo Procesado', description: `${dataRows.length} filas de datos encontradas.` });
     };
     reader.readAsText(fileToProcess, 'windows-1252');
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
  
   const getAutoMapping = (csvHeaders: string[], dbCols: string[]): Record<number, string> => {
     const normalize = (str: string) => str.toLowerCase().replace(/[\s_-]+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
     const map: Record<number, string> = {};
     const usedDbCols = new Set<string>();

     csvHeaders.forEach((csvHeader, index) => {
       if (!csvHeader) return;
       const normalizedCsvHeader = normalize(csvHeader);
      
       let match = dbCols.find(dbCol => normalize(dbCol) === normalizedCsvHeader);
      
       if (match && !usedDbCols.has(match)) {
         map[index] = match;
         usedDbCols.add(match);
       } else {
         map[index] = IGNORE_COLUMN_VALUE;
       }
     });
     return map;
   };

   const handleMappingChange = (csvHeaderIndex: number, dbColumn: string) => {
     setHeaderMap(prev => ({ ...prev, [csvHeaderIndex]: dbColumn }));
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
         const mappedCsvData = rawRows.map(row => {
             const newRow: CsvRowObject = {};
             Object.entries(headerMap).forEach(([csvIndex, dbCol]) => {
                 if (dbCol !== IGNORE_COLUMN_VALUE) {
                     newRow[dbCol] = row[parseInt(csvIndex)];
                 }
             });
             return newRow;
         }).filter(row => Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== ''));

         const csvPkValues = mappedCsvData.map(row => row[primaryKey]).filter(Boolean);
         if (csvPkValues.length === 0) {
            throw new Error("No se encontraron valores válidos en la columna de clave primaria mapeada en tu CSV.");
         }
         
         const { data: existingData, error } = await supabase.from(selectedTableName).select('*').in(primaryKey, csvPkValues);

         if (error) throw error;
        
         const existingDataMap = new Map(existingData.map((row: CsvRowObject) => [String(row[primaryKey]), row]));
        
         const result: AnalysisResult = { toInsert: [], toUpdate: [], noChange: [] };

         for (const csvRow of mappedCsvData) {
             const pkValue = String(csvRow[primaryKey]);
             if (!pkValue) continue;

             if (existingDataMap.has(pkValue)) {
                 const dbRow = existingDataMap.get(pkValue)!;
                 const diff: Record<string, {old: any, new: any}> = {};
                 let hasChanged = false;

                 for (const key in csvRow) {
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
         setCurrentStep('mapping');
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

       const allData = [...dataToInsert, ...dataToUpdate];
      
       const CHUNK_SIZE = 100;
       const totalChunks = Math.ceil(allData.length / CHUNK_SIZE);
       
        for (let i = 0; i < totalChunks; i++) {
            const chunk = allData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            if (chunk.length === 0) continue;

            let recordsToProcess = chunk.map((unparsedRecord: CsvRowObject) => {
              const parsedRecord: Record<string, any> = {};
              Object.keys(unparsedRecord).forEach(key => {
                parsedRecord[key] = parseValue(key, unparsedRecord[key]);
              });
              return parsedRecord;
            });
            
            if (selectedTableName === 'catalogo_madre') {
                recordsToProcess = recordsToProcess.filter(record => record.nombre_madre !== null);
            }

            const successfulRecords: CsvRowObject[] = [];
            const errors: any[] = [];

            for (const record of recordsToProcess) {
              const isUpdate = dataToUpdate.some(u => String(u[primaryKey]) === String(record[primaryKey]));
              const query = supabase.from(selectedTableName);

              const { data: resultData, error } = await (isUpdate
                  ? query.upsert(record, { onConflict: primaryKey })
                  : query.insert(record)
              );

              if (error) {
                  errors.push({
                      recordIdentifier: record[primaryKey],
                      message: error.message,
                  });
              } else {
                  successfulRecords.push(record);
              }
            }


            if (successfulRecords) {
                const insertedChunk = successfulRecords.filter((r: any) => dataToInsert.some(i => String(i[primaryKey]) === String(r[primaryKey])));
                const updatedChunk = successfulRecords.filter((r: any) => dataToUpdate.some(u => String(u[primaryKey]) === String(r[primaryKey])));
                
                finalSummary.inserted += insertedChunk.length;
                finalSummary.updated += updatedChunk.length;
                
                finalSummary.insertedRecords.push(...(insertedChunk as CsvRowObject[]));
                finalSummary.updatedRecords.push(...(updatedChunk as CsvRowObject[]));
            }

            if (errors) {
                errors.forEach((e: any) => {
                    finalSummary.errors.push({
                        block: i + 1,
                        recordIdentifier: e.recordIdentifier,
                        message: e.message,
                        type: dataToInsert.some((r) => String(r[primaryKey]) === String(e.recordIdentifier)) ? 'insert' : 'update'
                    });
                });
            }


            setProgress(((i + 1) / totalChunks) * 100);
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
                             <span className="text-sm font-medium text-foreground truncate">{file.name} ({rawRows.length} filas)</span>
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
                       <CardDescription>Revisa el mapeo. La clave primaria <Badge variant="outline">{primaryKey}</Badge> debe estar mapeada para continuar.</CardDescription>
                     </CardHeader>
                     <CardContent>
                       <div className="relative w-full overflow-auto">
                         <Table>
                           <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                             <TableRow>
                               <TableHead>Columna en Archivo CSV</TableHead>
                               <TableHead>Mapear a Columna de Destino</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {headers.map((csvHeader, index) => (
                               <TableRow key={index}>
                                 <TableCell className="font-medium">{csvHeader || <span className="italic text-muted-foreground">Columna sin nombre</span>}</TableCell>
                                   <TableCell>
                                     <Select value={headerMap[index] || IGNORE_COLUMN_VALUE} onValueChange={(val) => handleMappingChange(index, val)}>
                                       <SelectTrigger><SelectValue/></SelectTrigger>
                                       <SelectContent>
                                        <SelectItem value={IGNORE_COLUMN_VALUE}>-- Ignorar esta columna --</SelectItem>
                                         {tableColumns.map(col => (
                                           <SelectItem key={col} value={col} disabled={usedDbColumns.has(col) && headerMap[index] !== col}>
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
                       </div>
                     </CardContent>
                     <CardFooter className="flex justify-center">
                       <Button onClick={handleAnalyzeData} size="lg" disabled={isLoading} className="w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5"/>}
                        Analizar Datos
                       </Button>
                     </CardFooter>
                   </Card>
                 )}
               </>
             );
         case 'analyzing':
         case 'syncing':
             return (
                 <Card>
                   <CardHeader>
                    <CardTitle>{currentStep === 'analyzing' ? 'Analizando Datos...' : 'Sincronizando Datos...'}</CardTitle>
                    <CardDescription>{loadingMessage}</CardDescription>
                   </CardHeader>
                   <CardContent className="flex flex-col items-center gap-4 pt-4">
                     {currentStep === 'syncing' && <Progress value={progress} className="w-full" />}
                     <p className="text-sm text-muted-foreground">{currentStep === 'syncing' ? `${Math.round(progress)}% completado` : 'Por favor, espera.'}</p>
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
                                 <div className="relative w-full overflow-auto h-60 border rounded-md">
                                     <Table>
                                         <TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                                         <TableBody>
                                             {syncSummary.insertedRecords.map((row, i) => (
                                                 <TableRow key={`inserted-${i}`}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}</TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </div>
                             </div>
                         )}

                         {syncSummary.updatedRecords.length > 0 && (
                             <div className="space-y-2">
                                <h3 className="font-semibold">Registros Actualizados ({syncSummary.updatedRecords.length})</h3>
                                 <div className="relative w-full overflow-auto h-60 border rounded-md">
                                     <Table>
                                         <TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                                         <TableBody>
                                             {syncSummary.updatedRecords.map((row, i) => (
                                                 <TableRow key={`updated-${i}`}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}</TableRow>
                                             ))}
                                         </TableBody>
                                     </Table>
                                 </div>
                             </div>
                         )}
                        
                         <div className="space-y-2">
                           <h3 className="font-semibold">Registro de Cambios:</h3>
                           <p className="text-sm text-muted-foreground font-mono p-2 bg-muted rounded-md">{syncSummary.log}</p>
                         </div>

                         {syncSummary.errors.length > 0 && (
                           <div>
                             <h3 className="font-semibold mb-2">Detalle de Errores:</h3>
                             <div className="relative w-full overflow-auto h-40 border rounded-md p-4">
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
                             </div>
                           </div>
                         )}
                       </CardContent>
                     </Card>
                 );
             }

             if (analysisResult) {
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
                            <div className="relative w-full overflow-auto h-96 border rounded-md">
                                <Table><TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{analysisResult.toInsert.map((row, i) => <TableRow key={`insert-${i}`}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}</TableRow>)}</TableBody></Table>
                            </div>
                         </TabsContent>
                         <TabsContent value="toUpdate">
                            <div className="relative w-full overflow-auto h-96 border rounded-md">
                                <Table><TableHeader><TableRow><TableHead>Campo</TableHead><TableHead>Valor Anterior</TableHead><TableHead>Valor Nuevo</TableHead></TableRow></TableHeader><TableBody>{analysisResult.toUpdate.map((item, i) => <React.Fragment key={i}>{Object.entries(item.diff).map(([key, values]) => <TableRow key={`${i}-${key}`}><TableCell className="font-medium">{key}</TableCell><TableCell className="text-destructive">{String(values.old ?? 'N/A')}</TableCell><TableCell className="text-green-600">{String(values.new ?? 'N/A')}</TableCell></TableRow>)}</React.Fragment>)}</TableBody></Table>
                            </div>
                         </TabsContent>
                         <TabsContent value="noChange">
                            <div className="relative w-full overflow-auto h-96 border rounded-md">
                                <Table><TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{analysisResult.noChange.map((row, i) => <TableRow key={`nochange-${i}`}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}</TableRow>)}</TableBody></Table>
                           </div>
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
                         <Button size="lg" onClick={() => handleSyncData('all')} disabled={isLoading || (analysisResult.toInsert.length === 0 && analysisResult.toUpdate.length === 0)}>
                             <Save className="mr-2 h-5 w-5"/>Aplicar Todo
                         </Button>
                     </CardFooter>
                   </Card>
               );
             }
             return <Card><CardContent className="py-8 text-center text-muted-foreground">Error: No hay resultados de análisis para mostrar.</CardContent></Card>;
        default:
             return null;
     }
   }


   return (
     <div className="w-full max-w-7xl mx-auto space-y-6">
       {renderStep()}
     </div>
   );
 }

    

    

    
