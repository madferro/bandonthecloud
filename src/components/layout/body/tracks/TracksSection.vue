<template>
    <div 
        id="tracks" 
        class="flex box-border flex-grow pb-[68px] relative overflow-y-hidden w-full "
        :style="{width : ((maxBatt * (16 * (divisions[0] / divisions[1]))) * unitSize) + 8 +'px'}"
    >
        <div class="h-full min-w-[8px]"></div>
        <div id="tracks-container" class="h-full flex flex-col">
            <TrackItem v-for="(track,index) in tracks" :key="track.id+'-'+index" :track=track></TrackItem>
        </div>
    </div>
</template>
<script setup>
    import {ref,computed,watch} from 'vue'
    import TrackItem from './TrackItem'
    import {useStore} from 'vuex'

    const store                 = useStore();
    const tracks                = computed(() => store.getters.getProjectProperty("tracks"))
    const maxBatt               = computed(() => store.getters.getProjectProperty("maxBatt"))
    const unitSizeFromStore     = computed(() => store.getters.getUnitSize)
    const divisions             = computed(() => store.getters.getProjectProperty("divisions"))
    const unitSize              = ref(unitSizeFromStore)

    watch(unitSize, (newVal) => {
        store.commit("setProjectProperties",{unitSize:newVal})
    });
</script>