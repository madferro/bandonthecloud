<template>
    <div class="flex undoredo">
        <button 
            :class="{
                'opacity-50 !cursor-default !bg-[#1e2025] !text-[#8d94a5]' : !canUndo
            }"
            :aria-label="canUndo?'Annulla':null" :data-balloon-pos="canUndo?'up':null" data-balloon-blunt data-balloon-nofocus 
            class="undo-btn cursor-pointer rounded-l-full bg-[#1e2025]  text-xl text-[#8d94a5] px-3 py-1 transition duration-200 hover:bg-[#2f323c] hover:text-white">
            <i class="bi-arrow-counterclockwise"></i>
        </button>
        <button 
            :class="{
                'opacity-50 !cursor-default !bg-[#1e2025] !text-[#8d94a5]' : !canRedo
            }"
            :aria-label="canRedo?'Ripristina':null" :data-balloon-pos="canRedo?'up':null" data-balloon-blunt data-balloon-nofocus
            class="redo-btn cursor-pointer rounded-r-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition duration-200 hover:bg-[#2f323c] hover:text-white">
            <i class="bi-arrow-clockwise"></i>
        </button>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {onMounted,ref,onBeforeUnmount} from 'vue'
    import interact from 'interactjs'
    import {useRefHistory} from '@vueuse/core'
    
    const _     = require('lodash')
    const store = useStore()
    const state = ref({
        bpm         : _.cloneDeep(store.getters.getProjectProperty("bpm")),
        divisions   : _.cloneDeep(store.getters.getProjectProperty("divisions")),
        tracks      : _.cloneDeep(store.getters.getProjectProperty("tracks"))
    });
    const { history, commit, undo, redo, canUndo, canRedo } = useRefHistory(state)
    
    //salvo nella history
    window.emitter.on('updateProjectHistory',(payload) => {
        state.value = _.cloneDeep(payload)
        commit()
    })
    window.emitter.on('projectLoadedFromDb',(payload) => {history.value[0].snapshot = payload})

    const doRedo = (event) => {
        event.preventDefault()
        if(canRedo.value){
            redo()
            store.commit("setProjectProperties",history.value[0].snapshot)
        }
    }

    const doUndo = (event) => {
        event.preventDefault()
        if(canUndo.value){
            undo()
            store.commit("setProjectProperties",history.value[0].snapshot)
        }
    }

    const keyupListener = (event) => {
        event.preventDefault();
        if(!event.ctrlKey) return

        switch(event.keyCode){
            case 90 : doUndo(event); break; 
            case 89 : doRedo(event); break; 
            default : break;
        }
    }

    onMounted(() => {
        interact('.undo-btn').on('tap', function (event) { doUndo(event) })
        interact('.redo-btn').on('tap', function (event) { doRedo(event) })
        document.addEventListener("keyup",keyupListener)
    }) 

    onBeforeUnmount(() => {
        interact('.undo-btn').unset()
        interact('.redo-btn').unset()
        document.removeEventListener("keyup",keyupListener)
    })

</script>