// Fixture API that mimics the real backend's shape: /countries, /categories, /products (OData-style $filter/$top/$skip,
// capped at 100 rows like a real API may be) and /export-demand/{hs}?countryId=. Includes a product with no country data.
import http from 'node:http'
import { pathToFileURL } from 'node:url'

const countries = [[2,'Australia'],[3,'Canada'],[4,'China'],[5,'Egypt'],[6,'Germany'],[8,'Japan'],[7,'Kuwait'],[9,'Malaysia'],[10,'Qatar'],[11,'United Arab Emirates'],[12,'United Kingdom'],[13,'United States']].map(([id,name])=>({id,name}))
const categories = [{id:1,name:'Agricultural Products'},{id:2,name:'Alcoholic Beverages'},{id:3,name:'Cereals'}]
const products = [
  ['12099160','TOMATO SEEDS',1],['22087011','LIQUERS IN CONTAINERS HOLDING 2 LTR OR LESS',2],['10063020','BASMATI RICE',3],
  ['08045020','FRESH MANGOES & PULP',1],['12024200','GROUNDNUT, SHELLED',3],['99999999','ZZ NO DATA PRODUCT',1]]
for (let i=1;i<=40;i++) products.push([String(30000000+i),`TEST PRODUCT ${i}`,1+(i%3)])
let rid = 1000
const rows = []
for (const c of countries) for (const [hs,name,cat] of products) for (let i=0;i<5;i++)
  rows.push({ id: rid++, productId: Number(hs.slice(-3)), countryId: c.id, categoryId: cat, hsCode: hs, year: ['2021-22','2022-23','2023-24','2024-25','2025-26'][i], productValue: 0, quantity: 0.09, countryName: c.name, categoryName: categories.find(x=>x.id===cat).name, productName: name, state:'Maharashtra', port:'NHAVA SHEVA SEA', createdAt:`2026-09-${10+i}T16:47:09.11703Z` })
const demand = (hs, cid) => {
  const p = products.find(x=>x[0]===hs); if (!p) return null
  const c = countries.find(x=>x.id===cid)
  const insights = hs==='99999999' || !c ? [] : [{ countryName:c.name, trendSignal:'DECLINING', growthRate:'-4.80%', currentPriceMT:589743.59, avgPrice5Yr:192575.41, priceTrend:'PREMIUM_RISING', marketShare:4.41, pricePerMT:0, peakYear:'2024-25', riskLevel:'Medium' }]
  return { productName:p[1], hsCode:hs, insights,
    globalHistory:[{year:'2020-21',valueMillionUSD:7.29},{year:'2021-22',valueMillionUSD:5.72},{year:'2023-24',valueMillionUSD:7.95},{year:'2024-25',valueMillionUSD:9.37},{year:'2025-26',valueMillionUSD:7.34}],
    productHistory:[{year:'2020-21',valueMillionUSD:0.28},{year:'2021-22',valueMillionUSD:0.28},{year:'2023-24',valueMillionUSD:0.27},{year:'2024-25',valueMillionUSD:0.6},{year:'2025-26',valueMillionUSD:0.23}],
    metadata:{ source:'APEDA (Agricultural and Processed Food Products Export Development Authority, India)', data_quality:'Official Government Trade Statistics', reporting_lag:'6-12 Months', last_full_year_analyzed:'2025-26', disclaimer:'Historical trends do not guarantee future performance.', methodology:'5-year rolling window.' } }
}
export const calls = []
const server = http.createServer((req,res)=>{
  const u = new URL(req.url,'http://x'); calls.push(req.url)
  const send=(o,s=200)=>{res.writeHead(s,{'content-type':'application/json','access-control-allow-origin':'*'});res.end(JSON.stringify(o))}
  if (u.pathname==='/countries') return send(countries)
  if (u.pathname==='/categories') return send(categories)
  if (u.pathname==='/products') {
    const f = u.searchParams.get('$filter')??''; const cid = Number(/countryId eq (\d+)/.exec(f)?.[1]); const cat = /categoryId eq (\d+)/.exec(f)?.[1]
    let r = rows.filter(x=>x.countryId===cid && (!cat || x.categoryId===Number(cat)))
    const top=Number(u.searchParams.get('$top')??50), skip=Number(u.searchParams.get('$skip')??0)
    return send({ items: r.slice(skip, skip+Math.min(top,100)) })   // server caps at 100 rows like a real API might
  }
  const m = /^\/export-demand\/(\d+)$/.exec(u.pathname)
  if (m) { const d = demand(m[1], Number(u.searchParams.get('countryId'))); return d ? send(d) : send({message:'nf'},404) }
  send({message:'not found'},404)
})

export const startMockApi = (port = 4010) => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(port, '127.0.0.1', () => resolve({ port, close: () => new Promise(r => server.close(() => r())) }))
})

// `node tests/fixtures/mock-api.mjs` runs it standalone, so the whole build can be tried without the real backend.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startMockApi(Number(process.env.PORT ?? 4010)).then(s => console.log(`mock api on ${s.port}`))

