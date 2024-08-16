<script lang="ts" setup>
import MdEditor from 'md-editor-v3';
import PriceMarketChart from '@/components/charts/PriceMarketChart.vue';

import { Icon } from '@iconify/vue';
import {
  useBlockchain,
  useFormatter,
  useTxDialog,
  useWalletStore,
  useStakingStore,
  useParamStore, useBaseStore,
} from '@/stores';
import { onMounted, ref } from 'vue';
import { useIndexModule, colorMap } from './indexStore';
import { computed } from '@vue/reactivity';

import CardStatisticsVertical from '@/components/CardStatisticsVertical.vue';
import ProposalListItem from '@/components/ProposalListItem.vue';
import ArrayObjectElement from '@/components/dynamic/ArrayObjectElement.vue'
import AdBanner from '@/components/ad/AdBanner.vue';

const props = defineProps(['chain']);

const blockchain = useBlockchain();
const store = useIndexModule();
const walletStore = useWalletStore();
const format = useFormatter();
const dialog = useTxDialog();
const stakingStore = useStakingStore();
const paramStore = useParamStore()
const base = useBaseStore()
// const coinInfo = computed(() => {
//   return store.coinInfo;
// });

onMounted(() => {
  store.loadDashboard();
  walletStore.loadMyAsset();
  paramStore.handleAbciInfo()
  // if(!(coinInfo.value && coinInfo.value.name)) {
  // }
});
const ticker = computed(() => store.coinInfo.tickers[store.tickerIndex]);

const currName = ref("")
blockchain.$subscribe((m, s) => {
  if (s.chainName !== currName.value) {
    currName.value = s.chainName
    store.loadDashboard();
    walletStore.loadMyAsset();
    paramStore.handleAbciInfo()
  }
});
function shortName(name: string, id: string) {
  return name.toLowerCase().startsWith('ibc/') ||
    name.toLowerCase().startsWith('0x')
    ? id
    : name;
}

const comLinks = [
  {
    name: 'Website',
    icon: 'mdi-web',
    href: store.homepage,
  },
  {
    name: 'Twitter',
    icon: 'mdi-twitter',
    href: store.twitter,
  },
  {
    name: 'Telegram',
    icon: 'mdi-telegram',
    href: store.telegram,
  },
  {
    name: 'Github',
    icon: 'mdi-github',
    href: store.github,
  },
];

// wallet box
const change = computed(() => {
  const token = walletStore.balanceOfStakingToken;
  return token ? format.priceChanges(token.denom) : 0;
});
const color = computed(() => {
  switch (true) {
    case change.value > 0:
      return 'text-green-600';
    case change.value === 0:
      return 'text-grey-500';
    case change.value < 0:
      return 'text-red-600';
  }
});

function updateState() {
  walletStore.loadMyAsset()
}

function trustColor(v: string) {
  return `text-${colorMap(v)}`
}

const quantity = ref(100)
const qty = computed({
  get: () => {
    return parseFloat(quantity.value.toFixed(6))
  },
  set: val => {
    quantity.value = val
  }
})
const amount = computed({
  get: () => {
    return quantity.value * ticker.value.converted_last.usd || 0
  },
  set: val => {
    quantity.value = val / ticker.value.converted_last.usd || 0
  }
})

</script>

<template>
  <div>
    <div v-if="coinInfo && coinInfo.name" class="bg-base-100 rounded shadow">
      <div class="grid grid-cols-2 md:grid-cols-3 p-4">
        <div class="col-span-2 md:col-span-1">
          <div class="text-xl font-semibold text-main">
            {{ coinInfo.name }} (<span class="uppercase">{{
              coinInfo.symbol
            }}</span>)
          </div>
          <div class="text-xs mt-2">
            {{ $t('index.rank') }}:
            <div class="badge text-xs badge-error bg-[#fcebea] dark:bg-[#41384d] text-red-400">
              #{{ coinInfo.market_cap_rank }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 md:!grid-cols-3 lg:!grid-cols-6 mt-4">
      <div v-for="(item, key) in store.stats" :key="key">
        <CardStatisticsVertical v-bind="item" />
      </div>
    </div>

