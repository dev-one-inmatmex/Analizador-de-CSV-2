/**
 * @fileOverview Zod schemas and types for sales prediction.
 */

import { z } from 'zod';

// Schema for the input data: historical sales records
const HistoricalSaleSchema = z.object({
  product: z.string().describe('The title of the product sold.'),
  category: z.string().describe('The category of the product sold.'),
  sku: z.string().describe('The SKU of the product.'),
  date: z.string().describe('The date of the sale (YYYY-MM-DD).'),
  amount: z.number().describe('The total amount of the sale.'),
  units: z.number().describe('The number of units sold.'),
});

export const SalesPredictionInputSchema = z.object({
  salesHistory: z.array(HistoricalSaleSchema).describe('An array of historical sales records for the last 12 months.'),
  predictionMonths: z.number().default(6).describe('The number of future months to predict.'),
});
export type SalesPredictionInput = z.infer<typeof SalesPredictionInputSchema>;

// Schema for the structured output we expect from the AI
export const SalesPredictionOutputSchema = z.object({
  predictedSalesNextMonth: z.number().describe('The total predicted sales revenue for the single next calendar month.'),
  growthTrend: z.number().describe('The percentage growth trend compared to the previous period (e.g., 15.2 for +15.2%).'),
  seasonalPeak: z.string().describe('The name of the month with the highest projected sales demand (e.g., "Diciembre").'),
  salesPrediction: z.array(z.object({
    date: z.string().describe('The month of the prediction in "MMM yy" format (e.g., "Jul 24").'),
    prediction: z.number().describe('The predicted sales amount for that month.'),
  })).describe('An array of sales predictions for the next 6 months.'),
  categoryPrediction: z.array(z.object({
    category: z.string().describe('The product category.'),
    prediction: z.number().describe('The total predicted sales for this category over the next quarter.'),
  })).min(4).max(5).describe('A breakdown of predicted sales by the top 4-5 product categories for the next quarter.'),
  detailedPredictions: z.array(z.object({
    product: z.string().describe('The name of the product.'),
    sku: z.string().describe('The product SKU.'),
    prediction: z.number().describe('The predicted number of units to be sold next month.'),
    confidence: z.string().describe('The confidence level of the prediction (e.g., "Alta (92%)", "Media (85%)").'),
    suggestion: z.string().describe('A brief, actionable suggestion for this product (e.g., "Aumentar stock un 15%").'),
  })).min(4).max(4).describe('Actionable predictions for the top 4 most relevant products.'),
});
export type SalesPredictionOutput = z.infer<typeof SalesPredictionOutputSchema>;
