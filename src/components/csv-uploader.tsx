'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
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

const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
  catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre', 'company'] },
  categorias_madre: { pk: 'sku', columns: ['sku', 'landed_cost', 'tiempo_produccion', 'tiempo_recompra', 'proveedor'] },
  publicaciones: { pk: 'sku', columns: ['id', 'item_id', 'sku', 'product_number', 'variation_id', 'title', 'status', 'category', 'price', 'company', 'created_at'] },
  publicaciones_por_sku: { pk: 'sku', columns: ['sku', 'publicaciones'] },
  skus_unicos: { pk: 'sku', columns: ['sku', 'nombre_madre', 'tiempo_produccion', 'landed_cost', 'piezas_por_sku', 'sbm', 'category'] },
  skuxpublicaciones: { pk: 'sku', columns: ['sku', 'item_id', 'nombre_madre'] },
  ventas: { pk: 'numero_venta', columns: ['numero_venta', 'fecha_venta', 'estado', 'descripcion_estado', 'es_paquete_varios', 'pertenece_kit', 'unidades', 'ingreso_productos', 'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'venta_publicidad', 'sku', 'numero_publicacion', 'tienda_oficial', 'titulo_publicacion', 'variante', 'precio_unitario', 'tipo_publicacion', 'factura_adjunta', 'datos_personales_empresa', 'tipo_numero_documento', 'direccion_fiscal', 'tipo_contribuyente', 'cfdi', 'tipo_usuario', 'regimen_fiscal', 'comprador', 'negocio', 'ife', 'domicilio_entrega', 'municipio_alcaldia', 'estado_comprador', 'codigo_postal', 'pais', 'forma_entrega_envio', 'fecha_en_camino_envio', 'fecha_entregado_envio', 'transportista_envio', 'numero_seguimiento_envio', 'url_seguimiento_envio', 'unidades_envio', 'forma_entrega', 'fecha_en_camino', 'fecha_entregado', 'transportista', 'numero_seguimiento', 'url_seguimiento', 'revisado_por_ml', 'fecha_revision', 'dinero_a_favor', 'resultado', 'destino', 'motivo_resultado', 'unidades_reclamo', 'reclamo_abierto', 'reclamo_cerrado', 'con_mediacion', 'created_at'] },
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

type Step = 'upload' | 'mapping' | 'syncing' | 'results';
type SyncSummary = {
  successCount: number;
  errorCount: number;
  errors: { block: number; message: string }[];
};

export default function CsvUploader() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [primaryKey, setPrimaryKey] = useState<string>('');
  const [headerMap, setHeaderMap] = useState<Record<number, string>>({}); // csvIndex -> dbColumn

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
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
  };

  const processFile = (fileToProcess: File) => {
    resetAll();
    setFile(fileToProcess);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const rows = text.split(/\r\n|\n/).map(row => row.trim().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/));
      const csvHeaders = rows[0].map(h => (h || '').trim().replace(/"/g, ''));
      const dataRows = rows.slice(1).filter(row => row.length > 1 && row.some(cell => cell.trim() !== ''));
      
      setHeaders(csvHeaders);
      setCsvData(dataRows.map(row => row.map(cell => (cell || '').trim().replace(/"/g, ''))));
      toast({ title: 'Archivo Procesado', description: `${dataRows.length} filas de datos encontradas.` });
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

  const getAutoMapping = (csvHeaders: string[], dbCols: string[]): Record<number, string> => {
    const normalize = (str: string) => str.toLowerCase().replace(/[\s_-]+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const map: Record<number, string> = {};
    const usedDbCols = new Set<string>();

    csvHeaders.forEach((csvHeader, index) => {
      if (!csvHeader) return;
      const normalizedCsvHeader = normalize(csvHeader);
      const match = dbCols.find(dbCol => normalize(dbCol) === normalizedCsvHeader);
      if (match && !usedDbCols.has(match)) {
        map[index] = match;
        usedDbCols.add(match);
      }
    });
    return map;
  };

  const handleMappingChange = (csvIndex: number, dbColumn: string) => {
    setHeaderMap(prev => ({ ...prev, [csvIndex]: dbColumn }));
  };

  const handleStartSync = async () => {
    const mappedPk = Object.values(headerMap).find(col => col === primaryKey);
    if (!mappedPk) {
      toast({
        title: 'Validación fallida',
        description: `La columna de clave primaria '${primaryKey}' debe estar mapeada para poder continuar.`,
        variant: 'destructive',
      });
      return;
    }

    setCurrentStep('syncing');
    setProgress(0);
    setSyncSummary({ successCount: 0, errorCount: 0, errors: [] });
    
    const CHUNK_SIZE = 100;
    const dataToSync = csvData;
    const totalChunks = Math.ceil(dataToSync.length / CHUNK_SIZE);
    const finalSummary: SyncSummary = { successCount: 0, errorCount: 0, errors: [] };

    const validMappedHeaders = [...new Set(Object.values(headerMap).filter(v => v !== IGNORE_COLUMN_VALUE))];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = dataToSync.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const mappedChunk = chunk.map(row => {
        const newRow: Record<string, string> = {};
        Object.entries(headerMap).forEach(([indexStr, dbColumn]) => {
          if (dbColumn !== IGNORE_COLUMN_VALUE) {
            newRow[dbColumn] = row[parseInt(indexStr, 10)];
          }
        });
        return newRow;
      });

      try {
        const result = await saveToDatabase({
          targetTable: selectedTableName,
          data: {
            headers: validMappedHeaders,
            rows: mappedChunk.map(row => validMappedHeaders.map(h => row[h] ?? '')),
          },
          conflictKey: primaryKey,
        });

        if (result.success) {
          finalSummary.successCount += result.processedCount ?? 0;
        } else {
          finalSummary.errorCount += chunk.length;
          finalSummary.errors.push({ block: i + 1, message: result.message });
        }
      } catch (e: any) {
        finalSummary.errorCount += chunk.length;
        finalSummary.errors.push({ block: i + 1, message: e.message || 'Error desconocido en el flujo.' });
      }

      setProgress(((i + 1) / totalChunks) * 100);
    }
    
    setSyncSummary(finalSummary);
    setCurrentStep('results');
  };

  const usedDbColumns = useMemo(() => new Set(Object.values(headerMap).filter(v => v !== IGNORE_COLUMN_VALUE)), [headerMap]);

  const columnLength = Math.ceil(headers.length / 3);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paso 1: Cargar Archivo y Seleccionar Tabla</CardTitle>
          <CardDescription>Sube tu archivo CSV y elige la tabla de Supabase donde quieres cargar los datos.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {!file ? (
            <div
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary hover:border-primary transition-colors col-span-2"
              onClick={() => inputRef.current?.click()}
            >
              <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta</p>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files && processFile(e.target.files[0])} />
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
            <CardDescription>Revisa el mapeo automático y ajusta las columnas que no coincidan. La clave primaria <span className="font-bold text-primary">{primaryKey}</span> debe estar mapeada.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
              {/* Column 1 */}
              <div className="flex flex-col gap-y-4">
                {headers.slice(0, columnLength).map((csvHeader, index) => {
                  const csvIndex = index;
                  return (
                    <div key={csvIndex} className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                      <label className="text-sm font-medium text-right truncate" title={csvHeader}>{csvHeader || `Columna ${csvIndex + 1}`}</label>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <Select value={headerMap[csvIndex] || IGNORE_COLUMN_VALUE} onValueChange={(newDbColumn) => handleMappingChange(csvIndex, newDbColumn)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ignorar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE_COLUMN_VALUE}>Ignorar columna</SelectItem>
                          {tableColumns.map(col => (
                            <SelectItem key={col} value={col} disabled={usedDbColumns.has(col) && headerMap[csvIndex] !== col}>
                              {col} {col === primaryKey && ' (PK)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {/* Column 2 */}
              <div className="flex flex-col gap-y-4">
                {headers.slice(columnLength, columnLength * 2).map((csvHeader, index) => {
                  const csvIndex = index + columnLength;
                  return (
                    <div key={csvIndex} className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                      <label className="text-sm font-medium text-right truncate" title={csvHeader}>{csvHeader || `Columna ${csvIndex + 1}`}</label>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <Select value={headerMap[csvIndex] || IGNORE_COLUMN_VALUE} onValueChange={(newDbColumn) => handleMappingChange(csvIndex, newDbColumn)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ignorar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE_COLUMN_VALUE}>Ignorar columna</SelectItem>
                          {tableColumns.map(col => (
                            <SelectItem key={col} value={col} disabled={usedDbColumns.has(col) && headerMap[csvIndex] !== col}>
                              {col} {col === primaryKey && ' (PK)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
              {/* Column 3 */}
              <div className="flex flex-col gap-y-4">
                {headers.slice(columnLength * 2).map((csvHeader, index) => {
                  const csvIndex = index + columnLength * 2;
                  return (
                    <div key={csvIndex} className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                      <label className="text-sm font-medium text-right truncate" title={csvHeader}>{csvHeader || `Columna ${csvIndex + 1}`}</label>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <Select value={headerMap[csvIndex] || IGNORE_COLUMN_VALUE} onValueChange={(newDbColumn) => handleMappingChange(csvIndex, newDbColumn)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ignorar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={IGNORE_COLUMN_VALUE}>Ignorar columna</SelectItem>
                          {tableColumns.map(col => (
                            <SelectItem key={col} value={col} disabled={usedDbColumns.has(col) && headerMap[csvIndex] !== col}>
                              {col} {col === primaryKey && ' (PK)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartSync} size="lg">
              <Save className="mr-2 h-5 w-5" />
              Validar Mapeo e Iniciar Carga
            </Button>
          </CardFooter>
        </Card>
      )}

      {currentStep === 'syncing' && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 3: Cargando Datos...</CardTitle>
            <CardDescription>Se están insertando los registros en la base de datos. Por favor, no cierres esta ventana.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{Math.round(progress)}% completado</p>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      )}
      
      {currentStep === 'results' && syncSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Proceso Finalizado</CardTitle>
            <CardDescription>La carga de datos ha terminado. Aquí tienes el resumen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={syncSummary.errorCount > 0 ? "destructive" : "default"}>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Resumen de Carga</AlertTitle>
              <AlertDescription>
                <p><span className="font-bold">{syncSummary.successCount}</span> registros cargados correctamente.</p>
                <p><span className="font-bold">{syncSummary.errorCount}</span> registros no se pudieron cargar.</p>
              </AlertDescription>
            </Alert>
            {syncSummary.errorCount > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Detalle de Errores:</h3>
                <ScrollArea className="h-40 w-full rounded-md border p-4">
                  <div className="space-y-2 text-sm">
                    {syncSummary.errors.map((err, i) => (
                      <div key={i} className="p-2 bg-destructive/10 rounded-md">
                        <p className="font-semibold text-destructive">Error en Bloque #{err.block}:</p>
                        <p className="font-mono text-xs">{err.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
          <CardFooter>
             <Button variant="outline" onClick={() => resetAll(true)}>Cargar otro archivo</Button>
          </CardFooter>
        </Card>
      )}

    </div>
  );
}