<!--    <AdBanner id="chain-home-banner-ad" unit="banner" width="970px" height="90px" />-->

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

    <div class="bg-base-100 rounded mt-4 shadow">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('block.recent') }} {{ $t('module.blocks') }}
      </div>

      <table class="table w-full table-compact">
        <thead class="bg-base-200">
        <tr>
          <th style="position: relative; z-index: 2;">{{ $t('account.height') }}</th>
          <th>Proposer</th>
          <th style="position: relative; z-index: 2;">{{ $t('account.hash') }}</th>
          <th>{{ $t('account.transactions') }}</th>
          <th>{{ $t('account.time') }}</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(item, index) in base.recents.slice(-9).reverse()" :index="index" class="hover">
          <td class="text-sm text-primary">
            <RouterLink :to="`/${props.chain}/block/${item.block.header.height}`">{{ item.block.header.height }}</RouterLink>
          </td>
          <td>
            <span class="text-sm text-primary dark:invert whitespace-nowrap overflow-hidden">
              <RouterLink
                :to="{
                  name: 'chain-staking-validator',
                  params: {
                    validator:
                      format.validatorOperatorAddress(item.block.header.proposer_address),
                    },
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
          <td>{{ item.block?.data?.txs.length }}</td>
          <td>{{ format.toDay(item.block?.header?.time, 'from') }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-base-100 rounded mt-4 shadow">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('block.recent') }} {{ $t('account.transactions') }}
      </div>
      <table class="table w-full table-compact">
        <thead class="bg-base-200">
        <tr>
          <th style="position: relative; z-index: 2;">{{ $t('account.height') }}</th>
          <th style="position: relative; z-index: 2;">{{ $t('account.hash') }}</th>
          <th>{{ $t('account.messages') }}</th>
          <th>{{ $t('block.fees') }}</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(item, index) in base.txsInRecents.slice(0,9)" :index="index" class="hover">
          <td class="text-sm text-primary">
            <RouterLink :to="`/${props.chain}/block/${item.height}`">{{ item.height }}</RouterLink>
          </td>
          <td class="truncate text-primary" width="50%">
            <RouterLink :to="`/${props.chain}/tx/${item.hash}`">{{
                item.hash
              }}</RouterLink>
          </td>
          <td>{{ format.messages(item.tx.body.messages) }}</td>
          <td>{{ format.formatTokens(item.tx.authInfo.fee?.amount) }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-base-100 rounded mt-4 shadow">
      <div class="flex justify-between px-4 pt-4 pb-2 text-lg font-semibold text-main">
        <span class="truncate" >{{ walletStore.currentAddress || 'Not Connected' }}</span>
        <RouterLink v-if="walletStore.currentAddress"
          class="float-right text-sm cursor-pointert link link-primary no-underline font-medium"
          :to="`/${chain}/account/${walletStore.currentAddress}`">{{ $t('index.more') }}</RouterLink>
      </div>
      <div class="grid grid-cols-1 md:!grid-cols-4 auto-cols-auto gap-4 px-4 pb-6">
        <div class="bg-gray-100 dark:bg-[#373f59] rounded-sm px-4 py-3">
          <div class="text-sm mb-1">{{ $t('account.balance') }}</div>
          <div class="text-lg font-semibold text-main">
            {{ format.formatToken(walletStore.balanceOfStakingToken) }}
          </div>
          <div class="text-sm" :class="color">
            ${{ format.tokenValue(walletStore.balanceOfStakingToken) }}
          </div>
        </div>
        <div class="bg-gray-100 dark:bg-[#373f59] rounded-sm px-4 py-3">
          <div class="text-sm mb-1">{{ $t('module.staking') }}</div>
          <div class="text-lg font-semibold text-main">
            {{ format.formatToken(walletStore.stakingAmount) }}
          </div>
          <div class="text-sm" :class="color">
            ${{ format.tokenValue(walletStore.stakingAmount) }}
          </div>
        </div>
        <div class="bg-gray-100 dark:bg-[#373f59] rounded-sm px-4 py-3">
          <div class="text-sm mb-1">{{ $t('index.reward') }}</div>
          <div class="text-lg font-semibold text-main">
            {{ format.formatToken(walletStore.rewardAmount) }}
          </div>
          <div class="text-sm" :class="color">
            ${{ format.tokenValue(walletStore.rewardAmount) }}
          </div>
        </div>
        <div class="bg-gray-100 dark:bg-[#373f59] rounded-sm px-4 py-3">
          <div class="text-sm mb-1">{{ $t('index.unbonding') }}</div>
          <div class="text-lg font-semibold text-main">
            {{ format.formatToken(walletStore.unbondingAmount) }}
          </div>
          <div class="text-sm" :class="color">
            ${{ format.tokenValue(walletStore.unbondingAmount) }}
          </div>
        </div>
      </div>

      <div v-if="walletStore.delegations.length > 0" class="px-4 pb-4 overflow-auto">
        <table class="table table-compact w-full table-zebra">
          <thead>
            <tr>
              <th>{{ $t('account.validator') }}</th>
              <th>{{ $t('account.delegations') }}</th>
              <th>{{ $t('account.rewards') }}</th>
              <th>{{ $t('staking.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in walletStore.delegations" :key="index">
              <td>
                <RouterLink class="link link-primary no-underline" :to="`/${chain}/staking/${item?.delegation?.validator_address}`">
                {{
                  format.validatorFromBech32(
                    item?.delegation?.validator_address
                  )
                }}
                </RouterLink>
              </td>
              <td>{{ format.formatToken(item?.balance) }}</td>
              <td>
                {{
                  format.formatTokens(
                    walletStore?.rewards?.rewards?.find(
                      (el) =>
                        el?.validator_address ===
                        item?.delegation?.validator_address
                    )?.reward)
                }}
              </td>
              <td>
                <div>
                  <label for="delegate" class="btn !btn-xs !btn-primary btn-ghost rounded-sm mr-2"
                    @click="dialog.open('delegate', { validator_address: item.delegation.validator_address }, updateState)">
                    {{ $t('account.btn_delegate') }}
                  </label>
                  <label for="withdraw" class="btn !btn-xs !btn-primary btn-ghost rounded-sm"
                    @click="dialog.open('withdraw', { validator_address: item.delegation.validator_address }, updateState)">
                    {{ $t('index.btn_withdraw_reward') }}
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid grid-cols-3 gap-4 px-4 pb-6 mt-4">
        <label for="PingTokenConvert" class="btn btn-primary text-white">{{ $t('index.btn_swap') }}</label>
        <label for="send" class="btn !bg-yes !border-yes text-white" @click="dialog.open('send', {}, updateState)">{{ $t('account.btn_send') }}</label>
        <label for="delegate" class="btn !bg-info !border-info text-white"
          @click="dialog.open('delegate', {}, updateState)">{{ $t('account.btn_delegate') }}</label>
        <RouterLink to="/wallet/receive" class="btn !bg-info !border-info text-white hidden">{{ $t('index.receive') }}</RouterLink>
      </div>
      <Teleport to="body">
        <ping-token-convert :chain-name="blockchain?.current?.prettyName" :endpoint="blockchain?.endpoint?.address"
          :hd-path="walletStore?.connectedWallet?.hdPath"></ping-token-convert>
      </Teleport>
    </div>

    <div class="bg-base-100 rounded mt-4">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('index.app_versions') }}
      </div>
      <!-- Application Version -->
      <ArrayObjectElement :value="paramStore.appVersion?.items" :thead="false" />
      <div class="h-4"></div>
    </div>

    <div v-if="!store.coingeckoId" class="bg-base-100 rounded mt-4">
      <div class="px-4 pt-4 pb-2 text-lg font-semibold text-main">
        {{ $t('index.node_info') }}
      </div>
      <ArrayObjectElement :value="paramStore.nodeVersion?.items" :thead="false" />
      <div class="h-4"></div>
    </div>
  </div>
</template>

<route>
  {
    meta: {
      i18n: 'dashboard',
      order: 1,
    }
  }
</route>
