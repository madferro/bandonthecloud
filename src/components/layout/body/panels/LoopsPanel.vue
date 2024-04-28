<template>
    <div id="loops-panel" class="rounded-tl-lg shadow-2xl shadow-black absolute min-w-[700px] w-1/2 bg-[#1e2025] top-0 right-0 bottom-[42px] z-[200] overflow-hidden flex flex-col" v-show="isActive">
        <div class="flex items-center bg-gradient-to-br from-indigo-500 to-indigo-600 text-gray-100 text-sm">
            <div class="p-4 flex-grow">
                <i class="bi-music-note-list mr-2"></i>
                <span>Libreria loop e suoni</span>
            </div>
            <a id="close-panel" class="bg-[transparent] hover:bg-gray-100 hover:text-[#1a1d21] transition duration-200 p-4 text-gray-100 inline-block text-sm cursor-pointer">
                <i class="bi bi-x inline-block align-middle"></i>
                <span class="inline-block align-middle">Chiudi</span>
            </a>
        </div>
        <div class="flex flex bg-[#24262d] text-gray-100 overflow-hidden w-full">
            <div class="p-4 flex flex-col overflow-y-auto w-1/2">
                <div class="w-full rounded-lg bg-[#1e2025] flex relative flex-wrap gap-2 pt-8 pb-2 px-2 mb-2"
                    v-for="(filter,filterName) in filters" :key="filterName"
                >
                    <div class="text-xs rounded-tl-lg rounded-br-lg px-2 py-1 inline-block bg-gradient-to-br from-indigo-500 to-indigo-600 absolute top-0 left-0">
                        {{filtersLabels[filterName]}}
                    </div>
                    <button 
                        :data-filtertype="filterName" 
                        :data-filterval="filterValue" 
                        :class="getSelectedClasses(filterName,filterValue)"
                        class="flex filter-btn px-1 py-1 bg-[#31343d] hover:bg-[#444855] text-gray-200 text-xs hover:no-underline hover:text-white rounded transition-all duration-200 justify-center"
                        v-for="filterValue in filter" :key="filterValue"
                    >
                        <span>{{ filterValue }}</span>
                    </button>
                </div>
            </div>
            <div class="flex flex-col overflow-hidden w-1/2">
                <div class="loops-container overflow-y-auto p-4 bg-[#1e2025] z-[50]">
                    <div ref="dragElement" 
                        id="drag-placeholder"
                        class="top-0 left-0 gap-2 flex items-center justify-center rounded-lg bg-[rgba(75,222,128,0.9)] shadow-lg shadow-[rgba(75,222,128,0.4)] fixed p-2" 
                        :class="{
                            'flex-col' : trackHeight > 60
                        }"
                        :style="{
                            height  : trackHeight + 'px',
                            width   : dragElementWidth + 'px'
                        }"
                        v-if="dragging"
                    >
                        <div 
                            class="text-xs text-center text-white flex-grow"
                        >{{ draggingTitle }}</div>
                        <img class="w-auto" 
                            src="../../../../assets/drag-audio.svg"
                            :style="{
                                height : (trackHeight > 60)?trackHeight - 24 - 16 + 'px':trackHeight - 16 + 'px'
                            }"
                        >
                    </div>
                    <ul>
                        <li v-for="loop in filteredLoops" :key="loop.id" class="loop-item-container flex pb-2 pt-1 w-full flex border-b border-[#383845] justify-center" :data-loopid="loop.id" :data-loopname="loop.name">
                            <div class="loop-item w-2/3 items-start text-sm flex flex-col justify-center">
                                <div class="block">{{ loop.name }}</div>
                                <div class="block text-[10px] font-bold loop-tags flex gap-1 mt-1">
                                    <div :class="`bg-gradient-to-br px-1 py-0 rounded text-gray-100 flex items-center from-${filtersColors['genre']}-500 to-${filtersColors['genre']}-600`" v-if="loop.genre.length > 0">{{ loop.genre }}</div>
                                    <div :class="`bg-gradient-to-br px-1 py-0 rounded text-gray-100 flex items-center  from-${filtersColors['bpm']}-500 to-${filtersColors['bpm']}-600`" v-if="loop.bpm.length > 0">{{ loop.bpm }}</div>
                                    <div :class="`bg-gradient-to-br px-1 py-0 rounded text-gray-100 flex items-center  from-${filtersColors['beats']}-500 to-${filtersColors['beats']}-600`" v-if="loop.beats.length > 0">{{ loop.beats }}</div>
                                    <div :class="`bg-gradient-to-br px-1 py-0 rounded text-gray-100 flex items-center  from-${filtersColors['sound']}-500 to-${filtersColors['sound']}-600`" v-if="loop.sound.length > 0">{{ loop.sound }}</div>
                                </div>
                            </div>
                            <div class="loop-actions flex w-1/3 justify-end pb-1 pt-2 ">
                                <button 
                                    class="preview-loop-btn rounded-l-full bg-[#121617] text-xl text-[#8d94a5] px-3 py-1 transition duration-200 hover:bg-green-500 hover:text-white">
                                    <i class='bi bi-play-fill' aria-hidden="true"></i>
                                </button>
                                <button 
                                    class="insert-loop-btn rounded-r-full bg-[#121617] text-xl text-[#8d94a5] px-3 py-1 transition-all duration-200 hover:bg-green-500 hover:text-white">
                                    <i class='bi bi-plus' aria-hidden="true"></i>
                                </button>
                            </div>
                        </li>
                    </ul>
                </div>
                <div class="preview-player bg-[#1e2025] flex items-center w-full z-[50]" v-show="previewPlyerOpened">
                    <div class="flex flex-col w-full pt-1 pb-2 px-2 justify-center">
                        <button 
                            class="close-preview text-white block ml-auto mr-0 opacity-100 relative text-right top-0 w-[24px] h-[24px]">
                                &times;
                        </button>         
                        <div class="text-white text-sm font-bold text-center pb-[5px]">{{ previewAudioName }}</div>         
                        <audio id="preview-player" class="w-full" controls @loadeddata="loadedPreviewData">
                            <source :src="previewAudioSource" :type="previewAudioType" />
                        </audio>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import interact from 'interactjs'
    import {addEvent} from '../../../store/store'
    import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
    import { getAudioBlobFromServer,getAudioDuration } from '@/utils/utils'

    const store             = useStore()
    const trackHeight       = computed(() => store.getters.getProjectProperty("trackHeight"))
    const dragElement       = ref(null)
    const dragElementWidth  = ref(150)
    const dragging          = ref(false)
    const draggingTitle     = ref(null)    
    const filters           = computed(() => store.getters.getLoopsFilters)
    const isActive          = computed(() => store.getters.isLoopPanelOpened)
    const loops             = computed(() => store.getters.getLoops)
    const previewPlyerOpened= ref(false)
    const previewAudioName  = ref('')
    const previewAudioSource= ref(null)
    const previewAudioType  = ref('')
    const position          = { x: 0, y: 0 }
    const timeTick          = computed(() => store.getters.getTimeTick)
    const selectedFilters   = ref({
        beats   : [],
        bpm     : [],
        sound   : [],
        genre   : []
    })
    const filtersLabels     = ref({
        beats   : "Battute",
        bpm     : "BPM",
        sound   : "Strumento",
        genre   : "Genere"
    }) 
    const filtersColors     = {
        beats   : "pink",
        bpm     : "cyan",
        sound   : "lime",
        genre   : "amber"
    }

    const filteredLoops     = computed(() => {
        return loops.value && loops.value.filter(loop => {
            return Object.keys(selectedFilters.value).every(filterKey => {
                // Se l'array per questa chiave è vuoto, ignora il filtro
                if (selectedFilters.value[filterKey].length === 0) return true;

                // Altrimenti, verifica se il valore corrispondente nel loop è incluso nell'array del filtro
                // Assicurati che sia stringa per la comparazione se necessario
                return selectedFilters.value[filterKey].includes(String(loop[filterKey]));
            })
        })
    })

    const loadedPreviewData = (event) => {
        event.target.pause();
        event.target.currentTime = 0;
        event.target.play();
    }

    const toggleFilter = (category,value) => {
        let itemIndex = selectedFilters.value[category].indexOf(value)

        if(itemIndex >= 0){
            selectedFilters.value[category].splice(itemIndex,1)
        }else{
            selectedFilters.value[category].push(value)
        }
    }

    const getSelectedClasses = (filterName,filterValue) => {
        return selectedFilters.value[filterName].includes(filterValue)
            ? `bg-gradient-to-br from-${filtersColors[filterName]}-500 to-${filtersColors[filterName]}-600`
            : ''
    }

    onMounted(() => {
        interact('#close-panel').on('down',(event) => {event.preventDefault(); event.stopPropagation();})
        interact('#close-panel').on('up',(event) => {
            event.preventDefault()
            store.commit('hideLoopsPanel')
        })

        interact('.loop-item').draggable({
            listeners: {
                start (event) {
                    dragging.value = true
                    draggingTitle.value = event.target.dataset.loopname
                    position.x = event.clientX - dragElementWidth.value / 2
                    position.y = event.clientY - trackHeight.value / 2
                },
                move (event) {
                    if(dragElement.value == null) return
                    position.x += event.dx
                    position.y += event.dy

                    dragElement.value.style.transform =
                        `translate(${position.x}px, ${position.y}px)`
                },
                end () {
                    dragging.value = false
                    draggingTitle.value = null
                    position.x = 0
                    position.y = 0
                }
            }
        })

        interact('.close-preview').on('down',() => previewPlyerOpened.value = false)
        
        interact('.filter-btn').on('down',(event) => { 
            let dataset = event.target.closest(".filter-btn").dataset
            toggleFilter(dataset.filtertype,dataset.filterval)
        })

        interact('.preview-loop-btn').on('down',(event) => {
            const loop = store.getters.getLoop(parseInt(event.target.closest('.loop-item-container').dataset.loopid))
            previewPlyerOpened.value = true
            previewAudioName.value = loop.name
            previewAudioSource.value = './'+loop.path+'/'+loop.filename
            previewAudioType.value = 'audio/wav'
            document.getElementById('preview-player').load()
        })

        interact('.insert-loop-btn').on('down',(event) => {
            event.preventDefault()
            event.stopPropagation()

            const selectedTrack = store.getters.getSelectedTrack()
            
            if(!selectedTrack){
                alert('Seleziona una traccia in cui inserire il loop')
                return false
            }

            const loop = store.getters.getLoop(parseInt(event.target.closest('.loop-item-container').dataset.loopid))
            const eventLeft = store.getters.getProjectProperty('rulerPosition')
            console.log(eventLeft)
            //recupero il file da cui creare il blob
            let url = "./"+loop.path+'/'+loop.filename
            getAudioBlobFromServer(url).then(blob => {
                getAudioDuration(blob).then(duration => {
                    let eventLength = Math.ceil((duration / timeTick.value))
                    addEvent(
                        store,
                        selectedTrack.id,
                        eventLeft,
                        eventLength,
                        url,
                        blob,
                        false
                    );
                    store.commit('updateProjectHistory')
                }).catch(error => {
                    console.error(error);
                });
            });
        })
    })

    onBeforeUnmount(() => {
        interact('.close-preview').unset()
        interact('.insert-loop-btn').unset()
        interact('.preview-loop-btn').unset()
        interact('.loop-item').unset()
        interact('.filter-btn').unset()
        interact('#close-panel').unset()
    })
</script>

<style>
.preview-player{
    box-shadow: rgb(0, 0, 0) 0px 0px 30px 0px;
}

.close-preview{
    font-size: 24px;
    line-height: 20px;
    text-decoration: none;
}
</style>