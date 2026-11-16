import client from '@/http/client'
import { type ProductDemand } from '@/models/exportDemandProduct'

export async function getExportProductByHsncode(
    hsnCode: string,
    countryId: number,
    prerenderToken?: string,
): Promise<ProductDemand> {

    const response = await client.get(`/export-demand/${hsnCode}?countryId=${countryId}`, {
        headers: prerenderToken
            ? { 'X-Prerender-Token': prerenderToken }
            : {},
    })

    return response.data as ProductDemand
}