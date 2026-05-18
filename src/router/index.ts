import { useBlockchain, useDashboard } from '@/stores';
import { createRouter, createWebHistory } from 'vue-router';
// @ts-ignore
import { setupLayouts } from 'virtual:generated-layouts';
// @ts-ignore
import routes from '~pages';
import UnificationDashboard from '@/modules/unification/Dashboard.vue';

// Unification-fork route overrides. Static paths take precedence over the
// file-based dynamic /:chain/ route, so /u and /u-devnet render the custom
// dashboard instead of the upstream chain index. Kept in this file (rather
// than touching src/modules/[chain]/index.vue) so upstream rebases stay clean.
const unificationOverrides = setupLayouts([
  { path: '/u', component: UnificationDashboard, meta: { layout: 'default' } },
  { path: '/u-devnet', component: UnificationDashboard, meta: { layout: 'default' } },
]);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...unificationOverrides, ...setupLayouts(routes)],
});

//update current blockchain
router.beforeEach(async (to) => {
  const { chain } = to.params;
  if (!chain) return;
  const dashboard = useDashboard();
  // Ensure chains are loaded before checking — chains/*.json are loaded lazily
  // on first navigation; without this await, a direct hit on /<chain> bypasses
  // the allowlist check below.
  if (dashboard.length === 0) {
    await dashboard.initial();
  }
  const chainName = chain.toString();
  // Unification fork: when VITE_CHAINS_ALLOWLIST is in effect, the dashboard
  // store only loads the listed chains. Navigating to a filtered-out chain
  // would otherwise crash the upstream chain-index components on missing
  // chain config. Redirect to the first allowed chain instead.
  if (!dashboard.chains[chainName]) {
    const fallback = Object.keys(dashboard.chains)[0];
    return fallback ? { path: `/${fallback}` } : { path: '/' };
  }
  const blockchain = useBlockchain();
  if (chainName !== blockchain.chainName) {
    blockchain.setCurrent(chainName);
  }
});

// Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards

export default router;
