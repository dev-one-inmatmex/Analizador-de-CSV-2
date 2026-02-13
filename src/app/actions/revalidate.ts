'use server';

import { revalidatePath } from 'next/cache';

/**
 * Revalidates the cache for all dashboard pages.
 * This ensures that after a data sync, the dashboards will show the latest data.
 */
export async function revalidateDashboards() {
    try {
        // Revalidate all pages that might be affected by data uploads
        revalidatePath('/historical-analysis/sales', 'page');
        revalidatePath('/historical-analysis/operations', 'page');
        revalidatePath('/historical-analysis/publications', 'page');
        revalidatePath('/historical-analysis/major-minor-sales', 'page');
        revalidatePath('/historical-analysis/trends-prediction', 'page');
        revalidatePath('/historical-analysis/mother-catalog', 'page');
        revalidatePath('/historical-analysis/sku-publication-count', 'page');
        revalidatePath('/historical-analysis/sku-publication-map', 'page');
        
        console.log('Successfully revalidated all dashboard paths.');

        return { success: true, message: 'Dashboards actualizados con los últimos datos.' };
    } catch (error) {
        console.error('Error revalidating dashboards:', error);
        return { success: false, message: 'No se pudo actualizar la cache de los dashboards.' };
    }
}
