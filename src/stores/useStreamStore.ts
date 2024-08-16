import { defineStore } from 'pinia';
import { useBlockchain } from './useBlockchain';

export const useStreamStore = defineStore('streamStore', {
    state: () => {
        return {
            params: {},
        };
    },
    getters: {
        blockchain() {
            return useBlockchain();
        },
    },
    actions: {
        initial() {
            this.fetchParams();
        },
        async fetchParams() {
            const response = await this.blockchain.rpc?.getStreamParams();
            if (response?.params) this.params = response.params;
            return this.params;
        },
    },
});
