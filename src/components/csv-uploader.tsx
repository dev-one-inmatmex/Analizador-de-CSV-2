'use client';

import React, { useState, useMemo } from 'react';
import { 
  UploadCloud, Loader2, Database, RefreshCcw, 
  CheckCircle, FileSpreadsheet, Layers, ArrowRight, Eye, AlertTriangle,
  Save, X, ArrowRightLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
        'sku': 'sku',
        'Categoria_madre': 'cat_mdr',
        'nombre_madre': 'sku_mdr',
        'landed_cost': 'landed_cost',
        'piezas_por_sku': 'piezas_por_sku',
        'piezas_por_contenedor': 'piezas_xcontenedor',
        'bodega': 'bodega',
        'bloque': 'bloque'
    }
};

const IGNORE_COLUMN_VALUE = '--ignore-this-column--';

function parseValue(key: string, value: any): any {
    if (value === undefined || value === null || String(value).trim() === '' || String(value).toLowerCase() === 'null') return null;
    const str = String(value).trim();
    
    const numericFields = [
        'monto', 'total', 'unidades', 'price', 'landed_cost', 'costo_envio', 
        'piezas_por_sku', 'num_publicaciones', 'piezas_totales', 'esti_time', 
        'piezas_xcontenedor', 'bloque', 'costo', 'ing_xunidad', 'cargo_venta',
        'ing_xenvio', 'costo_enviomp', 'cargo_difpeso', 'anu_reembolsos', 'unidades_2', 'unidades_3'
    ];
    
    if (numericFields.includes(key)) {
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
        return 'Error de Referencia: El registro intenta vincularse a un dato (como un SKU o Categoría) que no existe en las tablas maestras.';
    }
    if (msg.includes('null value in column')) {
        return 'Valor Nulo Prohibido: Falta un dato obligatorio que la base de datos requiere para este registro en particular.';
    }
    if (msg.includes('invalid input syntax')) {
        return 'Formato Inválido: Uno de los valores no coincide con el tipo de dato esperado (ej. texto donde debería ir un número).';
    }
    return `Error técnico: ${msg}`;
}

type Step = 'upload' | 'converting' | 'sheet-selection' | 'table-selection' | 'mapping' | 'analyzing' | 'preview' | 'syncing' | 'results';

