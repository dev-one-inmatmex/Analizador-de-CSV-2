'use server';
/**
 * @fileOverview A Genkit flow for predicting future sales trends.
 */
import { ai } from '@/ai/genkit';
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


const prompt = ai.definePrompt({
  name: 'predictSalesTrendPrompt',
  input: { schema: SalesPredictionInputSchema },
  output: { schema: SalesPredictionOutputSchema },
  model: 'googleai/gemini-pro',
  config: {
    responseMimeType: "application/json",
  },
  prompt: `
    You are a data scientist and financial analyst expert for an e-commerce company.
    Your task is to analyze the provided historical sales data and generate a sales forecast and actionable insights.
    The current date is {{moment format="LL"}}.

    Analyze the following historical sales data:
    {{#each salesHistory}}
    - Sale of {{units}} unit(s) of '{{product}}' (SKU: {{sku}}, Category: {{category}}) for {{amount}} on {{date}}.
    {{/each}}

    Based on this data, you must generate a JSON object with the following structure:

    1.  **predictedSalesNextMonth**: Predict the total sales revenue for the single next calendar month.
    2.  **growthTrend**: Calculate the projected growth trend as a percentage for the next quarter compared to the last quarter.
    3.  **seasonalPeak**: Identify the month (by name, e.g., "Diciembre") that is projected to have the highest sales.
    4.  **salesPrediction**: Provide a month-by-month sales revenue forecast for the next {{predictionMonths}} months. Format the date as "MMM yy".
    5.  **categoryPrediction**: Provide a sales revenue forecast for the next quarter, broken down by the top 4-5 product categories.
    6.  **detailedPredictions**: Identify the 4 most impactful or trending products. For each, provide a unit sales prediction for the next month, a confidence level, and a concrete suggestion for inventory management.

    Analyze trends, seasonality, and product performance to make your predictions as accurate as possible.
    Your entire output must be a single, valid JSON object that adheres strictly to the output schema. Do not include any text before or after the JSON.
  `,
});

const predictSalesFlow = ai.defineFlow(
  {
    name: 'predictSalesFlow',
    inputSchema: SalesPredictionInputSchema,
    outputSchema: SalesPredictionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI failed to generate a prediction.');
    }
    return output;
  }
);


export async function predictSales(input: SalesPredictionInput): Promise<SalesPredictionOutput> {
  return predictSalesFlow(input);
}
