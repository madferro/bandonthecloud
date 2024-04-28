<template>
    <div :class="`fixed opacity-100 flex flex-col top-0 left-0 w-screen h-screen bg-[rgb(36,38,45)] flex items-center justify-center z-[9999] ${getLoadingPerc() == 100?'loaded':''}`">
        <img src="../../assets/bandonthecloud_logo.svg" class="w-1/4 h-auto"/>
        <div class="bg-[#1e2025] rounded-full w-1/4 h-1 mt-4">
            <div :style="{width: getLoadingPerc() + '%'}" class="duration-300 h-full bg-green-400 rounded-full"></div>
        </div>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import { ref } from 'vue'

    const store = useStore();

    let loadingStates = ref({
        'setInputDevices'   : false,
        'setLoops'          : false,
        'setProjectFromDb'  : false,
        'setUser'           : false
    });

    const getLoadingPerc = () => {
        let totEvents = Object.keys(loadingStates.value).length;
        let completedEvents = 0;

        Object.keys(loadingStates.value).forEach(key => {
            if(loadingStates.value[key] === true){
                completedEvents++;
            }   
        });

        if(totEvents == completedEvents){
            unsubscribeToStore()
        }
        return (completedEvents/totEvents) * 100;
    }

    const unsubscribeToStore = store.subscribe((mutation) => {
        if(Object.hasOwnProperty.call(loadingStates.value, mutation.type)){
            loadingStates.value[mutation.type] = true;
        }
    })
    
    window.emitter.on('notLogged',() => {
        loadingStates.value['setUser'] = true
        loadingStates.value['setProjectFromDb'] = true
    })

</script>

<style computed>
.loaded{
    opacity:0 !important;
    z-index:-1 !important;
    transition-property: opacity, z-index;
    transition-duration: 0.3s, 0s; /* 0s per opacity, 0.3s per z-index */
    transition-delay: 0.2s, 0.5s; /* 0s per opacity, 0.3s per z-index */
}
</style>