
'use client';

import React, { useState, useMemo } from 'react';
import { 
  UploadCloud, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers, ArrowRight, Eye, AlertTriangle,
  Save, X, ArrowRightLeft
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
        'Estado': 'status',
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
        'Estado': 'estado',
        'Código postal': 'c_postal',
        'País': 'pais',
        'Forma de entrega': 'f_entrega',
        'Fecha en camino': 'f_camino',
        'Fecha entregado': 'f_entregado',
        'Transportista': 'transportista',
        'Número de seguimiento': 'num_seguimiento',
        'URL de seguimiento': 'url_seguimiento',
        'Revisado por Mercado Libre': 'revisado_xml',
        'Fecha de revisión': 'f_revision3',
        'Dinero a favor': 'd_afavor',
        'Resultado': 'resultado',
        'Destino': 'destino',
        'Motivo del resultado': 'motivo_resul',
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

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
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
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
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
                    const h = validRows[0].map(val => String(val || ''));
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
                        obj[colName] = parseValue(colName, row[headerIndex]);
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
                // Indispensable: usar upsert con onConflict para sincronización masiva segura
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
                        toast({ title: 'Error de lectura', description: 'Archivo dañado.', variant: 'destructive' });
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
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
                    <CardHeader><CardTitle className="text-2xl font-black uppercase tracking-tighter text-primary">Sube un archivo</CardTitle><CardDescription>Sube CSV o XLSX para iniciar.</CardDescription></CardHeader>
                    <CardContent><div className="border-2 border-dashed border-primary/20 p-16 text-center rounded-2xl hover:bg-primary/5 cursor-pointer group" onClick={() => document.getElementById('file-input')?.click()}><div className="mx-auto h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><UploadCloud className="h-10 w-10 text-primary" /></div><p className="mt-2 text-lg font-black uppercase tracking-tight text-slate-700">Seleccionar archivo</p><input id="file-input" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={e => e.target.files && processFile(e.target.files[0])} /></div></CardContent>
                </Card>
            )}

            {currentStep === 'converting' && (
                <Card className="border-none shadow-xl bg-white p-12 text-center space-y-6"><Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" /><h3 className="text-xl font-black uppercase tracking-tighter">Procesando ({conversionProgress}%)</h3><Progress value={conversionProgress} className="h-3" /></Card>
            )}

            {currentStep === 'sheet-selection' && (
                <Card className="border-none shadow-xl bg-white relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b"><CardTitle className="text-xl font-black uppercase tracking-tighter">Hoja Excel</CardTitle><Button variant="ghost" size="icon" onClick={reset}><X /></Button></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-8">
                        {sheets.map(s => <Button key={s} variant="outline" className="h-20 font-bold uppercase text-xs" onClick={() => { setSelectedSheet(s); setCurrentStep('table-selection'); }}>{s}</Button>)}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'table-selection' && (
                <Card className="border-none shadow-xl bg-white relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b"><CardTitle className="text-xl font-black uppercase tracking-tighter">Destino de Datos</CardTitle><Button variant="ghost" size="icon" onClick={reset}><X /></Button></CardHeader>
                    <CardContent className="p-12 max-w-md mx-auto space-y-4">
                        {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : (
                            <Select onValueChange={handleTableSelect} value={selectedTable}>
                                <SelectTrigger className="h-14 font-bold bg-white"><SelectValue placeholder="Seleccionar tabla..." /></SelectTrigger>
                                <SelectContent>{Object.keys(TABLE_SCHEMAS).map(t => <SelectItem key={t} value={t} className="font-bold uppercase text-xs">{t}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card className="border-none shadow-2xl bg-white relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5"><CardTitle className="text-xl font-black uppercase tracking-tighter">Mapeo: {selectedTable}</CardTitle><Button variant="ghost" size="icon" onClick={reset}><X /></Button></CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0"><TableRow><TableHead className="font-black text-[10px] uppercase tracking-widest px-8">Origen (Archivo)</TableHead><TableHead className="font-black text-[10px] uppercase tracking-widest">Destino (Base de Datos)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {headers.map((h, i) => (
                                        <TableRow key={i} className="h-16">
                                            <TableCell className="px-8"><span className="font-black text-xs text-slate-700 uppercase">{h || 'S/N'}</span></TableCell>
                                            <TableCell className="pr-8">
                                                <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                    <SelectTrigger className={cn("h-10 text-[11px]", headerMap[i] === IGNORE_COLUMN_VALUE ? "opacity-40 border-dashed" : "font-black text-primary border-primary/30 bg-primary/5")}><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={IGNORE_COLUMN_VALUE} className="italic text-[10px]">-- IGNORAR ESTA COLUMNA --</SelectItem>
                                                        {TABLE_SCHEMAS[selectedTable].columns.map(c => (
                                                            <SelectItem key={c} value={c} disabled={usedDbColumns.has(c) && headerMap[i] !== c} className="uppercase text-[10px] font-bold">{c.replace(/_/g, ' ')}</SelectItem>
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
                    <CardFooter className="p-8 border-t bg-slate-50"><Button onClick={performAnalysis} className="w-full h-16 font-black uppercase text-sm shadow-xl rounded-xl"><Eye className="mr-3" /> Analizar Cambios</Button></CardFooter>
                </Card>
            )}

            {currentStep === 'analyzing' && (
                <Card className="border-none shadow-xl bg-white p-20 text-center"><Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" /><h3 className="text-2xl font-black uppercase tracking-tighter">Realizando Auditoría Diferencial...</h3></Card>
            )}

            {currentStep === 'preview' && (
                <Card className="border-none shadow-2xl bg-white relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5"><CardTitle className="text-xl font-black uppercase tracking-tighter">Vista Previa de Sincronización</CardTitle><Button variant="ghost" size="icon" onClick={reset}><X /></Button></CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="nuevos" className="w-full">
                            <div className="px-8 border-b bg-muted/10"><TabsList className="h-14 bg-transparent gap-8">
                                <TabsTrigger value="nuevos" className="font-bold uppercase text-[11px]">Nuevos ({categorizedData.new.length})</TabsTrigger>
                                <TabsTrigger value="actualizar" className="font-bold uppercase text-[11px]">Con Cambios ({categorizedData.update.length})</TabsTrigger>
                                <TabsTrigger value="sin-cambios" className="font-bold uppercase text-[11px]">Sin Cambios ({categorizedData.unchanged.length})</TabsTrigger>
                            </TabsList></div>
                            {['nuevos', 'actualizar', 'sin-cambios'].map(tab => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[450px] w-full border-b"><Table>
                                        <TableHeader className="bg-white sticky top-0 shadow-sm"><TableRow>
                                            {activeDbColumns.map(col => <TableHead key={col} className="font-black text-[10px] uppercase px-4 whitespace-nowrap">{col}</TableHead>)}
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {tab === 'nuevos' ? categorizedData.new.map((r, i) => (
                                                <TableRow key={i} className="h-12">{activeDbColumns.map(col => <TableCell key={col} className="text-[10px] px-4">{String(r[col] ?? '-')}</TableCell>)}</TableRow>
                                            )) : tab === 'actualizar' ? categorizedData.update.map((u, i) => (
                                                <TableRow key={i} className="h-12">{activeDbColumns.map(col => {
                                                    const isDiff = NUMERIC_FIELDS.includes(col) ? Math.abs(Number(u.record[col]) - Number(u.original[col])) > 0.0001 : String(u.record[col] ?? '') !== String(u.original[col] ?? '');
                                                    return (
                                                        <TableCell key={col} className={cn("px-4 text-[10px]", isDiff && "bg-amber-50/30")}>
                                                            {isDiff ? <div className="flex flex-col"><span className="text-destructive line-through text-[8px] opacity-60">{String(u.original[col] ?? 'vacio')}</span><span className="text-primary font-black">{String(u.record[col] ?? 'vacio')}</span></div> : <span className="opacity-60">{String(u.record[col] ?? '-')}</span>}
                                                        </TableCell>
                                                    );
                                                })}</TableRow>
                                            )) : categorizedData.unchanged.map((r, i) => (
                                                <TableRow key={i} className="h-12 opacity-60">{activeDbColumns.map(col => <TableCell key={col} className="text-[10px] px-4">{String(r[col] ?? '-')}</TableCell>)}</TableRow>
                                            ))}
                                        </TableBody>
                                    </Table><ScrollBar orientation="horizontal" /></ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                    <CardFooter className="p-8 bg-slate-50 flex gap-4">
                        <Button onClick={() => handleSync('new')} className="h-14 font-bold uppercase text-[11px] flex-1 bg-[#3E6053]" disabled={categorizedData.new.length === 0}>Insertar Nuevos</Button>
                        <Button onClick={() => handleSync('update')} className="h-14 font-bold uppercase text-[11px] flex-1 bg-[#3E6053]" disabled={categorizedData.update.length === 0}>Actualizar Cambios</Button>
                        <Button onClick={() => handleSync('all')} className="h-14 font-black uppercase text-[11px] flex-1 bg-[#2D5A4C]" disabled={categorizedData.new.length === 0 && categorizedData.update.length === 0}>Sincronizar Todo</Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'syncing' && (
                <Card className="border-none shadow-xl bg-white p-20 text-center space-y-8">
                    <div className="relative mx-auto h-24 w-24"><Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" /><Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-primary" /></div>
                    <div className="max-w-md mx-auto space-y-4">
                        <h3 className="text-2xl font-black uppercase tracking-tighter text-primary">Sincronizando Datos</h3>
                        <Progress value={syncProgress} className="h-4" />
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground"><span>{syncProgress}%</span><span>Registros: {syncCount} / {totalToSync}</span></div>
                    </div>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <Card className="border-none shadow-2xl overflow-hidden rounded-3xl relative animate-in zoom-in-95">
                    <div className={cn("p-12 text-white text-center", syncResult.errors.length > 0 ? "bg-amber-600" : "bg-[#2D5A4C]")}>
                        <Button variant="ghost" size="icon" onClick={reset} className="absolute top-6 right-6 text-white hover:bg-white/20"><X /></Button>
                        <div className="mx-auto h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mb-6">{syncResult.errors.length > 0 ? <AlertTriangle className="h-12 w-12" /> : <CheckCircle className="h-12 w-12" />}</div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter">{syncResult.errors.length > 0 ? 'Auditoría con Anomalías' : '¡Sincronización Exitosa!'}</h2>
                    </div>
                    <CardContent className="p-8 bg-white space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className="p-6 rounded-2xl bg-green-50/50 border border-green-100"><p className="text-[10px] font-black uppercase text-green-600">Inyectados</p><p className="text-4xl font-black text-green-800">{syncResult.inserted.length}</p></div>
                            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100"><p className="text-[10px] font-black uppercase text-blue-600">Sobrescritos</p><p className="text-4xl font-black text-blue-800">{syncResult.updated.length}</p></div>
                            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100"><p className="text-[10px] font-black uppercase text-slate-400">Sin Cambios</p><p className="text-4xl font-black text-600">{syncResult.unchanged.length}</p></div>
                        </div>
                        {syncResult.errors.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-black uppercase text-slate-700">DETALLE DE ANOMALÍAS:</h3>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {syncResult.errors.map((err, i) => (
                                        <div key={i} className="p-6 rounded-2xl bg-white border border-red-50 shadow-sm flex items-start gap-4">
                                            <div className="mt-1.5 h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0 ring-4 ring-red-50" />
                                            <div className="space-y-1"><p className="font-black text-red-600 text-xs uppercase">ERROR LOTE #{err.batch}</p><p className="text-slate-600 text-xs font-semibold">{formatErrorDescription(err.msg)}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4"><Button variant="outline" className="h-14 font-black uppercase text-xs rounded-xl" onClick={reset}>Procesar otro</Button><Button className="h-14 font-black uppercase text-xs rounded-xl" onClick={() => window.location.reload()}>Finalizar</Button></div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
