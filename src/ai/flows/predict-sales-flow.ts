'use server';
/**
 * @fileOverview A Genkit flow for predicting future sales trends.
 */
import { ai } from '@/ai/genkit';
import { SalesPredictionInput, SalesPredictionOutput, SalesPredictionInputSchema, SalesPredictionOutputSchema } from '@/ai/schemas/sales-prediction-schemas';

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
