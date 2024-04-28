<template>
    <div class="ml-auto flex">
        <button 
            aria-label="Torna all'inizio" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus 
            class="back-btn rounded-l-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition duration-200 hover:bg-[#2f323c] hover:text-white">
            <i class="bi-skip-start-fill"></i>
        </button>
        <button 
            :aria-label="(!selectedTrack)?'Seleziona una traccia per registrare':(!isRecording)?'Registra':'Ferma la registrazione'" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus
            class="record-btn bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition duration-200 hover:bg-red-500 hover:text-white"
            :class="{
                '!bg-[#1e2025] !text-[#8d94a5] !cursor-not-allowed' :  (!selectedTrack),
                '!bg-red-500 !text-white' :  (selectedTrack && isRecording)
            }"
        >
            <i class="bi-record-fill"></i>
        </button>
        <button v-if="isPlaying"
            aria-label="Pausa" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus
            class="playstop-btn rounded-r-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition-all duration-200 hover:bg-amber-400 hover:text-white">
            <i className="bi-pause-fill"></i>
        </button>
        <button v-if="!isPlaying"
            aria-label="Play" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus
            class="playstop-btn rounded-r-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition-all duration-200 hover:bg-green-500 hover:text-white">
            <i class="bi-play-fill"></i>
        </button>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {computed,onMounted,watch} from 'vue'
    import interact from 'interactjs'
    import {Metronome} from '../../../utils/utils'

    const store             = useStore();
    const isPlaying         = computed(() => store.getters.getProjectProperty("playing"))
    const isRecording       = computed(() => store.getters.getProjectProperty("recording"))
    const selectedTrack     = computed(() => store.getters.getSelectedTrack())
    const bpm               = computed(() => store.getters.getProjectProperty("bpm"))
    const divisions         = computed(() => store.getters.getProjectProperty("divisions"))
    const preroll           = new Metronome(bpm.value, divisions.value)
    const prerollBatt       = computed(() => parseInt(store.getters.getProjectProperty("prerollBatt")))

    //store.dispatch('play');

    onMounted(() => {
        interact('.record-btn').on('tap', function () {
            if(!selectedTrack.value) return
            if(!isRecording.value){
                if(prerollBatt.value > 0){
                    preroll.on('preroll-stop',() => {
                        store.commit('toggleRecording')
                    })
                    preroll.start(prerollBatt.value);
                }else{
                    store.commit('toggleRecording')
                }
            }else{
                store.commit('toggleRecording')
            }
            
        })

        interact('.playstop-btn').on('tap', function () {
            if(!isPlaying.value){
                store.dispatch('playerPlay')
            }else{
                store.dispatch('playerStop')
            }
        })

        interact('.back-btn').on('tap', function () {
            store.commit('setRulerPosition',0)
            window.emitter.emit('backToBegin')
        })
    }) 

    watch(() => store.state.project.bpm, (newVal) => {
        preroll.setTempo(newVal);
    })

    watch(() => store.state.project.divisions, (newVal) => {
        preroll.setDivisions(newVal);
    })
</script>