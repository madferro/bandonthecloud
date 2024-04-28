<template>
    <LoopsPanel></LoopsPanel>
    <div ref="grid" id="total-grid" class="total-grid w-full h-full overflow-x-auto overflow-y-auto grid flex-wrap">
        <TrackHeadersSection></TrackHeadersSection>
        <div class="grid track-grid">
            <RulerSection></RulerSection>
            <TracksSection></TracksSection>
        </div>
    </div>
</template>

<script setup>
    //console.log(rulerPosition * state.project.unitSize, document.getElementById('total-grid').offsetWidth - document.getElementById('track-headers-section').offsetWidth)
    import TracksSection from './body/tracks/TracksSection.vue'
    import RulerSection from './body/ruler/RulerSection.vue'
    import TrackHeadersSection from './body/trackHeaders/TrackHeadersSection.vue'
    import LoopsPanel from './body/panels/LoopsPanel.vue'
    import {ref,computed,watch} from 'vue'
    import {useStore} from 'vuex'

    const store             = useStore()
    const grid              = ref(null)
    const rulerPosition     = computed(() => store.getters.getProjectProperty("rulerPosition"))
    const isPlaying         = computed(() => store.getters.getProjectProperty("playing"))

    watch(rulerPosition,(newVal) => {
    
        const unitSize = store.getters.getProjectProperty("unitSize")

        const absoluteRulerPosition = newVal * unitSize
        const trackContainerWidth = (grid.value.offsetWidth - document.getElementById('track-headers-section').offsetWidth) - (unitSize * 4) + grid.value.scrollLeft
        if((absoluteRulerPosition >= trackContainerWidth) && isPlaying.value){
            grid.value.scrollLeft += (grid.value.offsetWidth - document.getElementById('track-headers-section').offsetWidth) / 2
        }
    })

    
    window.emitter.on('backToBegin',() => grid.value.scrollLeft = 0)
</script>

<style>
#center-container{
    box-shadow: 0 65px 50px -12px rgba(0,0,0,1);
}

.total-grid{
    grid-template-columns: 288px 1fr;
}

.track-grid{
    grid-template-rows: 35px 1fr;
    box-sizing: border-box;
}
</style>