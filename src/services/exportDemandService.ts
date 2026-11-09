import client from '@/http/client'
import { type ProductDemand } from '@/models/exportDemandProduct'

export async function getExportProductByHsncode(
    hsnCode: string,
    countryId: number
): Promise<ProductDemand> {

    const response = await client.get(`/export-demand/${hsnCode}?countryId=${countryId}`)

    return response.data as ProductDemand
}