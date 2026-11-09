<script setup lang="ts">
import type { MarketOverview } from "@/lib/marketOverview";
import type { MoneyFormat } from "@/lib/currency";

defineProps<{
  overview: MarketOverview | null;
  countryName: string;
  idle: boolean;
  loading: boolean;
  error: string | null;
  money: (usd: number, fmt?: MoneyFormat) => string;
  rateNote: string | null;
  rateError: string | null;
}>();

const label = (s: string) =>
  s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
const tone = (signal: string) =>
  signal.includes("GROWTH")
    ? "up"
    : signal.includes("DECLIN")
    ? "down"
    : "flat";
</script>

<template>
  <article class="lg-panel overview" aria-live="polite">
    <header class="head">
      <div>
        <h2>Market overview</h2>
        <p v-if="overview" class="sub">
          {{ overview.product.name }} &middot; HS {{ overview.product.hsCode }}
        </p>
      </div>
      <div class="actions"><slot name="actions" /></div>
    </header>
    <p v-if="rateNote" class="rate">{{ rateNote }}</p>
    <p v-if="rateError" class="warn" role="alert">{{ rateError }}</p>

    <p v-if="idle" class="note">
      Select a product to see its price, trend and market share in
      {{ countryName }}.
    </p>
    <div
      v-else-if="loading"
      class="skels"
      role="status"
      aria-label="Loading market details"
    >
      <div class="lg-skel big" />
      <div class="lg-skel" />
      <div class="lg-skel" />
    </div>
    <p v-else-if="error" class="note err" role="alert">{{ error }}</p>

    <template v-else-if="overview">
      <template v-if="overview.market">
        <section class="price">
          <div class="primary">
            <span class="k">Market price</span>
            <strong>{{ money(overview.market.price.currentPerMT) }}</strong>
            <span class="u">per metric tonne (MT)</span>
          </div>
          <dl class="pair">
            <div>
              <dt>5-year average</dt>
              <dd>
                {{ money(overview.market.price.avg5YrPerMT) }}
                <small>/ MT</small>
              </dd>
            </div>
            <div v-if="overview.market.price.reportedPerMT !== null">
              <dt>Reported price</dt>
              <dd>
                {{ money(overview.market.price.reportedPerMT) }}
                <small>/ MT</small>
              </dd>
            </div>
          </dl>
        </section>

        <section class="trend">
          <span class="k">Market trend</span>
          <div class="trow">
            <span class="badge" :class="tone(overview.market.trend.signal)">{{
              label(overview.market.trend.signal)
            }}</span>
            <span
              >Growth <b>{{ overview.market.trend.growthRate }}</b></span
            >
            <span
              >Price <b>{{ label(overview.market.trend.priceTrend) }}</b></span
            >
          </div>
        </section>

        <dl class="facts">
          <div>
            <dt>Market share</dt>
            <dd>{{ overview.market.marketSharePct }}%</dd>
          </div>
          <div>
            <dt>Risk level</dt>
            <dd :class="overview.market.riskLevel.toLowerCase()">
              {{ overview.market.riskLevel }}
            </dd>
          </div>
          <div>
            <dt>Peak year</dt>
            <dd>{{ overview.market.trend.peakYear }}</dd>
          </div>
        </dl>
      </template>
      <p v-else class="note">
        No market data is available for {{ countryName }} for this product.
      </p>

      <p class="meta">
        Source: {{ overview.source }}. {{ overview.disclaimer }}
      </p>
    </template>
  </article>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
h2 {
  margin: 0;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}
.sub {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--lg-muted);
  overflow-wrap: anywhere;
}
.actions {
  margin-left: auto;
}
.rate {
  margin: 0 0 12px;
  font-size: 0.75rem;
  color: var(--lg-muted);
}
.warn {
  margin: 0 0 12px;
  padding: 8px 12px;
  font-size: 0.82rem;
  border-radius: 10px;
  color: #7a4a00;
  background: rgba(255, 193, 77, 0.3);
}
.note {
  margin: 0;
  color: var(--lg-muted);
  line-height: 1.5;
}
.err {
  color: var(--lg-red);
}
.k {
  display: block;
  font-size: 0.78rem;
  color: var(--lg-muted);
  margin-bottom: 4px;
}
.price {
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.8);
}
.primary strong {
  display: block;
  font-size: clamp(1.7rem, 3.4vw, 2.4rem);
  letter-spacing: -0.02em;
  line-height: 1.1;
  overflow-wrap: anywhere;
}
.u {
  font-size: 0.8rem;
  color: var(--lg-muted);
}
.pair {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin: 14px 0 0;
}
dt {
  font-size: 0.76rem;
  color: var(--lg-muted);
  margin-bottom: 2px;
}
dd {
  margin: 0;
  font-weight: 600;
}
dd small {
  font-weight: 400;
  color: var(--lg-muted);
}
.trend {
  margin-top: 16px;
}
.trow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 0.9rem;
}
.badge {
  padding: 3px 12px;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.82rem;
}
.badge.up {
  background: rgba(10, 143, 90, 0.14);
  color: var(--lg-green);
}
.badge.down {
  background: rgba(194, 58, 58, 0.13);
  color: var(--lg-red);
}
.badge.flat {
  background: rgba(10, 99, 216, 0.12);
  color: #0a4fb0;
}
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
  margin: 16px 0 0;
}
.facts div {
  padding: 11px 13px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.8);
}
.facts .low {
  color: var(--lg-green);
}
.facts .medium {
  color: var(--lg-amber);
}
.facts .high {
  color: var(--lg-red);
}
.meta {
  margin: 20px 0 0;
  font-size: 0.74rem;
  line-height: 1.5;
  color: var(--lg-muted);
}
.skels {
  display: grid;
  gap: 10px;
}
.skels div {
  height: 56px;
}
.skels .big {
  height: 120px;
}
</style>
