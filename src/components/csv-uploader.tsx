'use client';

import React, { useState, useMemo } from 'react';
import { 
  UploadCloud, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers, ArrowRight, Eye, AlertTriangle,
  Save, X, ArrowRightLeft, FileText, Info, PlusCircle, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const TABLE_SCHEMAS: Record<string, { pk: string; columns: string[] }> = {
    ml_sales: { 
        pk: 'num_venta', 
        columns: [
            'num_venta', 'fecha_venta', 'status', 'desc_status', 'paquete_varios', 
            'pertenece_kit', 'unidades', 'ing_xunidad', 'cargo_venta', 'ing_xenvio', 
            'costo_envio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'total', 
            'venta_xpublicidad', 'sku', 'num_publi', 'tienda', 'tit_pub', 'variante', 
            'price', 'tip_publi', 'factura_a', 'datos_poe', 'tipo_ndoc', 'direccion', 
            't_contribuyente', 'cfdi', 't_usuario', 'r_fiscal', 'comprador', 'negocio', 
            'ife', 'domicilio', 'mun_alcaldia', 'estado', 'c_postal', 'pais', 'f_entrega', 
            'f_camino', 'f_entregado', 'transportista', 'num_seguimiento', 'url_seguimiento', 
            'unidades_2', 'f_entrega2', 'f_camino2', 'f_entregado2', 'transportista2', 
            'num_seguimiento2', 'url_seguimiento2', 'revisado_xml', 'f_revision3', 
            'd_afavor', 'resultado', 'destino', 'motivo_resul', 'unidades_3', 
            'r_abierto', 'r_cerrado', 'c_mediacion'
        ] 
    },
    gastos_diarios: { 
        pk: 'id', 
        columns: [
            'id', 'fecha', 'empresa', 'tipo_transaccion', 'tipo_gasto_impacto', 
            'area_funcional', 'categoria_macro', 'subcategoria_especifica', 
            'canal_asociado', 'clasificacion_operativa', 'es_fijo', 
            'es_recurrente', 'monto', 'metodo_pago', 'banco', 'cuenta', 
            'responsable', 'descripcion', 'notas'
        ] 
    },
    sku_m: { 
        pk: 'sku_mdr', 
        columns: ['sku_mdr', 'cat_mdr', 'piezas_por_sku', 'sku', 'piezas_xcontenedor', 'bodega', 'bloque', 'landed_cost'] 
    },
    sku_costos: { 
        pk: 'id', 
        columns: ['id', 'sku_mdr', 'landed_cost', 'fecha_desde', 'proveedor', 'piezas_xcontenedor', 'sku', 'esti_time'] 
    },
    sku_alterno: {
        pk: 'sku',
        columns: ['sku', 'sku_mdr']
    },
    publi_tienda: { 
        pk: 'num_publi', 
        columns: ['num_publi', 'sku', 'num_producto', 'titulo', 'status', 'cat_mdr', 'costo', 'tienda'] 
    },
    publi_xsku: { 
        pk: 'sku', 
        columns: ['sku', 'num_publicaciones'] 
    },
};

const COLUMN_ALIASES: Record<string, Record<string, string>> = {
    sku_m: {
        'nombre_madre': 'sku_mdr',
        'Categoria_madre': 'cat_mdr',
        'piezas_por_contenedor': 'piezas_xcontenedor',
        'sku': 'sku',
        'landed_cost': 'landed_cost',
        'piezas_por_sku': 'piezas_por_sku',
        'bodega': 'bodega',
        'bloque': 'bloque'
    },
    ml_sales: {
        '# de venta:': 'num_venta',
        'Fecha de venta:': 'fecha_venta',
        'Estado Venta': 'status',
        'Descripción del estado': 'desc_status',
        'Paquete de varios productos': 'paquete_varios',
        'Pertenece a un kit': 'pertenece_kit',
        'Unidades': 'unidades',
        'Ingresos por productos (MXN)': 'ing_xunidad',
        'Cargo por venta e impuestos (MXN)': 'cargo_venta',
        'Ingresos por envío (MXN)': 'ing_xenvio',
        'Costos de envío (MXN)': 'costo_envio',
        'Costo de envío basado en medidas y peso declarados': 'costo_enviomp',
        'Cargo por diferencias en medidas y peso del paquete': 'cargo_difpeso',
        'Anulaciones y reembolsos (MXN)': 'anu_reembolsos',
        'Total (MXN)': 'total',
        'Venta por publicidad': 'venta_xpublicidad',
        'SKU': 'sku',
        '# de publicación': 'num_publi',
        'Tienda oficial': 'tienda',
        'Título de la publicación': 'tit_pub',
        'Variante': 'variante',
        'Precio unitario de venta de la publicación (MXN)': 'price',
        'Tipo de publicación': 'tip_publi',
        'Factura adjunta': 'factura_a',
        'Datos personales o de empresa': 'datos_poe',
        'Tipo y número de documento': 'tipo_ndoc',
        'Dirección': 'direccion',
        'Tipo de contribuyente': 't_contribuyente',
        'CFDI': 'cfdi',
        'Tipo de usuario': 't_usuario',
        'Régimen Fiscal': 'r_fiscal',
        'Comprador': 'comprador',
        'Negocio': 'negocio',
        'IFE': 'ife',
        'Domicilio': 'domicilio',
        'Municipio/Alcaldía': 'mun_alcaldia',
        'Estado Geografico': 'estado',
        'Código postal': 'c_postal',
        'País': 'pais',
        'Forma de entrega': 'f_entrega',
        'Fecha en camino': 'f_camino',
        'Fecha entregado': 'f_entregado',
        'Transportista': 'transportista',
        'Número de seguimiento': 'num_seguimiento',
        'URL de seguimiento': 'url_seguimiento',
        'Unidades ': 'unidades_2',
        'Forma de entrega ': 'f_entrega2',
        'Fecha en camino ': 'f_camino2',
        'Fecha entregado ': 'f_entregado2',
        'Transportista ': 'transportista2',
        'Número de seguimiento ': 'num_seguimiento2',
        'URL de seguimiento ': 'url_seguimiento2',
        'Revisado por Mercado Libre': 'revisado_xml',
        'Fecha de revisión': 'f_revision3',
        'Dinero a favor': 'd_afavor',
        'Resultado': 'resultado',
        'Destino': 'destino',
        'Motivo del resultado': 'motivo_resul',
        'Unidades  ': 'unidades_3',
        'Reclamo abierto': 'r_abierto',
        'Reclamo cerrado': 'r_cerrado',
        'Con mediación': 'c_mediacion'
    }
};

const NUMERIC_FIELDS = [
    'monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 
    'piezas_por_sku', 'num_publicaciones', 'piezas_totales', 'esti_time', 
    'piezas_xcontenedor', 'bloque', 'costo', 'ing_xunidad', 'cargo_venta',
    'ing_xenvio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'unidades_2', 'unidades_3'
];

const MONTHS_ES: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function parseMLDate(str: string): string | null {
    if (!str || typeof str !== 'string') return null;
    const cleanStr = str.toLowerCase().trim();
    
    const fullMatch = cleanStr.match(/(\d{1,2})\s+de\s+([a-zñáéíóú]+)\s+de\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (fullMatch) {
        const [_, day, monthStr, year, hour, min] = fullMatch;
        const month = MONTHS_ES[monthStr];
        if (month !== undefined) {
            const date = new Date(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(min));
            return isNaN(date.getTime()) ? null : date.toISOString();
        }
    }

    const shortMatch = cleanStr.match(/(\d{1,2})\s+de\s+([a-zñáéíóú]+)\s*\|\s*(\d{1,2}):(\d{2})/);
    if (shortMatch) {
        const [_, day, monthStr, hour, min] = shortMatch;
        const month = MONTHS_ES[monthStr];
        if (month !== undefined) {
            const year = new Date().getFullYear();
            const date = new Date(year, month, parseInt(day), parseInt(hour), parseInt(min));
            return isNaN(date.getTime()) ? null : date.toISOString();
        }
    }

    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

function parseValue(key: string, value: any, tableName: string): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    if (tableName === 'ml_sales') {
        const dateFields = [
            'fecha_venta', 'f_entrega', 'f_camino', 'f_entregado', 
            'f_entrega2', 'f_camino2', 'f_entregado2', 'f_revision3'
        ];
        if (dateFields.includes(key)) {
            return parseMLDate(str);
        }
    }

    if (NUMERIC_FIELDS.includes(key)) {
        const num = parseFloat(str.replace(/[$\s]/g, '').replace(/,/g, '').replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;
    }

    const booleanFields = [
        'negocio', 'venta_xpublicidad', 'paquete_varios', 'pertenece_kit', 
        'r_abierto', 'r_cerrado', 'c_mediacion', 'es_fijo', 'es_recurrente'
    ];
    if (booleanFields.includes(key)) {
        const v = str.toLowerCase();
        return ['true', '1', 'si', 'sí', 'verdadero', 'yes'].includes(v);
    }

    return str;
}

function formatErrorDescription(msg: string): string {
    if (msg.includes('ON CONFLICT DO UPDATE command cannot affect row a second time')) {
        return 'Conflicto de redundancia: El archivo contiene múltiples registros con el mismo identificador para actualizar en el mismo lote. Por favor, limpia duplicados en tu archivo.';
    }
    if (msg.includes('duplicate key value violates unique constraint')) {
        return 'Violación de Clave Única: Ya existe un registro con este identificador principal en la base de datos y no se puede duplicar.';
    }
    if (msg.includes('violates foreign key constraint')) {
        return 'Error de Referencia: El registro intenta vincularse a un dato que no existe en las tablas maestras.';
    }
    if (msg.includes('null value in column')) {
        return 'Valor Nulo Prohibido: Falta un dato obligatorio requerido por la base de datos.';
    }
    return `Error técnico: ${msg}`;
}

type Step = 'upload' | 'converting' | 'sheet-selection' | 'table-selection' | 'mapping' | 'analyzing' | 'preview' | 'syncing' | 'results';

export default function CsvUploader() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [conversionProgress, setConversionProgress] = useState(0);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [headerMap, setHeaderMap] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncCount, setSyncCount] = useState(0);
    const [totalToSync, setTotalToSync] = useState(0);

    const [categorizedData, setCategorizedData] = useState<{
        new: any[],
        update: { record: any, original: any }[],
        unchanged: any[]
    }>({ new: [], update: [], unchanged: [] });

    const [syncResult, setSyncResult] = useState<{
        inserted: any[], 
        updated: any[], 
        unchanged: any[],
        errors: { batch: number, msg: string }[]
    } | null>(null);

    const handleTableSelect = (table: string) => {
        setSelectedTable(table);
        setIsLoading(true);

        if (!selectedFile) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            
            if (selectedFile.name.toLowerCase().endsWith('.csv')) {
                const csvText = new TextDecoder().decode(data);
                let estadoCount = 0; 
                
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (header) => {
                        const trimmedHeader = header.trim();
                        if (table === 'ml_sales' && trimmedHeader === 'Estado') {
                            estadoCount++;
                            if (estadoCount === 1) return 'Estado Venta';
                            if (estadoCount === 2) return 'Estado Geografico';
                        }
                        return trimmedHeader;
                    },
                    beforeFirstChunk: (chunk) => {
                        if (table === 'ml_sales') {
                            const lines = chunk.split(/\r?\n/);
                            return lines.slice(5).join('\n');
                        }
                        return chunk;
                    },
                    complete: (results) => {
                        const parsedData = results.data as any[];
                        if (parsedData.length > 0) {
                            const h = Object.keys(parsedData[0]);
                            const rows = parsedData.map(obj => h.map(key => obj[key]));
                            setHeaders(h);
                            setRawRows(rows);
                            setupMapping(table, h, rows);
                        }
                        setIsLoading(false);
                    }
                });
            } else {
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[selectedSheet || wb.SheetNames[0]];
                const range = table === 'ml_sales' ? 5 : 0;
                const json = XLSX.utils.sheet_to_json(ws, { header: 1, range, defval: null }) as any[][];
                const validRows = json.filter(row => row.some(cell => cell !== null && cell !== ''));
                
                if (validRows.length > 0) {
                    let estadoCountExcel = 0; 
                    const h = validRows[0].map(val => {
                        const headerName = String(val || '').trim();
                        if (table === 'ml_sales' && headerName === 'Estado') {
                            estadoCountExcel++;
                            if (estadoCountExcel === 1) return 'Estado Venta';
                            if (estadoCountExcel === 2) return 'Estado Geografico';
                        }
                        return headerName;
                    });
                    const rows = validRows.slice(1);
                    setHeaders(h);
                    setRawRows(rows);
                    setupMapping(table, h, rows);
                }
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const setupMapping = (table: string, currentHeaders: string[], rows: any[][]) => {
        const schema = TABLE_SCHEMAS[table];
        const aliases = COLUMN_ALIASES[table] || {};
        const map: Record<number, string> = {};
        const usedColumns = new Set<string>();

        currentHeaders.forEach((h, i) => {
            const hRaw = String(h || '');
            const hClean = hRaw.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            const hUnder = hRaw.toLowerCase().replace(/\s+/g, '_');

            let match = schema.columns.find(c => {
                if (usedColumns.has(c)) return false;
                return Object.entries(aliases).some(([aliasHeader, dbCol]) => {
                    const aliasClean = aliasHeader.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    return dbCol === c && (aliasClean === hClean || aliasHeader === hRaw);
                });
            });

            if (!match) {
                match = schema.columns.find(c => {
                    if (usedColumns.has(c)) return false;
                    const cClean = c.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                    return cClean === hClean || c === hUnder;
                });
            }

            if (match) {
                map[i] = match;
                usedColumns.add(match);
            } else {
                map[i] = IGNORE_COLUMN_VALUE;
            }
        });

        setHeaderMap(map);
        setCurrentStep('mapping');
    };

    const usedDbColumns = useMemo(() => {
        return new Set(Object.values(headerMap).filter(v => v !== IGNORE_COLUMN_VALUE));
    }, [headerMap]);

    const activeDbColumns = useMemo(() => {
        if (!selectedTable) return [];
        return TABLE_SCHEMAS[selectedTable].columns.filter(c => usedDbColumns.has(c));
    }, [selectedTable, usedDbColumns]);

    const performAnalysis = async () => {
        setIsLoading(true);
        setCurrentStep('analyzing');
        const schema = TABLE_SCHEMAS[selectedTable];
        
        try {
            const uniqueRecordsMap = new Map<string, any>();
            rawRows.forEach(row => {
                const obj: any = {};
                headers.forEach((_, headerIndex) => {
                    const colName = headerMap[headerIndex];
                    if (colName && colName !== IGNORE_COLUMN_VALUE) {
                        obj[colName] = parseValue(colName, row[headerIndex], selectedTable);
                    }
                });
                const pkValue = String(obj[schema.pk] || '');
                if (pkValue) uniqueRecordsMap.set(pkValue, obj);
            });

            const allRecords = Array.from(uniqueRecordsMap.values());
            const pks = allRecords.map(r => String(r[schema.pk])).filter(Boolean);
            const existingDataMap = new Map<string, any>();
            
            if (supabase && pks.length > 0) {
                const FETCH_BATCH_SIZE = 500;
                for (let i = 0; i < pks.length; i += FETCH_BATCH_SIZE) {
                    const pkBatch = pks.slice(i, i + FETCH_BATCH_SIZE);
                    const { data } = await supabase.from(selectedTable).select('*').in(schema.pk, pkBatch);
                    data?.forEach(row => existingDataMap.set(String(row[schema.pk]), row));
                }
            }

            const newRecs: any[] = [];
            const updateRecs: { record: any, original: any }[] = [];
            const unchangedRecs: any[] = [];

            allRecords.forEach(record => {
                const pkValue = String(record[schema.pk]);
                const existing = existingDataMap.get(pkValue);

                if (!existing) {
                    newRecs.push(record);
                } else {
                    let isDifferent = false;
                    for (const col of activeDbColumns) {
                        const newVal = record[col];
                        const oldVal = existing[col];
                        const isNumeric = NUMERIC_FIELDS.includes(col);
                        if (isNumeric) {
                            const nNew = newVal === null ? 0 : Number(newVal);
                            const nOld = oldVal === null ? 0 : Number(oldVal);
                            if (Math.abs(nNew - nOld) > 0.0001) { isDifferent = true; break; }
                        } else {
                            if (String(newVal ?? '').trim() !== String(oldVal ?? '').trim()) { isDifferent = true; break; }
                        }
                    }
                    if (isDifferent) updateRecs.push({ record, original: existing });
                    else unchangedRecs.push(record);
                }
            });

            setCategorizedData({ new: newRecs, update: updateRecs, unchanged: unchangedRecs });
            setCurrentStep('preview');
        } catch (e: any) {
            toast({ title: 'Error de análisis', description: e.message, variant: 'destructive' });
            setCurrentStep('mapping');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async (mode: 'new' | 'update' | 'all') => {
        setIsLoading(true);
        setCurrentStep('syncing');
        const schema = TABLE_SCHEMAS[selectedTable];
        
        let recordsToProcess: any[] = [];
        if (mode === 'new') recordsToProcess = categorizedData.new;
        else if (mode === 'update') recordsToProcess = categorizedData.update.map(u => u.record);
        else recordsToProcess = [...categorizedData.new, ...categorizedData.update.map(u => u.record)];

        const total = recordsToProcess.length;
        setTotalToSync(total);
        setSyncCount(0);
        setSyncProgress(0);

        const inserted: any[] = [];
        const updated: any[] = [];
        const unchanged: any[] = [...categorizedData.unchanged];
        const errors: { batch: number, msg: string }[] = [];

        if (supabase && total > 0) {
            const SYNC_BATCH_SIZE = 50;
            for (let i = 0; i < total; i += SYNC_BATCH_SIZE) {
                const batch = recordsToProcess.slice(i, i + SYNC_BATCH_SIZE);
                const { error } = await supabase.from(selectedTable).upsert(batch, { onConflict: schema.pk });
                
                if (error) {
                    errors.push({ batch: Math.floor(i / SYNC_BATCH_SIZE) + 1, msg: error.message });
                } else {
                    batch.forEach(r => {
                        const isNew = categorizedData.new.some(n => String(n[schema.pk]) === String(r[schema.pk]));
                        if (isNew) inserted.push(r);
                        else updated.push(r);
                    });
                }
                const currentProcessed = Math.min(i + SYNC_BATCH_SIZE, total);
                setSyncCount(currentProcessed);
                setSyncProgress(Math.round((currentProcessed / total) * 100));
            }
        }

        setSyncResult({ inserted, updated, unchanged, errors });
        setCurrentStep('results');
        setIsLoading(false);
    };

    const processFile = (f: File) => {
        setSelectedFile(f);
        setCurrentStep('converting');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            if (progress >= 100) {
                clearInterval(interval);
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    try {
                        const wb = XLSX.read(data, { type: 'array' });
                        setWorkbook(wb);
                        setSheets(wb.SheetNames);
                        if (f.name.toLowerCase().endsWith('.csv')) setCurrentStep('table-selection');
                        else setCurrentStep('sheet-selection');
                    } catch (err) {
                        toast({ title: 'Error de lectura', description: 'Archivo dañado o formato no soportado.', variant: 'destructive' });
                        setCurrentStep('upload');
                    }
                };
                reader.readAsArrayBuffer(f);
            } else setConversionProgress(progress);
        }, 100);
    };

    const reset = () => {
        setSelectedFile(null);
        setWorkbook(null);
        setHeaders([]);
        setRawRows([]);
        setSelectedTable('');
        setHeaderMap({});
        setCategorizedData({ new: [], update: [], unchanged: [] });
        setSyncResult(null);
        setCurrentStep('upload');
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {currentStep === 'upload' && (
                <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-primary/5 pb-8">
                        <CardTitle className="text-3xl font-black uppercase tracking-tight text-primary flex items-center gap-3">
                            <UploadCloud className="h-8 w-8" /> Sube tu archivo
                        </CardTitle>
                        <CardDescription className="text-lg font-medium text-slate-500">
                            Sube un archivo .csv o .xlsx.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div 
                            className="border-2 border-dashed border-primary/20 p-20 text-center rounded-3xl hover:bg-primary/5 hover:border-primary/40 cursor-pointer group transition-all duration-300"
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <div className="mx-auto h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-500">
                                <FileSpreadsheet className="h-12 w-12 text-primary" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Seleccionar Documento</h3>
                            <p className="mt-2 text-slate-500 font-medium">O arrastra y suelta tu archivo aquí (Máx 50MB)</p>
                            <input id="file-input" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={e => e.target.files && processFile(e.target.files[0])} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'converting' && (
                <Card className="border-none shadow-2xl bg-white p-20 text-center rounded-3xl space-y-8">
                    <div className="relative mx-auto h-24 w-24">
                        <Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" />
                        <RefreshCcw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-primary animate-bounce" />
                    </div>
                    <div className="space-y-4 max-w-md mx-auto">
                        <h3 className="text-2xl font-black uppercase tracking-tight">Analizando Estructura...</h3>
                        <Progress value={conversionProgress} className="h-3 bg-slate-100" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{conversionProgress}% COMPLETADO</p>
                    </div>
                </Card>
            )}

            {currentStep === 'sheet-selection' && (
                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Seleccionar Hoja de Trabajo</CardTitle>
                            <CardDescription>El archivo Excel contiene múltiples hojas. Elige la correcta.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-10">
                        {sheets.map(s => (
                            <Button 
                                key={s} 
                                variant="outline" 
                                className="h-24 font-black uppercase text-xs flex flex-col gap-2 rounded-2xl border-slate-200 hover:border-primary hover:bg-primary/5 transition-all shadow-sm"
                                onClick={() => { setSelectedSheet(s); setCurrentStep('table-selection'); }}
                            >
                                <FileText className="h-5 w-5 opacity-50" />
                                {s}
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'table-selection' && (
                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Destino de la Información</CardTitle>
                            <CardDescription>¿A qué tabla técnica pertenecen estos datos?</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full hover:bg-red-50 hover:text-red-500"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="p-20 max-w-xl mx-auto space-y-8">
                        {isLoading ? (
                            <div className="text-center space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                                <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Preparando motor de procesamiento...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">TABLA DE DESTINO</Label>
                                <Select onValueChange={handleTableSelect} value={selectedTable}>
                                    <SelectTrigger className="h-16 font-black bg-white border-2 border-slate-100 rounded-2xl shadow-sm text-lg focus:ring-primary/20">
                                        <SelectValue placeholder="Seleccionar tabla..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Object.keys(TABLE_SCHEMAS).map(t => (
                                            <SelectItem key={t} value={t} className="font-bold uppercase text-xs py-3">{t.replace(/_/g, ' ')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                        El sistema intentará mapear automáticamente las columnas basándose en alias técnicos y nombres históricos.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-primary/5 px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white">
                                <ArrowRightLeft className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Mapeo Técnico: {selectedTable}</CardTitle>
                                <CardDescription className="font-medium text-primary/60">Vincula las columnas de tu archivo con los campos de la base de datos.</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full hover:bg-red-50 hover:text-red-500"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow className="border-b-0">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest px-8 py-4 text-slate-500">Origen (Archivo)</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest py-4 text-slate-500">Destino (Base de Datos)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {headers.map((h, i) => (
                                        <TableRow key={i} className="h-20 hover:bg-slate-50/50 transition-colors border-slate-100">
                                            <TableCell className="px-8">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-sm text-slate-800 uppercase leading-none">{h || 'COLUMNA SIN NOMBRE'}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ÍNDICE #{i}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-8">
                                                <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                    <SelectTrigger className={cn(
                                                        "h-12 text-[11px] rounded-xl transition-all duration-300", 
                                                        headerMap[i] === IGNORE_COLUMN_VALUE 
                                                            ? "opacity-40 border-dashed border-slate-300" 
                                                            : "font-black text-primary border-primary/30 bg-primary/5 shadow-sm"
                                                    )}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl max-h-[300px]">
                                                        <SelectItem value={IGNORE_COLUMN_VALUE} className="italic text-[10px] font-bold text-slate-400">-- IGNORAR ESTA COLUMNA --</SelectItem>
                                                        {TABLE_SCHEMAS[selectedTable].columns.map(c => (
                                                            <SelectItem key={c} value={c} disabled={usedDbColumns.has(c) && headerMap[i] !== c} className="uppercase text-[10px] font-bold py-3">{c.replace(/_/g, ' ')}</SelectItem>
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
                    <CardFooter className="p-8 border-t bg-slate-50/80">
                        <Button onClick={performAnalysis} className="w-full h-16 font-black uppercase text-sm shadow-xl rounded-2xl bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]">
                            <Eye className="mr-3 h-5 w-5" /> Iniciar Análisis Diferencial
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'analyzing' && (
                <Card className="border-none shadow-2xl bg-white p-24 text-center rounded-3xl">
                    <div className="relative mx-auto h-24 w-24 mb-8">
                        <Loader2 className="h-24 w-24 animate-spin text-primary" />
                        <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary/40 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black uppercase tracking-tight text-slate-800">Análisis en Curso</h3>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2">Comparando el archivo contra el 100% de los registros en la base de datos...</p>
                </Card>
            )}

            {currentStep === 'preview' && (
                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden relative animate-in zoom-in-95 duration-300">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                                <CheckCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Resultado del Análisis</CardTitle>
                                <CardDescription className="font-medium text-slate-500">Revisa los cambios detectados antes de confirmar la sincronización.</CardDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full hover:bg-red-50 hover:text-red-500"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="nuevos" className="w-full">
                            <div className="px-8 border-b bg-slate-50/50">
                                <TabsList className="h-16 bg-transparent gap-10">
                                    <TabsTrigger value="nuevos" className="font-black uppercase text-[11px] data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-16">
                                        Nuevos <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">{categorizedData.new.length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="actualizar" className="font-black uppercase text-[11px] data-[state=active]:text-amber-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-amber-500 rounded-none px-0 h-16">
                                        Con Cambios <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 border-none">{categorizedData.update.length}</Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="sin-cambios" className="font-black uppercase text-[11px] data-[state=active]:text-slate-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-slate-400 rounded-none px-0 h-16">
                                        Sin Cambios <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-500 border-none">{categorizedData.unchanged.length}</Badge>
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                            
                            {['nuevos', 'actualizar', 'sin-cambios'].map(tab => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[450px] w-full border-b">
                                        <Table className="min-w-full">
                                            <TableHeader className="bg-white sticky top-0 z-10 shadow-sm">
                                                <TableRow className="border-b-0">
                                                    {activeDbColumns.map(col => (
                                                        <TableHead key={col} className="font-black text-[10px] uppercase px-6 py-4 whitespace-nowrap text-slate-400">{col.replace(/_/g, ' ')}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tab === 'nuevos' && categorizedData.new.length > 0 ? (
                                                    categorizedData.new.map((r, i) => (
                                                        <TableRow key={i} className="h-14 hover:bg-slate-50/50 transition-colors border-slate-50">
                                                            {activeDbColumns.map(col => <TableCell key={col} className="text-[11px] px-6 font-medium text-slate-700">{String(r[col] ?? '-')}</TableCell>)}
                                                        </TableRow>
                                                    ))
                                                ) : tab === 'actualizar' && categorizedData.update.length > 0 ? (
                                                    categorizedData.update.map((u, i) => (
                                                        <TableRow key={i} className="h-16 hover:bg-amber-50/20 transition-colors border-slate-50">
                                                            {activeDbColumns.map(col => {
                                                                const isDiff = NUMERIC_FIELDS.includes(col) 
                                                                    ? Math.abs(Number(u.record[col]) - Number(u.original[col])) > 0.0001 
                                                                    : String(u.record[col] ?? '').trim() !== String(u.original[col] ?? '').trim();
                                                                
                                                                return (
                                                                    <TableCell key={col} className={cn("px-6 text-[11px] font-medium", isDiff ? "bg-amber-50/40" : "text-slate-400 opacity-60")}>
                                                                        {isDiff ? (
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <span className="text-red-500/60 line-through text-[9px] font-bold">{String(u.original[col] ?? 'vacío')}</span>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <ArrowRight className="h-3 w-3 text-amber-500" />
                                                                                    <span className="text-primary font-black text-xs">{String(u.record[col] ?? 'vacío')}</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : String(u.record[col] ?? '-')}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))
                                                ) : tab === 'sin-cambios' && categorizedData.unchanged.length > 0 ? (
                                                    categorizedData.unchanged.map((r, i) => (
                                                        <TableRow key={i} className="h-14 opacity-50 border-slate-50">
                                                            {activeDbColumns.map(col => <TableCell key={col} className="text-[11px] px-6 font-medium">{String(r[col] ?? '-')}</TableCell>)}
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={activeDbColumns.length} className="text-center py-20">
                                                            <div className="flex flex-col items-center gap-3 opacity-30">
                                                                <Database className="h-12 w-12" />
                                                                <p className="font-black uppercase text-xs tracking-widest">Sin registros en esta categoría</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                        <ScrollBar orientation="horizontal" />
                                    </ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                    <CardFooter className="p-8 bg-slate-100/80 flex gap-6 items-center">
                        <div className="flex-1 flex gap-4">
                            <Button onClick={() => handleSync('new')} className="h-14 font-black uppercase text-[10px] flex-1 bg-slate-800 hover:bg-slate-900 rounded-2xl shadow-lg transition-all" disabled={categorizedData.new.length === 0}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Insertar Nuevos
                            </Button>
                            <Button onClick={() => handleSync('update')} className="h-14 font-black uppercase text-[10px] flex-1 bg-amber-600 hover:bg-amber-700 rounded-2xl shadow-lg transition-all" disabled={categorizedData.update.length === 0}>
                                <RefreshCcw className="mr-2 h-4 w-4" /> Actualizar Cambios
                            </Button>
                            <Button onClick={() => handleSync('all')} className="h-14 font-black uppercase text-[10px] flex-1 bg-primary hover:bg-primary/90 rounded-2xl shadow-xl transition-all active:scale-[0.98]" disabled={categorizedData.new.length === 0 && categorizedData.update.length === 0}>
                                <Save className="mr-2 h-4 w-4" /> Sincronizar Todo
                            </Button>
                        </div>
                        <div className="w-px h-10 bg-slate-300" />
                        <div className="text-right flex flex-col justify-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TOTAL PROCESABLE</span>
                            <span className="text-xl font-black text-slate-800 leading-none">{categorizedData.new.length + categorizedData.update.length}</span>
                        </div>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'syncing' && (
                <Card className="border-none shadow-2xl bg-white p-24 text-center space-y-10 rounded-3xl">
                    <div className="relative mx-auto h-32 w-32">
                        <Loader2 className="h-32 w-32 animate-spin text-primary opacity-10" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center animate-pulse shadow-inner">
                            <Database className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <div className="max-w-md mx-auto space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black uppercase tracking-tight text-primary">Inyectando Datos...</h3>
                            <p className="text-slate-500 font-medium">No cierres esta ventana mientras la operación esté activa.</p>
                        </div>
                        <div className="space-y-3">
                            <Progress value={syncProgress} className="h-4 bg-slate-100 rounded-full overflow-hidden" />
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{syncProgress}% COMPLETADO</span>
                                <span className="bg-slate-100 px-3 py-1 rounded-full">REGISTROS: {syncCount} / {totalToSync}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <Card className="border-none shadow-2xl overflow-hidden rounded-[40px] relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                    <div className={cn("p-16 text-white text-center relative", syncResult.errors.length > 0 ? "bg-amber-600" : "bg-primary")}>
                        <Button variant="ghost" size="icon" onClick={reset} className="absolute top-8 right-8 text-white hover:bg-white/20 rounded-full"><X className="h-6 w-6" /></Button>
                        <div className="mx-auto h-24 w-24 bg-white/20 rounded-full flex items-center justify-center mb-8 shadow-inner animate-in zoom-in duration-700">
                            {syncResult.errors.length > 0 ? <AlertTriangle className="h-12 w-12" /> : <CheckCircle className="h-12 w-12" />}
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter leading-none mb-3">
                            {syncResult.errors.length > 0 ? 'Proceso Finalizado con Anomalías' : '¡Sincronización Exitosa!'}
                        </h2>
                        <p className="text-white/70 font-medium text-lg uppercase tracking-widest text-[10px]">REPORTE TÉCNICO DE EJECUCIÓN</p>
                    </div>
                    
                    <CardContent className="p-12 bg-white space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-10 rounded-3xl bg-emerald-50 border border-emerald-100 shadow-sm text-center space-y-2">
                                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Inyectados</p>
                                <p className="text-5xl font-black text-emerald-800 leading-none">{syncResult.inserted.length}</p>
                            </div>
                            <div className="p-10 rounded-3xl bg-blue-50 border border-blue-100 shadow-sm text-center space-y-2">
                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Sobrescritos</p>
                                <p className="text-5xl font-black text-blue-800 leading-none">{syncResult.updated.length}</p>
                            </div>
                            <div className="p-10 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm text-center space-y-2">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sin Cambios</p>
                                <p className="text-5xl font-black text-slate-600 leading-none">{syncResult.unchanged.length}</p>
                            </div>
                        </div>

                        {syncResult.errors.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-base font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-600" /> DETALLE DE ANOMALÍAS:
                                </h3>
                                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 no-scrollbar">
                                    {syncResult.errors.map((err, i) => (
                                        <div key={i} className="group p-8 rounded-3xl bg-white border border-slate-100 shadow-md flex items-start gap-6 hover:shadow-xl transition-all duration-300">
                                            <div className="relative mt-1">
                                                <div className="h-4 w-4 rounded-full bg-red-500 animate-ping absolute inset-0 opacity-20" />
                                                <div className="h-4 w-4 rounded-full bg-red-500 relative ring-4 ring-red-50" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-black text-red-600 text-xs uppercase tracking-widest leading-none">ERROR LOTE #{err.batch}</p>
                                                <p className="text-slate-700 text-sm font-semibold leading-relaxed">{formatErrorDescription(err.msg)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                            <Button variant="outline" className="h-16 font-black uppercase text-xs rounded-2xl border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm" onClick={reset}>
                                <RefreshCcw className="mr-2 h-4 w-4" /> Procesar otro archivo
                            </Button>
                            <Button className="h-16 font-black uppercase text-xs rounded-2xl bg-slate-900 hover:bg-black transition-all shadow-xl active:scale-[0.98]" onClick={() => window.location.reload()}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Proceso
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}