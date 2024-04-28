<template>
    <div class="items-center h-16 flex flex-col w-40 justify-center">
        <!--<span class="rounded-t-lg uppercase text-xs text-[#8d94a5] block text-center w-full">zoom</span>-->
        <div class="flex w-full gap-1 items-center">
            <i class="bi bi-arrows text-gray-100"></i>
            <Slider 
                class="w-40 h-1" 
                v-model="zoom" 
                :min=10 
                :max=200 
                :step=10 
                tooltipPosition="top" 
                showTooltip="focus"
                :format="zoomFormat"
                :lazy=false
                @update="setZoom"
            ></Slider>
        </div>
        <div class="flex w-full gap-1 items-center">
            <i class="bi bi-arrows-vertical text-gray-100"></i>
            <Slider 
                class="w-40 h-1" 
                v-model="trackHeight" 
                :min=40 
                :max=500 
                :step=10 
                tooltipPosition="bottom" 
                showTooltip="focus"
                :format="trackHeightFormat"
                :lazy=false
                @update="setTrackHeight"
            ></Slider>
        </div>
        
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {ref,onMounted,watch} from 'vue'
    import interact from 'interactjs'
    import Slider from '@vueform/slider'

    const store             = useStore()
    const zoom              = ref(store.getters.getProjectProperty("zoom"));
    const trackHeight       = ref(store.getters.getProjectProperty("trackHeight"));
    const zoomFormat        = (value) => {return `Zoom: ${Math.ceil(value)} %`};
    const trackHeightFormat = (value) => {return `Altezza tracce: ${Math.ceil(value)}`};

    const setZoom           = (value) => {store.commit("setProjectProperties",{zoom:value})}
    const setTrackHeight    = (value) => {store.commit("setProjectProperties",{trackHeight:value})}

    watch(() => store.state.project.zoom, (newVal) => {
        zoom.value = newVal;
    });

    watch(() => store.state.project.trackHeight, (newVal) => {
        trackHeight.value = newVal;
    });

    onMounted(() => {
        interact('.decrement-zoom').on('tap', function (event) {event.preventDefault();store.commit('decrementZoom')})
        interact('.increment-zoom').on('tap', function (event) {event.preventDefault();store.commit('incrementZoom')})
    }) 

</script>