export default function CsvUploader() {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheets, setSheets] = useState<string[]>([]);
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
        const schema = TABLE_SCHEMAS[table];
        const aliases = COLUMN_ALIASES[table] || {};
        const map: Record<number, string> = {};
        const usedColumns = new Set<string>();

        headers.forEach((h, i) => {
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
            const allRecords = rawRows.map(row => {
                const obj: any = {};
                headers.forEach((_, headerIndex) => {
                    const colName = headerMap[headerIndex];
                    if (colName && colName !== IGNORE_COLUMN_VALUE) {
                        obj[colName] = parseValue(colName, row[headerIndex]);
                    }
                });
                return obj;
            }).filter(r => !!r[schema.pk]);

            const pks = allRecords.map(r => r[schema.pk]).filter(Boolean);
            const existingDataMap = new Map<string, any>();
            const FETCH_BATCH_SIZE = 500;
            
            if (supabase) {
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
                        const sNew = newVal === null ? '' : String(newVal);
                        const sOld = oldVal === null ? '' : String(oldVal);
                        if (sNew !== sOld) {
                            isDifferent = true;
                            break;
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
                        const isNew = categorizedData.new.some(n => n[schema.pk] === r[schema.pk]);
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
                        if (f.name.endsWith('.csv')) {
                            handleSheetSelect(wb.SheetNames[0], wb);
                        } else {
                            setCurrentStep('sheet-selection');
                        }
                    } catch (err: any) {
                        toast({ title: 'Error de lectura', description: 'No se pudo procesar el archivo.', variant: 'destructive' });
                        setCurrentStep('upload');
                    }
                };
                reader.readAsArrayBuffer(f);
            } else {
                setConversionProgress(progress);
            }
        }, 100);
    };

    const handleSheetSelect = (sheetName: string, customWb?: XLSX.WorkBook) => {
        const targetWb = customWb || workbook;
        if (!targetWb) return;
        const worksheet = targetWb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
        const validRows = json.filter(row => row.some(cell => cell !== null && cell !== ''));
        if (validRows.length === 0) {
            toast({ title: 'Página vacía', description: 'La página seleccionada no contiene datos.', variant: 'destructive' });
            return;
        }
        setHeaders(validRows[0].map(h => String(h || '')));
        setRawRows(validRows.slice(1));
        setCurrentStep('table-selection');
    };

    const reset = () => {
        setWorkbook(null);
        setSheets([]);
        setHeaders([]);
        setRawRows([]);
        setConversionProgress(0);
        setSelectedTable('');
        setHeaderMap({});
        setCategorizedData({ new: [], update: [], unchanged: [] });
        setSyncResult(null);
        setSyncProgress(0);
        setSyncCount(0);
        setTotalToSync(0);
        setCurrentStep('upload');
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {currentStep === 'upload' && (
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter text-primary">Cargar Archivo Maestro</CardTitle>
                        <CardDescription>Sube un archivo (.csv, .xlsx) para iniciar la sincronización.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            className="border-2 border-dashed border-primary/20 p-16 text-center rounded-2xl hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer group" 
                            onClick={() => document.getElementById('file-input')?.click()}
                        >
                            <div className="mx-auto h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="h-10 w-10 text-primary" />
                            </div>
                            <p className="mt-2 text-lg font-black uppercase tracking-tight text-slate-700">Arrastra o selecciona un archivo</p>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Soporta reportes CSV y libros Excel</p>
                            <input id="file-input" type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={e => e.target.files && processFile(e.target.files[0])} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'converting' && (
                <Card className="border-none shadow-xl bg-white animate-in zoom-in-95">
                    <CardContent className="p-12 text-center space-y-6">
                        <div className="flex justify-center"><div className="relative h-20 w-20 flex items-center justify-center"><Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" /><FileSpreadsheet className="h-10 w-10 text-primary absolute" /></div></div>
                        <div className="space-y-2"><h3 className="text-xl font-black uppercase tracking-tighter">Procesando Archivo</h3><p className="text-sm text-muted-foreground font-medium">Extrayendo estructura ({conversionProgress}%)</p></div>
                        <Progress value={conversionProgress} className="h-3 w-full bg-slate-100" />
                    </CardContent>
                </Card>
            )}

            {currentStep === 'sheet-selection' && (
                <Card className="border-none shadow-xl bg-white animate-in fade-in relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-6 px-8">
                        <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Layers className="h-6 w-6 text-primary" /></div><div><CardTitle className="text-xl font-black uppercase tracking-tighter">Selector de Página</CardTitle><CardDescription>Elige la hoja del libro Excel a procesar.</CardDescription></div></div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-6 px-8 pb-8">
                        {sheets.map((sheet) => (
                            <Button key={sheet} variant="outline" className="h-24 flex flex-col gap-2 border-slate-200 hover:border-primary hover:bg-primary/5 p-4 rounded-xl items-start group" onClick={() => handleSheetSelect(sheet)}>
                                <span className="font-black text-xs uppercase tracking-tight truncate w-full group-hover:text-primary">{sheet}</span>
                                <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest"><ArrowRight className="h-3 w-3" /> Extraer datos</div>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            )}

            {currentStep === 'table-selection' && (
                <Card className="border-none shadow-xl bg-white animate-in slide-in-from-right-4 relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b pb-6 px-8">
                        <div className="flex items-center gap-3"><div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white"><Database className="h-5 w-5" /></div><CardTitle className="text-xl font-black uppercase tracking-tighter">Destino de Datos</CardTitle></div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="pt-8 pb-12 px-8">
                        <div className="max-w-md mx-auto space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tabla de Destino (Base de Datos)</Label>
                            <Select onValueChange={handleTableSelect} value={selectedTable}>
                                <SelectTrigger className="h-14 border-slate-200 text-base font-bold bg-white rounded-xl"><SelectValue placeholder="Selecciona el destino técnico..." /></SelectTrigger>
                                <SelectContent className="border-none shadow-2xl rounded-xl">
                                    {Object.keys(TABLE_SCHEMAS).map(table => <SelectItem key={table} value={table} className="py-3 font-bold uppercase text-xs">{table}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'mapping' && (
                <Card className="border-none shadow-2xl bg-white animate-in zoom-in-95 overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="space-y-1"><div className="flex items-center gap-2"><Badge className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest border-none px-2">Configuración Atribución</Badge><CardTitle className="text-xl font-black uppercase tracking-tighter">Mapeo: {selectedTable}</CardTitle></div><CardDescription>Vincula encabezados con campos reales de base de datos.</CardDescription></div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-muted/30 sticky top-0 z-10 shadow-sm"><TableRow className="border-b-0 h-12"><TableHead className="font-black text-[10px] uppercase tracking-widest px-8">Origen (Archivo)</TableHead><TableHead className="font-black text-[10px] uppercase tracking-widest">Destino (BD)</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {headers.map((h, i) => (
                                        <TableRow key={i} className="hover:bg-muted/5 h-16 border-b-slate-100 last:border-b-0">
                                            <TableCell className="px-8"><div className="flex flex-col"><span className="font-black text-xs text-slate-700 uppercase">{h || 'S/N'}</span><span className="text-[10px] text-muted-foreground font-medium">Ej: {String(rawRows[0]?.[i] ?? 'Vacío')}</span></div></TableCell>
                                            <TableCell className="pr-8">
                                                <Select value={headerMap[i]} onValueChange={v => setHeaderMap({...headerMap, [i]: v})}>
                                                    <SelectTrigger className={cn("h-10 text-[11px] rounded-lg transition-all", headerMap[i] === IGNORE_COLUMN_VALUE ? "opacity-40 border-dashed" : "font-black text-primary border-primary/30 bg-primary/5")}>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                                        <SelectItem value={IGNORE_COLUMN_VALUE} className="text-[10px] italic font-bold">-- IGNORAR --</SelectItem>
                                                        {TABLE_SCHEMAS[selectedTable].columns.map(c => {
                                                            const isUsed = usedDbColumns.has(c) && headerMap[i] !== c;
                                                            return <SelectItem key={c} value={c} disabled={isUsed} className={cn("text-[10px] font-bold uppercase py-2.5", isUsed && "opacity-30")}>{c.replace(/_/g, ' ')} {isUsed && '(Ya asignada)'}</SelectItem>;
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="p-8 border-t bg-slate-50"><Button onClick={performAnalysis} className="w-full h-16 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 rounded-xl"><Eye className="mr-3 h-6 w-6" /> Iniciar Análisis Diferencial</Button></CardFooter>
                </Card>
            )}

            {currentStep === 'analyzing' && (
                <Card className="border-none shadow-xl bg-white text-center p-20">
                    <CardContent className="space-y-6"><Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" /><div className="space-y-2"><h3 className="text-2xl font-black uppercase tracking-tighter text-primary">Auditoría Diferencial</h3><p className="text-muted-foreground font-medium">Comparando {rawRows.length} registros con la base de datos...</p></div></CardContent>
                </Card>
            )}

            {currentStep === 'preview' && (
                <Card className="border-none shadow-2xl bg-white animate-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 px-8 py-6">
                        <div className="space-y-1"><div className="flex items-center gap-2"><Badge className="bg-primary/10 text-primary uppercase text-[9px] font-black tracking-widest border-none px-2">Auditoría de Integridad</Badge><CardTitle className="text-xl font-black uppercase tracking-tighter">Resultados: {selectedTable}</CardTitle></div><CardDescription>Visualiza los datos clasificados antes de la inyección.</CardDescription></div>
                        <Button variant="ghost" size="icon" onClick={reset} className="rounded-full h-8 w-8 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><X className="h-5 w-5" /></Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs defaultValue="nuevos" className="w-full">
                            <div className="px-8 bg-muted/10 border-b"><TabsList className="h-14 w-full bg-transparent p-0 gap-8 justify-start">
                                <TabsTrigger value="nuevos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter">Nuevos ({categorizedData.new.length})</TabsTrigger>
                                <TabsTrigger value="actualizar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter">Con Cambios ({categorizedData.update.length})</TabsTrigger>
                                <TabsTrigger value="sin-cambios" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-full font-bold uppercase text-[11px] tracking-tighter">Sin Cambios ({categorizedData.unchanged.length})</TabsTrigger>
                            </TabsList></div>
                            {['nuevos', 'actualizar', 'sin-cambios'].map((tab) => (
                                <TabsContent key={tab} value={tab} className="mt-0">
                                    <ScrollArea className="h-[450px] w-full border-b"><div className="min-w-full inline-block align-middle"><Table className="border-collapse">
                                        <TableHeader className="bg-white sticky top-0 z-10 shadow-sm"><TableRow className="h-12 border-b">
                                            {activeDbColumns.map((col) => <TableHead key={col} className="border-r last:border-r-0 font-black text-[10px] uppercase tracking-wider px-4 bg-white whitespace-nowrap">{col}</TableHead>)}
                                        </TableRow></TableHeader>
                                        <TableBody>
                                            {tab === 'nuevos' && categorizedData.new.length > 0 ? (
                                                categorizedData.new.map((row, rIdx) => (
                                                    <TableRow key={rIdx} className="h-12 hover:bg-muted/5 transition-colors">
                                                        {activeDbColumns.map((col) => <TableCell key={col} className="border-r last:border-r-0 px-4 text-[10px] font-medium max-w-[250px] truncate">{String(row[col] ?? '-')}</TableCell>)}
                                                    </TableRow>
                                                ))
                                            ) : tab === 'actualizar' && categorizedData.update.length > 0 ? (
                                                categorizedData.update.map((item, rIdx) => (
                                                    <TableRow key={rIdx} className="h-12 hover:bg-muted/5 transition-colors">
                                                        {activeDbColumns.map((col) => {
                                                            const isDiff = String(item.record[col] ?? '') !== String(item.original[col] ?? '');
                                                            return (
                                                                <TableCell key={col} className={cn("border-r last:border-r-0 px-4 text-[10px] font-medium max-w-[250px]", isDiff ? "bg-amber-50/30" : "")}>
                                                                    {isDiff ? (
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <span className="text-destructive line-through opacity-60 text-[8px]">{String(item.original[col] ?? 'vacío')}</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <ArrowRightLeft className="h-2.5 w-2.5 text-primary opacity-40" />
                                                                                <span className="text-primary font-black truncate">{String(item.record[col] ?? 'vacío')}</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="opacity-60 truncate">{String(item.record[col] ?? '-')}</span>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}
                                                    </TableRow>
                                                ))
                                            ) : tab === 'sin-cambios' && categorizedData.unchanged.length > 0 ? (
                                                categorizedData.unchanged.map((row, rIdx) => (
                                                    <TableRow key={rIdx} className="h-12 hover:bg-muted/5 transition-colors opacity-60">
                                                        {activeDbColumns.map((col) => <TableCell key={col} className="border-r last:border-r-0 px-4 text-[10px] font-medium max-w-[250px] truncate">{String(row[col] ?? '-')}</TableCell>)}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow><TableCell colSpan={activeDbColumns.length} className="h-32 text-center text-muted-foreground font-bold uppercase text-xs">Sin registros en esta categoría.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table></div><ScrollBar orientation="horizontal" /></ScrollArea>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                    <CardFooter className="p-8 bg-slate-50 flex flex-wrap gap-4">
                        <Button onClick={() => handleSync('new')} className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl flex-1 shadow-lg" disabled={categorizedData.new.length === 0}><Database className="mr-2 h-5 w-5" /> Insertar Nuevos</Button>
                        <Button onClick={() => handleSync('update')} className="h-14 px-8 bg-[#3E6053] hover:bg-[#2D4A3F] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl flex-1 shadow-lg" disabled={categorizedData.update.length === 0}><RefreshCcw className="mr-2 h-5 w-5" /> Actualizar Cambios</Button>
                        <Button onClick={() => handleSync('all')} className="h-14 px-8 bg-[#2D5A4C] hover:bg-[#1f3e34] text-white font-bold uppercase text-[11px] tracking-widest rounded-xl flex-1 shadow-lg" disabled={categorizedData.new.length === 0 && categorizedData.update.length === 0}><Save className="mr-2 h-5 w-5" /> Sincronizar Todo</Button>
                    </CardFooter>
                </Card>
            )}

            {currentStep === 'syncing' && (
                <Card className="border-none shadow-xl bg-white text-center p-20">
                    <CardContent className="space-y-8">
                        <div className="relative mx-auto h-24 w-24"><Loader2 className="h-24 w-24 animate-spin text-primary opacity-20" /><Database className="h-10 w-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                        <div className="space-y-4 max-w-md mx-auto">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-primary">Sincronización en Curso</h3>
                            <div className="space-y-3">
                                <Progress value={syncProgress} className="h-4 w-full bg-slate-100" />
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-primary">{syncProgress}% Completado</span>
                                    <span className="text-muted-foreground">Registros: {syncCount} / {totalToSync}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentStep === 'results' && syncResult && (
                <Card className="border-none shadow-2xl overflow-hidden rounded-3xl relative animate-in zoom-in-95">
                    <div className={cn("p-12 text-white text-center transition-colors duration-500", syncResult.errors.length > 0 ? "bg-amber-600" : "bg-[#2D5A4C]")}>
                        <Button variant="ghost" size="icon" onClick={reset} className="absolute top-6 right-6 rounded-full h-10 w-10 text-white hover:bg-white/20"><X className="h-6 w-6" /></Button>
                        <div className="mx-auto h-20 w-20 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                            {syncResult.errors.length > 0 ? <AlertTriangle className="h-12 w-12 text-white" /> : <CheckCircle className="h-12 w-12 text-white" />}
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 leading-none">{syncResult.errors.length > 0 ? 'Auditoría con Anomalías' : '¡Sincronización Exitosa!'}</h2>
                        <p className="text-white/80 font-bold uppercase tracking-widest text-sm">Tabla: {selectedTable} • {rawRows.length} registros auditados</p>
                    </div>
                    <CardContent className="p-8 bg-white space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div className="p-6 rounded-2xl bg-green-50/50 border border-green-100 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-1">Inyectados</p><p className="text-4xl font-black text-green-800">{syncResult.inserted.length}</p></div>
                            <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Sobrescritos</p><p className="text-4xl font-black text-blue-800">{syncResult.updated.length}</p></div>
                            <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Sin Cambios</p><p className="text-4xl font-black text-slate-600">{syncResult.unchanged.length}</p></div>
                        </div>

                        {syncResult.errors.length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-700 ml-1">DETALLE DE ANOMALÍAS:</h3>
                                <div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/30 space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                                    {syncResult.errors.map((err, i) => (
                                        <div key={i} className="p-6 rounded-2xl bg-white border border-red-50 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
                                            <div className="mt-1.5 h-3 w-3 rounded-full bg-red-500 animate-pulse shrink-0 border-2 border-white ring-4 ring-red-50" />
                                            <div className="space-y-1">
                                                <p className="font-black text-red-600 text-xs uppercase tracking-tighter leading-none">ERROR LOTE #{err.batch}</p>
                                                <p className="text-slate-600 text-xs font-semibold leading-relaxed">{formatErrorDescription(err.msg)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <Button variant="outline" className="h-14 font-black uppercase text-xs border-slate-200 rounded-xl hover:bg-slate-50" onClick={reset}><RefreshCcw className="mr-2 h-4 w-4" /> Procesar otro archivo</Button>
                            <Button className="h-14 font-black uppercase text-xs rounded-xl shadow-lg shadow-primary/20" onClick={() => window.location.reload()}><CheckCircle className="mr-2 h-4 w-4" /> Finalizar y Salir</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}