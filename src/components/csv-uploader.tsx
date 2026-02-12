'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, File as FileIcon, X, Loader2, Save, Search, Database, RefreshCcw, Undo2, CheckCircle, AlertTriangle, Map as MapIcon, Sheet as SheetIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';


const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
     catalogo_madre: { pk: 'sku', columns: ['sku', 'nombre_madre'] },
     categorias_madre: { pk: 'sku', columns: ['sku', 'categoria_madre', 'nombre_madre', 'landed_cost', 'tiempo_preparacion', 'piezas_por_sku', 'piezas_por_contenedor', 'bodega', 'bloque'] },
     gastos_diarios: { pk: 'id', columns: ['fecha', 'empresa', 'tipo_gasto', 'monto', 'capturista'] },
     publicaciones: { pk: 'sku', columns: ['sku', 'item_id', 'product_number', 'variation_id', 'title', 'status', 'nombre_madre', 'price', 'company', 'created_at'] },
     publicaciones_por_sku: { pk: 'sku', columns: ['sku', 'publicaciones'] },
     skus_unicos: { pk: 'sku', columns: ['sku', 'nombre_madre', 'tiempo_de_preparacion', 'landed_cost', 'de_recompra', 'proveedor', 'piezas_por_contenedor'] },
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
 
 function formatSupabaseError(error: any, record: CsvRowObject): string {
    const message = error.message || 'Error desconocido.';
    const details = error.details || '';
    const constraintMatch = message.match(/constraint "([^"]+)"/);
    const constraint = constraintMatch ? constraintMatch[1] : '';

    if (error.code === '23503' || message.includes('violates foreign key constraint')) {
        const detailMatch = details.match(/Key \((.+?)\)=\((.+?)\) is not present in table "(.+?)"\./);
        if (detailMatch) {
            const fkColumn = detailMatch[1].replace(/"/g, '');
            const fkValue = detailMatch[2];
            const parentTable = detailMatch[3].replace(/"/g, '');
            return `Error de Referencia: El valor '${fkValue}' para la columna '${fkColumn}' no existe en la tabla de referencia '${parentTable}'. Asegúrate de que este SKU/ID exista primero en la tabla principal.`;
        }
        return `Error de Referencia (Foreign Key): Un valor que intentas usar no existe en la tabla principal a la que está conectado.`;
    }

    if (message.includes('violates not-null constraint')) {
        const columnName = message.match(/column "([^"]+)"/)?.[1];
        return `Error de valor nulo: La columna '${columnName || 'desconocida'}' no puede estar vacía. Revisa tu archivo CSV.`;
    }

    if (error.code === '23505' || message.includes('duplicate key value violates unique constraint')) {
        const detailMatch = details.match(/Key \((.+?)\)=\((.+?)\) already exists\./);
        if (detailMatch) {
            const columnName = detailMatch[1].replace(/"/g, '');
            const duplicateValue = detailMatch[2];
            return `Conflicto de duplicado en la columna '${columnName}': El valor '${duplicateValue}' ya existe y debe ser único.`;
        }
        if (constraint) {
            const columnNameMatch = constraint.match(/_([^_]+)_key$/);
            const columnName = columnNameMatch ? columnNameMatch[1] : constraint.replace(`${record.table}_`, '').replace('_key', '');
            return `Conflicto de duplicado: Se violó la restricción de unicidad '${constraint}'.`;
        }
        return `Conflicto de duplicado: Un valor que debe ser único ya existe en la base de datos.`;
    }

    if (error.code === '42501' || message.includes('violates row-level security policy')) {
        return `Error de Permisos (RLS): La base de datos rechazó la escritura. Revisa las políticas de seguridad de la tabla.`;
    }
    
    return message;
}

const numericFields = [
  'costo', 'tiempo_preparacion', 'unidades', 'ingreso_productos', 
  'cargo_venta_impuestos', 'ingreso_envio', 'costo_envio', 'costo_medidas_peso', 
  'cargo_diferencia_peso', 'anulaciones_reembolsos', 'total', 'precio_unitario', 
  'unidades_envio', 'dinero_a_favor', 'unidades_reclamo', 'price',
  'landed_cost', 'piezas_por_sku', 'tiempo_produccion', 'publicaciones',
  'piezas_por_contenedor', 'monto'
];

const booleanFields = [
  'venta_publicidad',
  'revisado_por_ml',
];

const dateFields = [
  'fecha_venta', 'fecha_en_camino', 'fecha_entregado', 'fecha_revision', 'created_at', 'fecha_registro',
  'fecha_en_camino_envio', 'fecha_entregado_envio', 'fecha'
];


 function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') {
      return null;
    }
  
    const stringValue = String(value).trim();

    if (key === 'numero_venta' || key === 'sku' || key === 'item_id' || key === 'product_number' || key === 'variation_id' || key === 'publicacion_id') {
      return stringValue;
    }
    
    if (numericFields.includes(key)) {
      if (stringValue === '') return null;
      const num = parseFloat(stringValue.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? null : num;
    }
  
    if (booleanFields.includes(key)) {
      const v = stringValue.toLowerCase();
      return v === 'true' || v === '1' || v === 'verdadero' || v === 'si' || v === 'sí';
    }
  
    if (dateFields.includes(key)) {
        if (value instanceof Date) return value.toISOString();
    
        const strValue = String(value).trim();
        if (!strValue) return null;

        const spanishDateRegex = /(\d{1,2})\s+de\s+([a-zA-Z]+)\s+de\s+(\d{4})/;
        const spanishMatch = strValue.match(spanishDateRegex);
        if (spanishMatch) {
            const day = parseInt(spanishMatch[1], 10);
            const year = parseInt(spanishMatch[3], 10);
            const monthName = spanishMatch[2].toLowerCase();
            const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
            const month = monthNames.indexOf(monthName);
            if (month !== -1) {
                const date = new Date(Date.UTC(year, month, day));
                if (!isNaN(date.getTime())) return date.toISOString();
            }
        }
        
        const dateTimeRegex = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T]?(\d{1,2}):(\d{1,2}):?(\d{1,2})?)?/;
        const match = strValue.match(dateTimeRegex);
    
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            const hour = match[4] ? parseInt(match[4], 10) : 0;
            const minute = match[5] ? parseInt(match[5], 10) : 0;
            const second = match[6] ? parseInt(match[6], 10) : 0;
            
            if (year > 1900 && year < 3000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                 const potentialDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
                 if (!isNaN(potentialDate.getTime()) && potentialDate.getUTCMonth() === month - 1) {
                     return potentialDate.toISOString();
                 }
            }
        }

        const nativeDate = new Date(strValue);
        if (!isNaN(nativeDate.getTime())) {
            return nativeDate.toISOString();
        }
        
        return null;
    }
  
    return typeof value === 'string' ? value.trim() : value;
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

   const [insertPage, setInsertPage] = useState(1);
   const [updatePage, setUpdatePage] = useState(1);
   const [noChangePage, setNoChangePage] = useState(1);
   const PAGE_SIZE = 60;
   const [isClient, setIsClient] = useState(false);

    // New state for sheet selection
    const [workbook, setWorkbook] = useState<WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [isSheetSelectorOpen, setIsSheetSelectorOpen] = useState(false);
    const [selectedPreviewSheet, setSelectedPreviewSheet] = useState('');
    const [previewSheetData, setPreviewSheetData] = useState<{ headers: string[], rows: (string|number)[][] }>({ headers: [], rows: [] });

   useEffect(() => {
    setIsClient(true);
   }, []);
   
   useEffect(() => {
    setInsertPage(1);
    setUpdatePage(1);
    setNoChangePage(1);
   }, [analysisResult]);

   const isSupabaseConfigured = !!supabase;

   const resetAll = (keepFile = false) => {
     setCurrentStep('upload');
     if (!keepFile) {
       setFile(null);
       if (inputRef.current) inputRef.current.value = '';
     }
     setHeaders([]);
     setRawRows([]);
     setHeaderMap({});
     setSelectedTableName('');
     setTableColumns([]);
     setPrimaryKey('');
     setIsLoading(false);
     setProgress(0);
     setSyncSummary(null);
     setAnalysisResult(null);
     // Reset sheet selection state
     setWorkbook(null);
     setSheetNames([]);
     setIsSheetSelectorOpen(false);
     setSelectedPreviewSheet('');
     setPreviewSheetData({ headers: [], rows: [] });
   };

   const backToMapping = () => {
    setAnalysisResult(null);
    setSyncSummary(null);
    setCurrentStep('mapping');
    toast({
      title: 'Volviendo al Mapeo',
      description: 'Puedes ajustar el mapeo de columnas y volver a analizar.',
    });
  };

   const setProcessedData = (data: (string|number)[][]) => {
     const csvHeaders = (data[0] || []).map(h => String(h ?? '').trim());
     
     const dataRows = data.slice(1)
       .map(row => {
         const fullRow: string[] = [];
         for (let i = 0; i < csvHeaders.length; i++) {
             fullRow.push(String(row[i] ?? ''));
         }
         return fullRow;
       })
       .filter(row => row.some(cell => cell && cell.trim() !== ''));

     setHeaders(csvHeaders);
     setRawRows(dataRows);
     toast({ title: 'Archivo Procesado', description: `${dataRows.length} filas de datos encontradas.` });
   };

   const updatePreviewData = (sheetName: string, wb: WorkBook) => {
        const sheet = wb.Sheets[sheetName];
        const data: (string|number)[][] = XLSX.utils.sheet_to_aoa(sheet);
        const headers = (data[0] || []).map(h => String(h ?? ''));
        
        const rows = data.slice(1).map(row => {
            const fullRow: (string|number)[] = [];
            for (let i = 0; i < headers.length; i++) {
                fullRow.push(row[i] ?? "");
            }
            return fullRow;
        });

        setPreviewSheetData({ headers, rows });
   };

   const handlePreviewSheetChange = (sheetName: string) => {
        if (workbook) {
            setSelectedPreviewSheet(sheetName);
            updatePreviewData(sheetName, workbook);
        }
   };
    
   const handleConfirmSheet = () => {
        setProcessedData([previewSheetData.headers, ...previewSheetData.rows]);
        setIsSheetSelectorOpen(false);
        toast({ title: 'Hoja Seleccionada', description: `Se cargó la hoja "${selectedPreviewSheet}" con ${previewSheetData.rows.length} filas.` });
   };

   const processFile = (fileToProcess: File) => {
     resetAll();
     setFile(fileToProcess);
    
     const reader = new FileReader();

     if (fileToProcess.name.endsWith('.xlsx')) {
        reader.onload = (e) => {
            const data = e.target?.result;
            if (!data) return;
            try {
                const wb = XLSX.read(data, { type: 'array' });
                const sNames = wb.SheetNames;

                if (sNames.length > 1) {
                    setWorkbook(wb);
                    setSheetNames(sNames);
                    setSelectedPreviewSheet(sNames[0]);
                    updatePreviewData(sNames[0], wb);
                    setIsSheetSelectorOpen(true);
                } else {
                    const sheet = wb.Sheets[sNames[0]];
                    const sheetData = XLSX.utils.sheet_to_aoa(sheet);
                    setProcessedData(sheetData as (string|number)[][]);
                }
            } catch (error) {
                console.error("Error parsing XLSX file:", error);
                toast({ title: 'Error de Archivo', description: 'No se pudo procesar el archivo .xlsx.', variant: 'destructive' });
            }
        };
        reader.readAsArrayBuffer(fileToProcess);
     } else {
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
            
            const parseRow = (rowString: string): string[] => {
               if (!rowString) return [];
               const result: string[] = [];
               let currentCell = '';
               let inQuotes = false;
               for (let i = 0; i < rowString.length; i++) {
                   const char = rowString[i];
                   if (char === '"') {
                       if (inQuotes && i + 1 < rowString.length && rowString[i+1] === '"') {
                           currentCell += '"';
                           i++;
                       } else {
                           inQuotes = !inQuotes;
                       }
                   } else if (char === bestDelimiter && !inQuotes) {
                       result.push(currentCell);
                       currentCell = '';
                   } else {
                       currentCell += char;
                   }
               }
               result.push(currentCell);
               return result;
           };
            
           const allData = lines.map(line => parseRow(line));
           setProcessedData(allData);
        };
        reader.readAsText(fileToProcess, 'windows-1252');
     }
   };

   const handleTableSelect = (tableName: string) => {
     if (!tableName) {
       setSelectedTableName('');
       setTableColumns([]);
       setPrimaryKey('');
       setHeaderMap({});
       setCurrentStep('upload');
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
     const usedDbColumns = new Set<string>();

     csvHeaders.forEach((csvHeader, index) => {
       if (!csvHeader) return;
       const normalizedCsvHeader = normalize(csvHeader);
      
       let match = dbCols.find(dbCol => normalize(dbCol) === normalizedCsvHeader);
      
       if (match && !usedDbColumns.has(match)) {
         map[index] = match;
         usedDbColumns.add(match);
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
     if (!pkMapped && selectedTableName !== 'gastos_diarios') { // For gastos_diarios, ID is auto-gen, so PK might not be in CSV
         toast({ title: 'Validación Fallida', description: `La clave primaria '${primaryKey}' debe estar mapeada para continuar.`, variant: 'destructive' });
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
         });

         const csvPkValues = mappedCsvData.map(row => row[primaryKey]).filter(Boolean);
         
         if (selectedTableName === 'gastos_diarios') {
            const result: AnalysisResult = { toInsert: mappedCsvData, toUpdate: [], noChange: [] };
            setAnalysisResult(result);
            setCurrentStep('results');
            toast({
                title: 'Análisis Completo',
                description: `Se encontraron ${result.toInsert.length} registros nuevos para 'gastos_diarios'.`
            });
            setIsLoading(false);
            setLoadingMessage('');
            return;
         }


        const CHUNK_SIZE = 500;
        let existingData: CsvRowObject[] = [];

        if (csvPkValues.length > 0) {
            for (let i = 0; i < csvPkValues.length; i += CHUNK_SIZE) {
                const chunk = csvPkValues.slice(i, i + CHUNK_SIZE);
                const { data: chunkData, error } = await supabase
                    .from(selectedTableName)
                    .select('*')
                    .in(primaryKey, chunk);

                if (error) {
                    if (error.message.includes('Request URL too long')) {
                        throw new Error('El archivo CSV es demasiado grande para analizarlo de una vez. Intenta con un archivo más pequeño.');
                    }
                    throw error;
                }
                if (chunkData) {
                    existingData = existingData.concat(chunkData);
                }
            }
        }
        
         const existingDataMap = new Map(existingData.map((row: CsvRowObject) => [String(row[primaryKey]), row]));
        
         const result: AnalysisResult = { toInsert: [], toUpdate: [], noChange: [] };
         
         const canonicalize = (record: CsvRowObject) => {
            const canonicalRecord: Record<string, any> = {};
            for (const key in record) {
                canonicalRecord[key] = parseValue(key, record[key]);
            }
            return canonicalRecord;
        };

         for (const csvRow of mappedCsvData) {
             const pkValue = String(csvRow[primaryKey]);
             if (!pkValue || pkValue === 'undefined') {
                if (Object.values(csvRow).some(v => v !== null && v !== undefined && String(v).trim() !== '')) {
                  result.toInsert.push(csvRow);
                }
                continue;
             };

             if (existingDataMap.has(pkValue)) {
                 const dbRow = existingDataMap.get(pkValue)!;
                 const canonicalCsv = canonicalize(csvRow);
                 const canonicalDb = canonicalize(dbRow);
                 
                 const diff: Record<string, {old: any, new: any}> = {};
                 let hasChanged = false;

                 for (const key in canonicalCsv) {
                    if (key !== primaryKey && key in canonicalDb) {
                        const csvValue = canonicalCsv[key];
                        const dbValue = canonicalDb[key];
                        
                        let areEqual = false;
                        if (csvValue === null && dbValue === null) {
                            areEqual = true;
                        } else if (dateFields.includes(key) && csvValue && dbValue) {
                            const d1 = new Date(csvValue).setUTCHours(0,0,0,0);
                            const d2 = new Date(dbValue).setUTCHours(0,0,0,0);
                            areEqual = d1 === d2;
                        } else if (typeof csvValue === 'number' && typeof dbValue === 'number') {
                            areEqual = Math.abs(csvValue - dbValue) < 0.001;
                        } else {
                            areEqual = String(csvValue ?? '') === String(dbValue ?? '');
                        }

                        if (!areEqual) {
                           hasChanged = true;
                           diff[key] = { old: dbRow[key], new: csvRow[key] };
                        }
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
           description: `Se encontraron ${result.toInsert.length} registros nuevos, ${result.toUpdate.length} para actualizar, y ${result.noChange.length} sin cambios.`
         });

     } catch (e: any) {
         console.error("Analysis error:", e);
         toast({ title: 'Error en el Análisis', description: e.message, variant: 'destructive' });
         setCurrentStep('mapping');
     } finally {
         setIsLoading(false);
         setLoadingMessage('');
     }
   };

   const handleSyncData = async (syncType: 'insert' | 'update' | 'all') => {
       if (!analysisResult) return;
       if (!supabase) {
         toast({ title: 'Error de Configuración', description: 'El cliente de Supabase no está disponible.', variant: 'destructive' });
         return;
       }
      
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
      
       if (selectedTableName === 'ventas') {
           dataToInsert = dataToInsert.filter(record => record.fecha_venta != null && String(record.fecha_venta).trim() !== '');
           dataToUpdate = dataToUpdate.filter(record => record.fecha_venta != null && String(record.fecha_venta).trim() !== '');
       }
       if (selectedTableName === 'catalogo_madre') {
           dataToInsert = dataToInsert.filter(record => record.nombre_madre != null && String(record.nombre_madre).trim() !== '');
           dataToUpdate = dataToUpdate.filter(record => record.nombre_madre != null && String(record.nombre_madre).trim() !== '');
       }
       if (selectedTableName === 'publicaciones') {
          dataToInsert = dataToInsert.filter(record => record.company != null && String(record.company).trim() !== '');
          dataToUpdate = dataToUpdate.filter(record => record.company != null && String(record.company).trim() !== '');
       }

       let allData = [...dataToInsert, ...dataToUpdate];

       const CHUNK_SIZE = 100;
       const totalChunks = Math.ceil(allData.length / CHUNK_SIZE);
       
        for (let i = 0; i < totalChunks; i++) {
            const chunk = allData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            if (chunk.length === 0) continue;

            const recordsToProcess = chunk.map((unparsedRecord: CsvRowObject) => {
              const parsedRecord: Record<string, any> = {};
              Object.keys(unparsedRecord).forEach(key => {
                parsedRecord[key] = parseValue(key, unparsedRecord[key]);
              });
              
              const isInsert = dataToInsert.some(ins => (ins[primaryKey] && String(ins[primaryKey]) === String(parsedRecord[primaryKey])) || ins === unparsedRecord);

              if(isInsert && selectedTableName === 'gastos_diarios'){
                delete parsedRecord.id;
              }
              return parsedRecord;
            });
            
            const successfulRecords: CsvRowObject[] = [];
            const errors: any[] = [];

            for (const record of recordsToProcess) {
              const isUpdate = dataToUpdate.some(u => String(u[primaryKey]) === String(record[primaryKey]));
              const query = supabase.from(selectedTableName);

              const { data: resultData, error } = await (isUpdate
                  ? query.upsert(record as any, { onConflict: primaryKey }).select()
                  : query.insert(record as any).select()
              );

              if (error) {
                  errors.push({
                      recordIdentifier: record[primaryKey],
                      message: formatSupabaseError(error, record),
                  });
              } else if (!resultData || resultData.length === 0) {
                  errors.push({
                      recordIdentifier: record[primaryKey],
                      message: "Operación bloqueada por la base de datos (posiblemente por políticas de seguridad RLS). El registro no se guardó.",
                  });
              } else {
                  successfulRecords.push(resultData[0]);
              }
            }


            if (successfulRecords) {
                const insertedChunk = successfulRecords.filter((r: any) => dataToInsert.some(i => (i[primaryKey] && String(i[primaryKey]) === String(r[primaryKey])) || (i === r) ) );
                const updatedChunk = successfulRecords.filter((r: any) => dataToUpdate.some(u => String(u[primaryKey]) === String(r[primaryKey])));
                
                finalSummary.inserted += insertedChunk.length;
                finalSummary.updated += updatedChunk.length;
                
                finalSummary.insertedRecords.push(...(insertedChunk as CsvRowObject[]));
                finalSummary.updatedRecords.push(...(updatedChunk as CsvRowObject[]));
            }

            if (errors) {
                errors.forEach((e: any) => {
                    const isInsertError = dataToInsert.some((r) => String(r[primaryKey]) === String(e.recordIdentifier));
                    finalSummary.errors.push({
                        block: i + 1,
                        recordIdentifier: e.recordIdentifier,
                        message: e.message,
                        type: isInsertError ? 'insert' : 'update'
                    });
                });
            }


            setProgress(((i + 1) / totalChunks) * 100);
        }
      
       finalSummary.log = `Sincronización completada el ${new Date().toLocaleString()}. Nuevos: ${finalSummary.inserted}, Actualizados: ${finalSummary.updated}, Errores: ${finalSummary.errors.length}.`;
       setSyncSummary(finalSummary);
       setCurrentStep('results');
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
                     <CardDescription>Sube tu archivo CSV o XLSX y elige la tabla de Supabase donde quieres cargar los datos.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     {!file ? (
                       <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-secondary/50 border-border hover:bg-secondary hover:border-primary transition-colors col-span-2" onClick={() => inputRef.current?.click()}>
                         <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                         <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Haz clic para cargar</span> o arrastra y suelta</p>
                         <p className="text-xs text-muted-foreground">Soportado: .csv, .tsv, .xlsx</p>
                         <input ref={inputRef} type="file" accept=".csv,.tsv,.xlsx" className="hidden" onChange={(e) => e.target.files && processFile(e.target.files[0])} />
                       </div>
                     ) : (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                         <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/50">
                           <div className="flex items-center gap-3 min-w-0">
                             <FileIcon className="w-6 h-6 text-foreground flex-shrink-0" />
                             <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                           </div>
                           <Button variant="ghost" size="icon" onClick={() => resetAll(false)}><X className="w-4 h-4" /></Button>
                         </div>
                         <div className="space-y-2">
                            {sheetNames.length > 1 && rawRows.length === 0 && (
                               <Button variant="outline" className="w-full" onClick={() => setIsSheetSelectorOpen(true)}>
                                   <SheetIcon className="mr-2 h-4 w-4" />
                                   Seleccionar Hoja ({sheetNames.length})
                               </Button>
                            )}
                           <Select onValueChange={handleTableSelect} value={selectedTableName} disabled={!isSupabaseConfigured || isLoading || (rawRows.length === 0 && sheetNames.length > 0 && !workbook)}>
                             <SelectTrigger className="w-full">
                               <SelectValue placeholder={
                                   !isSupabaseConfigured ? "Configuración de Supabase incompleta" :
                                   rawRows.length === 0 && sheetNames.length > 1 ? "Primero selecciona una hoja" :
                                   "Selecciona una tabla de destino..."
                               } />
                             </SelectTrigger>
                             <SelectContent>
                               {Object.keys(TABLE_SCHEMAS).sort().map(tableName => (
                                 <SelectItem key={tableName} value={tableName}>{tableName}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           {!isSupabaseConfigured && <Alert variant="destructive"><AlertDescription>La conexión con la DB no está configurada.</AlertDescription></Alert>}
                         </div>
                       </div>
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
                               <TableHead>Columna en Archivo</TableHead>
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
             return (
                 <Card>
                   <CardHeader>
                    <CardTitle>Analizando Datos...</CardTitle>
                    <CardDescription>{loadingMessage}</CardDescription>
                   </CardHeader>
                   <CardContent className="flex flex-col items-center gap-4 pt-4">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <p className="text-sm text-muted-foreground">Por favor, espera.</p>
                   </CardContent>
                 </Card>
             );
         case 'syncing':
             return (
                 <Card>
                   <CardHeader>
                    <CardTitle>Sincronizando Datos...</CardTitle>
                    <CardDescription>{loadingMessage}</CardDescription>
                   </CardHeader>
                   <CardContent className="flex flex-col items-center gap-4 pt-4">
                     <Progress value={progress} className="w-full" />
                     <p className="text-sm text-muted-foreground">{`${Math.round(progress)}% completado`}</p>
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
                         <div className="flex gap-2">
                           <Button variant="outline" onClick={backToMapping}>
                             <MapIcon className="mr-2 h-4 w-4" />
                             Volver al Mapeo
                           </Button>
                           <Button variant="outline" onClick={() => resetAll(false)}>
                             <Undo2 className="mr-2 h-4 w-4" />
                             Empezar de Nuevo
                           </Button>
                         </div>
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
                const totalInsertPages = Math.ceil(analysisResult.toInsert.length / PAGE_SIZE);
                const paginatedInserts = analysisResult.toInsert.slice(
                    (insertPage - 1) * PAGE_SIZE,
                    insertPage * PAGE_SIZE
                );
        
                const totalUpdatePages = Math.ceil(analysisResult.toUpdate.length / PAGE_SIZE);
                const paginatedUpdates = analysisResult.toUpdate.slice(
                    (updatePage - 1) * PAGE_SIZE,
                    updatePage * PAGE_SIZE
                );
        
                const totalNoChangePages = Math.ceil(analysisResult.noChange.length / PAGE_SIZE);
                const paginatedNoChanges = analysisResult.noChange.slice(
                    (noChangePage - 1) * PAGE_SIZE,
                    noChangePage * PAGE_SIZE
                );

               return (
                   <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                         <CardTitle>Paso 3: Resultados del Análisis</CardTitle>
                         <CardDescription>Revisa los cambios detectados y elige qué acción sincronizar con la base de datos.</CardDescription>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" onClick={backToMapping}>
                             <MapIcon className="mr-2 h-4 w-4" />
                             Volver al Mapeo
                           </Button>
                           <Button variant="outline" onClick={() => resetAll(false)}>
                              <Undo2 className="mr-2 h-4 w-4" />
                              Empezar de Nuevo
                           </Button>
                        </div>
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
                                <Table><TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{paginatedInserts.map((row, i) => <TableRow key={`insert-${i}`}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}</TableRow>)}</TableBody></Table>
                            </div>
                             {totalInsertPages > 1 && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <span className="text-sm text-muted-foreground">
                                        Página {insertPage} de {totalInsertPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setInsertPage(p => Math.max(1, p - 1))}
                                        disabled={insertPage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setInsertPage(p => Math.min(totalInsertPages, p + 1))}
                                        disabled={insertPage === totalInsertPages}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            )}
                         </TabsContent>
                         <TabsContent value="toUpdate">
                            <div className="relative w-full overflow-auto h-96 border rounded-md">
                                <Table><TableHeader><TableRow><TableHead>Campo</TableHead><TableHead>Valor Anterior</TableHead><TableHead>Valor Nuevo</TableHead></TableRow></TableHeader><TableBody>{paginatedUpdates.map((item, i) => <React.Fragment key={i}>{Object.entries(item.diff).map(([key, values]) => <TableRow key={`${i}-${key}`}><TableCell className="font-medium">{key}</TableCell><TableCell className="text-destructive">{String(values.old ?? 'N/A')}</TableCell><TableCell className="text-green-600">{String(values.new ?? 'N/A')}</TableCell></TableRow>)}</React.Fragment>)}</TableBody></Table>
                            </div>
                            {totalUpdatePages > 1 && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <span className="text-sm text-muted-foreground">
                                        Página {updatePage} de {totalUpdatePages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUpdatePage(p => Math.max(1, p - 1))}
                                        disabled={updatePage === 1}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setUpdatePage(p => Math.min(totalUpdatePages, p + 1))}
                                        disabled={updatePage === totalUpdatePages}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            )}
                         </TabsContent>
                         <TabsContent value="noChange">
                            <div className="relative w-full overflow-auto h-96 border rounded-md">
                                <Table><TableHeader><TableRow>{allMappedHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{paginatedNoChanges.map((row, i) => <TableRow key={`nochange-${i}`}>{allMappedHeaders.map(h => <TableCell key={h}>{String(row[h] ?? '')}</TableCell>)}</TableRow>)}</TableBody></Table>
                           </div>
                           {totalNoChangePages > 1 && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                   <span className="text-sm text-muted-foreground">
                                       Página {noChangePage} de {totalNoChangePages}
                                   </span>
                                   <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => setNoChangePage(p => Math.max(1, p - 1))}
                                       disabled={noChangePage === 1}
                                   >
                                       Anterior
                                   </Button>
                                   <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => setNoChangePage(p => Math.min(totalNoChangePages, p + 1))}
                                       disabled={noChangePage === totalNoChangePages}
                                   >
                                       Siguiente
                                   </Button>
                               </div>
                           )}
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

   if (!isClient) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
   }


   return (
     <div className="w-full max-w-7xl mx-auto space-y-6">
       {renderStep()}

        <Dialog open={isSheetSelectorOpen} onOpenChange={setIsSheetSelectorOpen}>
            <DialogContent className="max-w-4xl h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Seleccionar Hoja de Cálculo</DialogTitle>
                    <DialogDescription>
                        Tu archivo tiene múltiples hojas. Elige la que quieres importar y previsualiza los datos.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 flex-1 min-h-0">
                    <Select value={selectedPreviewSheet} onValueChange={handlePreviewSheetChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona una hoja" />
                        </SelectTrigger>
                        <SelectContent>
                            {sheetNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="relative w-full overflow-auto flex-1 border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                                <TableRow>
                                    {previewSheetData.headers.map((h, i) => <TableHead key={`${h}-${i}`}>{h}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewSheetData.rows.slice(0, 100).map((row, i) => (
                                    <TableRow key={`row-${i}`}>
                                        {previewSheetData.headers.map((_h, j) => (
                                            <TableCell key={`cell-${i}-${j}`}>{String(row[j] ?? '')}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <p className="text-xs text-muted-foreground">Mostrando las primeras 100 filas como previsualización.</p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSheetSelectorOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmSheet}>Confirmar y Usar esta Hoja</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

     </div>
   );
 }
