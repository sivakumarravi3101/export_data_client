import { type Insight } from "./productInsight"
import { type History } from "./Historys"
import { type MarketInsightMeta } from "./marketInsightMeta"
export interface ProductDemand {
    productName: string;
    hsCode: string;
    insights: Insight[];
    globalHistory: History[];
    productHistory: History[];
    metadata: MarketInsightMeta;
}