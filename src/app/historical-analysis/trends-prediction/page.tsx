
import { SalesPredictionOutput } from '@/ai/schemas/sales-prediction-schemas';
import TrendsPredictionClient from './trends-prediction-client';
import { unstable_noStore as noStore } from 'next/cache';

// --- MOCK DATA ---

const salesHistoryForChart = [
    { date: 'Jul 23', ventas: 4000 },
    { date: 'Ago 23', ventas: 3000 },
    { date: 'Sep 23', ventas: 5000 },
    { date: 'Oct 23', ventas: 4500 },
    { date: 'Nov 23', ventas: 6000 },
    { date: 'Dic 23', ventas: 8000 },
    { date: 'Ene 24', ventas: 5500 },
    { date: 'Feb 24', ventas: 6200 },
    { date: 'Mar 24', ventas: 7000 },
    { date: 'Abr 24', ventas: 6500 },
    { date: 'May 24', ventas: 7500 },
    { date: 'Jun 24', ventas: 7200 },
];

const mockPredictionResult: SalesPredictionOutput = {
  predictedSalesNextMonth: 8500.0,
  growthTrend: 15.2,
  seasonalPeak: 'Diciembre',
  salesPrediction: [
    { date: 'Jul 24', prediction: 8500 },
    { date: 'Ago 24', prediction: 8200 },
    { date: 'Sep 24', prediction: 9000 },
    { date: 'Oct 24', prediction: 9500 },
    { date: 'Nov 24', prediction: 11000 },
    { date: 'Dic 24', prediction: 14000 },
  ],
  categoryPrediction: [
    { category: 'Electrónica', prediction: 12000 },
    { category: 'Ropa', prediction: 8000 },
    { category: 'Hogar', prediction: 6500 },
    { category: 'Juguetes', prediction: 4000 },
    { category: 'Otros', prediction: 2000 },
  ],
  detailedPredictions: [
    {
      product: 'Laptop Pro X',
      sku: 'LPX-001',
      prediction: 120,
      confidence: 'Alta (92%)',
      suggestion: 'Aumentar stock un 15%',
    },
    {
      product: 'Camisa Casual',
      sku: 'CAM-032',
      prediction: 250,
      confidence: 'Media (85%)',
      suggestion: 'Preparar campaña de marketing',
    },
    {
      product: 'Sofá Moderno',
      sku: 'SOF-001',
      prediction: 40,
      confidence: 'Media (88%)',
      suggestion: 'Mantener stock actual',
    },
    {
      product: 'Celular Gen 5',
      sku: 'CEL-005',
      prediction: 90,
      confidence: 'Alta (95%)',
      suggestion: 'Asegurar stock para lanzamiento',
    },
  ],
};


export default async function TrendsPredictionPage() {
    noStore(); // This will make the router.refresh() work as expected

    // For now, we will use mock data as requested.
    // The logic to fetch real data and call the AI can be re-enabled later.
    const salesHistory = salesHistoryForChart;
    const predictionResult = mockPredictionResult;

    return (
        <TrendsPredictionClient
            salesHistory={salesHistory}
            predictionResult={predictionResult}
        />
    );
}
