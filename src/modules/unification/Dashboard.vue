<script lang="ts" setup>
// Unification-fork dashboard. Registered as a route override for /u and /u-devnet
// in src/router/index.ts so future upstream rebases on src/modules/[chain]/index.vue
// don't conflict with this customisation.
//
// Differences from upstream's chain dashboard:
//   - No PriceMarketChart / CoinInfo / ticker section (the original commit
//     reasoned that pricing data was unreliable; the route override gives
//     this view irrespective of coingecko coverage).
//   - Adds Recent Blocks and Recent Transactions tables sourced from the
//     existing useBaseStore.
//
// The chain stats grid + active proposals come from the standard useIndexModule
// store, identical to upstream — feature flagged by chain config the same way.

import { Icon } from '@iconify/vue';
import { useBlockchain, useBaseStore, useFormatter, useParamStore } from '@/stores';
import { useIndexModule } from '@/modules/[chain]/indexStore';
import { onMounted, ref, computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';

import CardStatisticsVertical from '@/components/CardStatisticsVertical.vue';
import ProposalListItem from '@/components/ProposalListItem.vue';
import DynamicComponent from '@/components/dynamic/DynamicComponent.vue';

const route = useRoute();
const chain = computed(() => (route.params.chain as string) || route.path.replace(/^\//, '').split('/')[0]);

const blockchain = useBlockchain();
const store = useIndexModule();
const base = useBaseStore();
const format = useFormatter();
const paramStore = useParamStore();

onMounted(() => {
  if (chain.value && chain.value !== blockchain.chainName) {
    blockchain.setCurrent(chain.value);
  }
  store.loadDashboard();
  paramStore.handleAbciInfo();
});

const currName = ref('');
blockchain.$subscribe((_m, s) => {
  if (s.chainName !== currName.value) {
    currName.value = s.chainName;
    store.loadDashboard();
    paramStore.handleAbciInfo();
  }
});
</script>

<template>
  <div>
    <!-- chain header -->
    <div class="bg-base-100 rounded shadow mb-4 p-4 flex items-center gap-3">
      <img v-if="blockchain.current?.logo" :src="blockchain.current.logo" class="w-12 h-12 rounded-full" />
      <div>
        <div class="text-xl font-semibold text-main">
          {{ blockchain.current?.prettyName || chain }}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {{ blockchain.current?.chainName }} · SDK {{ blockchain.current?.versions?.cosmosSdk }}
        </div>
      </div>
    </div>

    <!-- chain stats: height, supply, bonded, Price, community pool, inflation.
         Price was previously filtered out because the card rendered "$--"; the feed does
         resolve (chains/*/unification.json maps base `nund` -> coingecko_id `unification`),
         so it is shown again. NB on TestNet this is the MainNet FUND market price — the
         coingecko id is the same in both chain configs. -->
    <div class="grid grid-cols-1 gap-4 md:!grid-cols-3 lg:!grid-cols-6">
      <div v-for="(item, key) in store.stats" :key="key">
        <CardStatisticsVertical v-bind="item" />
      </div>
    </div>

    <!-- active proposals (gated by gov feature) -->
    <div v-if="blockchain.supportModule('governance')" class="bg-base-100 rounded mt-4 shadow">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('index.active_proposals') }}
      </div>
      <div class="px-4 pb-4">
        <ProposalListItem :proposals="store?.proposals" />
      </div>
      <div class="pb-8 text-center" v-if="store.proposals?.proposals?.length === 0">
        {{ $t('index.no_active_proposals') }}
      </div>
    </div>

    <!-- recent blocks -->
    <div class="bg-base-100 rounded mt-4 shadow">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('block.recent') }} {{ $t('module.blocks') }}
      </div>
      <table class="table w-full table-compact">
        <thead class="bg-base-200">
          <tr>
            <th>{{ $t('account.height') }}</th>
            <th>Proposer</th>
            <th>{{ $t('account.hash') }}</th>
            <th>{{ $t('account.transactions') }}</th>
            <th>{{ $t('account.time') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in base.recents.slice(-9).reverse()" :key="index" class="hover">
            <td class="text-sm text-primary">
              <RouterLink :to="`/${chain}/block/${item.block.header.height}`">
                {{ item.block.header.height }}
              </RouterLink>
            </td>
            <td>
              <span class="text-sm text-primary dark:invert whitespace-nowrap overflow-hidden">
                <RouterLink
                  :to="{
                    name: 'chain-staking-validator',
                    params: { validator: format.validatorOperatorAddress(item.block.header.proposer_address) },
                  }"
                  class="font-weight-medium"
                >
                  {{ format.validator(item.block.header.proposer_address) }}
                </RouterLink>
              </span>
            </td>
            <td class="truncate text-primary" width="50%">
              <DynamicComponent :value="item.block_id.hash" />
            </td>
            <td>{{ item.block?.data?.txs?.length || 0 }}</td>
            <td>{{ format.toDay(item.block?.header?.time, 'from') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- recent transactions -->
    <div class="bg-base-100 rounded mt-4 mb-4 shadow">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('block.recent') }} {{ $t('account.transactions') }}
      </div>
      <table class="table w-full table-compact">
        <thead class="bg-base-200">
          <tr>
            <th>{{ $t('account.height') }}</th>
            <th>{{ $t('account.hash') }}</th>
            <th>{{ $t('account.messages') }}</th>
            <th>{{ $t('block.fees') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in base.txsInRecents.slice(0, 9)" :key="index" class="hover">
            <td class="text-sm text-primary">
              <RouterLink :to="`/${chain}/block/${item.height}`">{{ item.height }}</RouterLink>
            </td>
            <td class="truncate text-primary" width="50%">
              <RouterLink :to="`/${chain}/tx/${item.hash}`">{{ item.hash }}</RouterLink>
            </td>
            <td>{{ item.tx?.body?.messages?.length || 0 }}</td>
            <td>{{ format.formatTokens(item.tx?.authInfo?.fee?.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
