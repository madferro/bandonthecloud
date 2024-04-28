<template>
    <div id="total-roll" class="fixed z-[998] top-0 left-0 right-0 bottom-0 flex flex-col bg-[rgba(36,38,45,0.5)] roll-wrapper">
        <div class="pt-[30px] ml-auto relative ml-auto inline-block">
            <button id="close-drums-roll" className="right-0 bg-[#1a1d21] hover:bg-gray-100 hover:text-[#1a1d21] transition duration-200 px-4 py-2 text-gray-100 rounded-tl-lg inline-block text-sm cursor-pointer">
                <i class="bi bi-x inline-block align-middle"></i>
                <span class="inline-block align-middle">Chiudi</span>
            </button>
        </div>
        <div class="flex-grow grid roll-grid overflow-hidden">
            <div id="roll-info-panel" ref="rollInfoPanel" class="info-panel border-none bg-[#363a45] text-gray-700 p-3 overflow-y-auto">
                <div class="bg-[#272b33] w-full rounded p-4 flex flex-col justify-center text-center mb-4">
                    <h1 class="font-black text-gray-300 text-xl tracking-tighter w-full mb-4 text-center">{{track.title?track.title:'nuova traccia'}}</h1>
                    <div class="flex w-full items-center">
                        
                        <div class="items-center h-16 flex flex-col w-full justify-center">
                            <!--<span class="rounded-t-lg uppercase text-xs text-[#8d94a5] block text-center w-full">zoom</span>-->
                            <div class="flex w-full gap-1 items-center">
                                <i class="bi bi-arrows text-gray-100"></i>
                                <Slider 
                                    class="w-full h-1" 
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
                                    class="w-full h-1" 
                                    v-model="trackHeight" 
                                    :min=20 
                                    :max=100 
                                    :step=1 
                                    tooltipPosition="bottom" 
                                    showTooltip="focus"
                                    :format="trackHeightFormat"
                                    :lazy=false
                                    @update="setTrackHeight"
                                ></Slider>
                            </div>
                        </div>
                    </div>
                    <div class="flex w-full items-center mt-4 justify-center">
                        <button 
                            aria-label="Torna all'inizio" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus 
                            class="back-btn-drums rounded-l-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition duration-200 hover:bg-[#2f323c] hover:text-white">
                            <i class="bi-skip-start-fill"></i>
                        </button>
                        <button v-if="isPlaying"
                            aria-label="Pausa" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus
                            class="playstop-btn-drums rounded-r-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition-all duration-200 hover:bg-amber-400 hover:text-white">
                            <i className="bi-pause-fill"></i>
                        </button>
                        <button v-if="!isPlaying"
                            aria-label="Play" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus
                            class="playstop-btn-drums rounded-r-full bg-[#1e2025] text-xl text-[#8d94a5] px-3 py-1 transition-all duration-200 hover:bg-green-500 hover:text-white">
                            <i class="bi-play-fill"></i>
                        </button>
                    </div>
                </div>
                <div class="bg-[#272b33] w-full rounded p-4 flex flex-col justify-center text-center mb-4" v-if="selectedNotes.length > 0">
                    <h1 class="font-black text-gray-300 text-xl tracking-tighter w-full mb-4 text-center">{{ (selectedNotes.length > 1)?'Note selezionate':'Nota selezionata'}}</h1>
                    <div class="font-black text-5xl text-gray-300" v-if="selectedNotes.length ===1 ">{{ selectedNotes[0].note }}</div>
                    <div class="flex flex-wrap gap-2 items-center justify-center" v-if="selectedNotes.length > 1 ">
                        <div class="font-bold text-lg bg-[#1e2025] py-1 px-2 rounded text-gray-300" v-for="(note,index) in selectedNotes" :key="index">
                            {{ note.note }}
                        </div>
                    </div>
                    <button class="delete-note-btn mt-4 flex px-3 py-3 shadow-md shadow-red-500/0 hover:shadow-red-500/40 bg-gradient-to-br from-red-500 to-red-600 text-gray-100 text-sm hover:no-underline hover:from-red-400 hover:to-red-500 hover:text-white rounded transition-all duration-300 mx-auto w-full justify-center">
                        <i class="bi-trash"></i>
                        <span>Elimina {{ (selectedNotes.length > 1)?'note':'nota'}}</span>
                    </button>
                    <button class="copy-btn mt-4 flex px-3 py-3 shadow-md shadow-cyan-500/0 hover:shadow-cyan-500/40 bg-gradient-to-br from-cyan-500 to-cyan-600 text-gray-100 text-sm hover:no-underline hover:from-cyan-400 hover:to-cyan-500 hover:text-white rounded transition-all duration-300 mx-auto w-full justify-center">
                        <i class="bi bi-copy mr-1"></i>
                        <span>Copia</span>
                    </button>
                </div>
                <div class="bg-[#272b33] w-full rounded p-4 flex flex-col justify-center text-center mb-4" v-if="pendingCopies.length > 0">
                    <h1 class="font-black text-gray-300 text-xl tracking-tighter w-full mb-4 text-center">{{ (pendingCopies.length > 1)?'Note copiate':'Nota copiata'}}</h1>
                    <div class="font-black text-5xl text-gray-300" v-if="pendingCopies.length ===1 ">{{ pendingCopies[0].note }}</div>
                    <div class="flex flex-wrap gap-2 items-center justify-center" v-if="pendingCopies.length > 1 ">
                        <div class="font-bold text-lg bg-[#1e2025] py-1 px-2 rounded text-gray-300" v-for="(note,index) in pendingCopies" :key="index">
                            {{ note.note }}
                        </div>
                    </div>
                    <div class="flex gap-4 w-full">
                        <button class="paste-btn mt-4 flex px-3 py-3 shadow-md shadow-amber-500/0 hover:shadow-amber-500/40 bg-gradient-to-br from-amber-500 to-amber-600 text-gray-100 text-sm hover:no-underline hover:from-amber-400 hover:to-amber-500 hover:text-white rounded transition-all duration-300 mx-auto w-full justify-center">
                            <i class="bi-clipboard-check mr-1"></i>
                            <span>Incolla</span>
                        </button>
                        <button class="flush-copies-btn mt-4 flex px-3 py-3 shadow-md shadow-red-500/0 hover:shadow-red-500/40 bg-gradient-to-br from-red-500 to-red-600 text-gray-100 text-sm hover:no-underline hover:from-red-400 hover:to-red-500 hover:text-white rounded transition-all duration-300 mx-auto w-full justify-center">
                            <i class="bi bi-trash3-fill mr-1"></i>
                            <span>Annulla</span>
                        </button>
                    </div>
                </div>
            </div>
            <div id="roll-panel" ref="rollPanel" class="roll-panel shadow-2xl shadow-[rgba(0,0,0,1)] overflow-x-auto overflow-y-auto bg-[#1a1d21] w-full h-full grid">
                <div id="ruler-roll-filler" class="bg-[#1a1d21] sticky top-0 z-[210] left-0"></div>
                <RulerRollSection :type="props.rollInfos.type"></RulerRollSection>
                <div id="keyboard" ref="keyboard" class="left-0 sticky text-right z-[200]">
                    <div 
                        v-for="(note,index) in noteKeys" 
                        :key="note.note"
                        :class="note.class" 
                        :style="{
                            height      : computeNoteHeight(note.class)
                        }"
                        :data-note="note.note.note+note.octave"
                    >
                        {{ note.text }}
                        <div v-if="drumLabels[note.note.note+note.octave]"
                            class='text-gray-100 relative text-xs left-[72px] w-[112px] text-left h-[20px] leading-[20px] piece-name'
                            :class = "{
                                'top-[12px]'    : (index - ((6 - note.octave) * 12) === 2) || (index - ((6 - note.octave) * 12) === 9) || (index - ((6 - note.octave) * 12) === 4),
                                'top-[-19px]'   : (index - ((6 - note.octave) * 12) === 11),
                            }"
                            
                        >
                            {{ drumLabels[note.note.note+note.octave] }}
                        </div>
                    </div>
                </div>
                <div class="relative" :style="{width : ((maxBatt * (16 * (divisions[0] / divisions[1]))) * unitSize) + 8 +'px'}">
                    <div class="ghost-grid w-full h-full absolute left-0 top-0"
                        :style="{
                            backgroundImage : ghostBg,
                            backgroundSize  : ghostBgSize
                        }"
                    >
                        <div class="bg-[#3c57dd] border border-[rgb(131,148,233)] absolute text-white text-xs" v-for="(note,index) in ghostEvents"
                            :key="index"
                            :style="{
                                width       : parseInt((note.end - note.start) * unitSize) + 'px',
                                height      : trackHeight + 'px',
                                left        : parseInt((note.start * unitSize)) + 8 +'px',
                                top         : parseInt(noteKeys.find((n) => (n.note.note+n.octave) === note.note).top) + 'px'
                            }"
                        ></div>
                    </div>
                    <div class="event-grid h-full absolute"
                        :style="{
                            width : parseInt((props.rollInfos.event.length - (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0) + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0)) * unitSize) + 1 + 'px',
                            left : parseInt(((props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)) * unitSize) + 8) + 'px',
                            backgroundImage : rollBg,
                            backgroundSize  : rollBgSize
                        }"
                    >
                    
                        <div class="bg-[#3c57dd] border border-[rgb(131,148,233)] absolute drum-note" :data-noteindex="index"
                            v-for="(note,index) in realEvents"
                            :key="props.rollInfos.event.id + '-' + note.note + '-' + note.start+ ' ' + note.end"
                            :class="{
                                '!bg-indigo-200 !border-indigo-200' : note.focus
                            }"
                            :style="{
                                width       : parseInt((note.end - note.start) * unitSize) + 'px',
                                height      : trackHeight + 'px',
                                left        : (parseInt((note.start * unitSize)) + 8) - (parseInt(((props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)) * unitSize) + 8)) +'px',
                                top         : parseInt(noteKeys.find((n) => (n.note.note+n.octave) === note.note).top * trackHeight) + 'px'
                            }"
                        >    
                            <div
                                class="resize-l h-full left-0 top-0 absolute z-[5] bg-transparent hover:bg-indigo-200 cursor-ew-resize"
                                :style="{
                                    width : (isTouch?'12px':'6px')
                                }"
                            ></div>
                            <div
                                class="resize-r h-full right-0 top-0 absolute z-[5] bg-transparent hover:bg-indigo-200 cursor-ew-resize"
                                :style="{
                                    width : (isTouch?'12px':'6px')
                                }"
                            ></div>
                        </div>
                    </div>
                </div>      
            </div>
        </div>
    </div>
</template>

<script setup>
    import {defineProps,onMounted,onBeforeUnmount,computed,ref,watch} from 'vue'
    import interact from 'interactjs'
    import RulerRollSection from '../ruler/RulerRollSection.vue'
    import {useStore} from 'vuex'
    import Slider from '@vueform/slider'
    import {clamp,toggleLoadingModal,isTouch,noteToNumber} from '../../../../utils/utils'
    import SelectionArea from '@viselect/vanilla'

    const _                         = require('lodash')
    const audioContext              = new AudioContext()
    const ghostBg                   = ref(null)
    const ghostBgSize               = ref(null)
    const rollBg                    = ref(null)
    const rollBgSize                = ref(null)
    const rollPanel                 = ref(null)
    const rollInfoPanel             = ref(null)
    const keyboard                  = ref(null)
    const store                     = useStore()
    const octaves                   = computed(() => store.getters.getProjectProperty('octaves'))
    const maxBatt                   = computed(() => store.getters.getProjectProperty("maxBatt"))
    const divisions                 = computed(() => store.getters.getProjectProperty("divisions"))
    const isPlaying                 = computed(() => store.getters.getProjectProperty("playingDrums"))
    const unitSize                  = computed(() => store.getters.getUnitSizeDrumsRoll)
    const rulerPosition             = computed(() => store.getters.getProjectProperty("rulerRollPosition"))
    const props                     = defineProps({
        rollInfos: {
            type: Object,
            required: true
        }
    })
    const track                     = ref(store.getters.getTrack(props.rollInfos.trackid))
    const zoom                      = ref(store.getters.getProjectProperty("zoomDrumsRoll"))
    const trackHeight               = ref(store.getters.getProjectProperty("trackHeightDrumsRoll"))
    const timeTick                  = computed(() => store.getters.getTimeTick)
    const zoomFormat                = (value) => {return `Zoom: ${Math.ceil(value)} %`}
    const trackHeightFormat         = (value) => {return `Altezza tracce: ${Math.ceil(value)}`}
    const setZoom                   = (value) => {store.commit("setProjectProperties",{zoomDrumsRoll:value})}
    const setTrackHeight            = (value) => {store.commit("setProjectProperties",{trackHeightDrumsRoll:value})}
    const computeNoteHeight         = (classes) => {
        if(classes.indexOf("white-key-large") >= 0){
            return (39 * trackHeight.value / 20) + 'px' 
        }else if(classes.indexOf("black-key") >= 0){
            return (20 * trackHeight.value / 20) + 'px'
        }else{
            return (29 * trackHeight.value / 20) + 'px'
        }
    }
    const selectedNotes             = computed(() => realEvents.value.filter((event) => event.focus))
    const eventEnd                  = parseInt(((props.rollInfos.event.left + props.rollInfos.event.length + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0))))
    const selection                 = new SelectionArea({
        selectionAreaClass: 'selection-area',
        
        selectionContainerClass: 'selection-area-container',
        container: 'body',
        document: window.document,
        selectables: ['.drum-note'],
        startareas: ['html'],
        boundaries: ['#roll-panel'],
        behaviour: {
            overlap: 'keep',
            intersect: 'touch',
            startThreshold: 0,
            triggers: [0],
            scrolling: {
                speedDivider: 10,
                manualSpeed: 750,
                startScrollMargins: {x: 0, y: 0}
            }
        },
        features: {
            touch: true,
            range: true,
            singleTap: {
                allow: false,
                intersect: 'native'
            }
        }
    })
    let realEvents                  = ref([])
    let ghostEvents                 = ref([])
    let drumLabels                  = ref([])

    // eslint-disable-next-line no-unused-vars
    let midiPlayer
    let highlightTimeout            = undefined
    let recordingInterval           = undefined
    let pendingCopies               = ref([])

    const canPlay                   = (note) => {
        return midiPlayer.buffers[noteToNumber(note)]?true:false
    }

    const computeBackgrounds        = () => {
        const svgWidth = parseInt((unitSize.value * 4) * (4 / divisions.value[1]) * divisions.value[0])
        const svgHeight= parseInt(trackHeight.value * 12)
        const tickWidth = parseInt((unitSize.value * 4) * (4 / divisions.value[1]))

        /*CALCOLO BACKGROUND GHOSTGRID*/
        //aggiungi le strisce orizzontali
        let ghostElements = []
        for(let l=0;l<12;l++){
            if(
                l === 0 ||
                l === 2 ||
                l === 4 ||
                l === 6 ||
                l === 7 ||
                l === 9 ||
                l === 11
            ){
                ghostElements.push(`<rect x="0" y="${trackHeight.value * l}" class="st0" width="${svgWidth}" height="${trackHeight.value}"/>`)
            }else{
                ghostElements.push(`<rect x="0" y="${trackHeight.value * l}" class="st1" width="${svgWidth}" height="${trackHeight.value}"/>`)
            }   
        }

        //aggiungi le strisce verticali
        ghostElements.push(`<rect x="0" y="0" class="st2" width="1" height="${svgHeight}"/>`)
        for(let t = 1; t < (divisions.value[0] * (divisions.value[1] / 4)); t++){
            ghostElements.push(`<rect x="${parseInt(tickWidth * t)}" y="0" class="st3" width="1" height="${svgHeight}"/>`)
        }

        //aggiungi le linee di separazione
        ghostElements.push(`<rect x="0" y="${(trackHeight.value * 7) - 1}" class="st3" width="${svgWidth}" height="1"/>`)
        ghostElements.push(`<rect x="0" y="${(trackHeight.value * 12) - 1}" class="st3" width="${svgWidth}" height="1"/>`)

        const ghostSvg = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${svgWidth} ${svgHeight}" style="enable-background:new 0 0 ${svgWidth} ${svgHeight};" xml:space="preserve">
            <style type="text/css">
                .st0{fill:rgb(37, 38, 45);}
                .st1{fill:transparent;}
                .st2{fill:rgba(141,148,154,0.5);}
                .st3{fill:rgb(55,57,68);}
            </style>
            ${ghostElements.join('')}
        </svg>
        `
        ghostBg.value = `url(data:image/svg+xml;base64,${window.btoa(ghostSvg)})`
        ghostBgSize.value = `${svgWidth}px ${svgHeight}px`

        /*FINE CALCOLO BACKGROUND GHOSTGRID*/

        /*CALCOLO BACKGROUND EVENTGRID*/
        const beatStart = (props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0))
        const beatEnd = beatStart + (props.rollInfos.event.length - (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0) + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0))
        const svgWidthEvent = parseInt((props.rollInfos.event.length - (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0) + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0)) * unitSize.value) + 1

        let eventElements = []

        //aggiungi le strisce orizzontali
        for(let l=0;l<12;l++){
            if(
                l === 0 ||
                l === 2 ||
                l === 4 ||
                l === 6 ||
                l === 7 ||
                l === 9 ||
                l === 11
            ){
                eventElements.push(`<rect x="0" y="${trackHeight.value * l}" class="st0" width="${svgWidthEvent}" height="${trackHeight.value}"/>`)
            }else{
                eventElements.push(`<rect x="0" y="${trackHeight.value * l}" class="st1" width="${svgWidthEvent}" height="${trackHeight.value}"/>`)
            }   
        }

        //aggiungi le strisce verticali
        
        eventElements.push(`<rect x="0" y="0" class="${(beatStart % divisions.value[1] === 0)?'st3':'st2'}" width="1" height="${svgHeight}"/>`)
        eventElements.push(`<rect x="${svgWidthEvent - 1}" y="0" class="${(beatEnd % (divisions.value[1] * 4) === 0)?'st3':'st2'}" width="1" height="${svgHeight}"/>`)
        
        for(let b = beatStart; b < beatEnd ; b ++){
            if(b % (16/divisions.value[1]) === 0 && b > beatStart){
                eventElements.push(`<rect x="${parseInt((b - beatStart) * unitSize.value)}" y="0" class="${(b % (divisions.value[0] * (16/divisions.value[1])) === 0 )?'st3':'st2'}" width="1" height="${svgHeight}"/>`)
            }
        }

        //aggiungi le linee di separazione
        eventElements.push(`<rect x="0" y="${(trackHeight.value * 7) - 1}" class="st2" width="${svgWidthEvent}" height="1"/>`)
        eventElements.push(`<rect x="0" y="${(trackHeight.value * 12) - 1}" class="st2" width="${svgWidthEvent}" height="1"/>`)

        const eventSvg = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${svgWidthEvent} ${svgHeight}" style="enable-background:new 0 0 ${svgWidthEvent} ${svgHeight};" xml:space="preserve">
            <style type="text/css">
                .st0{fill:rgb(37, 38, 45);}
                .st1{fill:rgb(26, 29, 33);}
                .st2{fill:rgb(55, 57, 68);}
                .st3{fill:rgb(141, 148, 165);}
            </style>
            ${eventElements.join('')}
        </svg>
        `
        rollBg.value = `url(data:image/svg+xml;base64,${window.btoa(eventSvg)})`
        rollBgSize.value = `${svgWidthEvent}px ${svgHeight}px`
        /*FINE CALCOLO BACKGROUND EVENTGRID*/

        //aggiorno i listeners perchè essendo cambiate le dimensioni deve cambiare anche lo snap alla griglia del drumsroll
        addListeners()
    }

    
    //recupero i ghost events 
    track.value.events.forEach((event) => {
        
        if(event.midiNotes && event.id != props.rollInfos.event.id){
            
            const eventRealStart    = event.left + (event.trim?event.trim.start:0)
            const eventRealEnd      = event.left + event.length + (event.trim?event.trim.stop:0)

            for(let note in event.midiNotes){
                for(let i in event.midiNotes[note]){
                    const singleNote = event.midiNotes[note][i]
                    if(
                        (singleNote.start >= eventRealEnd) ||
                        (singleNote.end <= eventRealStart)
                    ) continue

                    ghostEvents.value.push({
                        note    : note,
                        start   : Math.max(singleNote.start,eventRealStart),
                        end     : Math.min(singleNote.end,eventRealEnd)
                    })
                }
            }
        }
    })

    //recupero le note dell'evento per il quale ho aperto il drums roll
    if(props.rollInfos.event.midiNotes){
        const event             = JSON.parse(JSON.stringify(props.rollInfos.event))
        const eventRealStart    = event.left + (event.trim?event.trim.start:0)
        const eventRealEnd      = event.left + event.length + (event.trim?event.trim.stop:0)

        for(let note in event.midiNotes){
            for(let i in event.midiNotes[note]){
                const singleNote = event.midiNotes[note][i]
                if(
                    (singleNote.start >= eventRealEnd) ||
                    (singleNote.end <= eventRealStart)
                ) continue

                realEvents.value.push({
                    note    : note,
                    start   : Math.max(singleNote.start,eventRealStart),
                    end     : Math.min(singleNote.end,eventRealEnd),    
                    focus   : false,
                    index   : realEvents.value.length,
                    velocity: singleNote.velocity
                })
            }
        }
    }

    watch(zoom,() => computeBackgrounds())
    watch(trackHeight,() => computeBackgrounds())


    const notes                     = [
        { note: "B", alt: false },    
        { note: "Bb", alt: true },
        { note: "A", alt: false },
        { note: "Ab", alt: true },
        { note: "G", alt: false },
        { note: "Gb", alt: true },
        { note: "F", alt: false },
        { note: "E", alt: false },
        { note: "Eb", alt: true },
        { note: "D", alt: false },
        { note: "Db", alt: true },
        { note: "C", alt: false }
    ]
    const noteKeys                    = computed(() => {
        let toReturn = []
        for (let octave = octaves.value; octave >= 0; --octave) {
            notes.forEach((note,index) => {
                let toAdd = {
                    alt     : note.alt,
                    class   : '',
                    text    : null,
                    note    : note,
                    octave  : octave,
                    active  : false,
                    top     : index + ((6-octave) * 12)
                }
                if(index === 11){
                    toAdd.class     = 'white-key drumsrollkey key-C'+octave
                    toAdd.text      = 'C'+octave
                }else if (note.alt) {
                    toAdd.class     = 'black-key drumsrollkey key-'+note.note+octave
                }else {
                    if(index === 2 || index === 4 || index === 9){
                        toAdd.class = 'white-key-large drumsrollkey key-'+note.note+octave
                    }else{
                        toAdd.class = 'white-key drumsrollkey key-'+note.note+octave
                    }
                }
                toReturn.push(toAdd)
            })
        }
        return toReturn
    })

    const noteQuotes                    = computed(() => {
        let toReturn = {}
        noteKeys.value.forEach((note) => {toReturn[note.top] = note.note.note+note.octave})
        return toReturn
    })
    const delightNotes = () => {
        let keys = document.querySelectorAll('.drumsrollkey')
        keys.forEach(key => {
            key.classList.remove('!bg-gradient-to-br','!from-indigo-500','!to-indigo-600','!text-gray-200')
            const labelChild = key.getElementsByClassName('piece-name')[0]
            if(labelChild){
                labelChild.classList.remove('!text-indigo-400')
            }
        })
    }

    const highlightNote = (noteData) => {
        const noteDuration      = noteData.end - noteData.start
        //let keys = document.querySelectorAll('.drumsrollkey')
        delightNotes()

        let keyElement = document.getElementsByClassName("key-"+noteData.note)[0]
        keyElement.classList.add('!bg-gradient-to-br','!from-indigo-500','!to-indigo-600','!text-gray-200')
        const labelChild = keyElement.getElementsByClassName('piece-name')[0]
        if(labelChild){
            labelChild.classList.add('!text-indigo-400')
        }
        clearTimeout(highlightTimeout)
        
        highlightTimeout        = setTimeout(() => {
            let keyElement = document.getElementsByClassName("key-"+noteData.note)[0]
            if(keyElement) {
                keyElement.classList.remove('!bg-gradient-to-br','!from-indigo-500','!to-indigo-600','!text-gray-200')
                const labelChild = keyElement.getElementsByClassName('piece-name')[0]
                if(labelChild){
                    labelChild.classList.remove('!text-indigo-400')
                }
            }
        },noteDuration * timeTick.value * 1000)
    }

    const updateRulerRollPosition      = () => {
        if(rulerPosition.value < eventEnd){
            store.commit("setRulerRollPosition", store.getters.getProjectProperty("rulerRollPosition") + 1)
        }else{
            clearInterval(recordingInterval)
            midiPlayer.stop()
            store.commit('toggleDrumsRollPlaying')
        }
    }

    const togglePlay = () => {
        store.commit('toggleDrumsRollPlaying')
        if(isPlaying.value){
            const schedule = []

            realEvents.value.forEach((event) => {
                console.log(event)
                if(event.end > rulerPosition.value){
                    const realStart = Math.max(rulerPosition.value,event.start)
                    schedule.push({
                        time        : (realStart - rulerPosition.value) * timeTick.value,
                        note        : event.note,
                        duration    : (event.end - realStart) * timeTick.value,
                        gain        : event.velocity || 1
                    })
                }
            })
            recordingInterval = setInterval(updateRulerRollPosition,store.getters.getRecordingTimeTick)
            midiPlayer.schedule(0,schedule)
        }else{
            clearInterval(recordingInterval)
            midiPlayer.stop()
        }
    }

    const addNote = (note,tick,noteLength,play) => {
        const eventEnd = props.rollInfos.event.left + props.rollInfos.event.length - (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0) + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0)

        realEvents.value.forEach((ev) => {
            
            if(note === ev.note && (ev.start < (tick + noteLength)) && (ev.end > (tick + noteLength))){
                noteLength = ev.start - tick
            }
            ev.focus = false
        })

        if(tick + noteLength > eventEnd){
            noteLength = eventEnd - tick
        }
        if(noteLength > 0){
            realEvents.value.push({
                note    : note,
                start   : tick,
                end     : tick + noteLength,
                focus   : true,
                index   : realEvents.value.length,
                velocity: 63.5/127
            })

            commitChanges()
            if(play){
                midiPlayer.stop()
                if(canPlay(note)){
                    midiPlayer.play(note, audioContext.currentTime, { duration: noteLength * timeTick.value})
                }
            }
        }
    }
    
    const addListeners = () => {
        interact('.delete-note-btn').unset()
        interact('.delete-note-btn').on('tap', function (event) {
            event.preventDefault()
            event.stopPropagation()
            deleteNotes()
        })

        interact('.playstop-btn-drums').unset()
        interact('.playstop-btn-drums').on('tap', function (event) {
            event.preventDefault()
            event.stopPropagation()
            togglePlay()
        })

        interact('.back-btn-drums').unset()
        interact('.back-btn-drums').on('tap', function () {
            store.commit('setRulerRollPosition',(props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)))
            rollPanel.value.scrollLeft = parseInt((props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)) * unitSize.value)
        })
        
        interact(".drumsrollkey").unset()
        interact(".drumsrollkey").on('down',(event) => {
            const note = event.target.closest('.drumsrollkey').dataset.note
            
            midiPlayer.stop()
            if(canPlay(note)){
                highlightNote({
                    note    : note,
                    start   : 0,
                    end     : 4
                })
                midiPlayer.play(note, audioContext.currentTime, { duration: 4 * timeTick.value})
            }else{
                delightNotes()
            }
        })

        interact('.ghost-grid').unset()
        interact('.ghost-grid').on('tap',(event) => {
            event.preventDefault()
            event.stopPropagation()
            realEvents.value.forEach((ev) => ev.focus = false)
        })

        interact('.event-grid').unset()
        interact('.event-grid').on('tap',(event) => {
            event.preventDefault()
            event.stopPropagation()

            const tick = parseInt(
                    (parseInt(event.clientX) - rollInfoPanel.value.offsetWidth - keyboard.value.offsetWidth + rollPanel.value.scrollLeft - 8) / 
                    unitSize.value
            )

            const note = noteQuotes.value[parseInt(
                    (parseInt(event.clientY) - rollPanel.value.getBoundingClientRect().top + rollPanel.value.scrollTop - 35) / 
                    trackHeight.value
            )]

            if(canPlay(note)){
                addNote(note,tick,4,true)
            }
        })

        interact(".drum-note").unset()
        interact('.drum-note').on('tap',(event) => {event.preventDefault();event.stopPropagation()})
        interact(".drum-note").on('down',(event) => {
            event.preventDefault()
            event.stopPropagation()
            
            const noteIndex       = event.target.closest('.drum-note').dataset.noteindex
            const noteData        = realEvents.value[noteIndex]
            const noteDuration    = noteData.end - noteData.start

            midiPlayer.stop()
            noteData.focus = true
            if(canPlay(noteData.note)){
                highlightNote(noteData)
                midiPlayer.play(noteData.note, audioContext.currentTime, { duration: noteDuration * timeTick.value})
            }else{
                delightNotes()
            }
        })

        interact(".drum-note").on('up',(event) => {
            event.preventDefault()
            event.stopPropagation()
            const noteIndex       = event.target.closest('.drum-note').dataset.noteindex
            const noteData        = realEvents.value[noteIndex]
            realEvents.value.forEach((note) => {note.focus = false})
            noteData.focus = true
        })

        let clamps = []
        let clampsResize = []

        interact(".drum-note").draggable({
            listeners : {
                start (event){
                    event.preventDefault()
                    event.stopPropagation()

                    let eventStart      = props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)
                    let eventEnd        = eventStart + props.rollInfos.event.length + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0)
                    let octavesHeight   = (octaves.value + 1) * 12 * trackHeight.value
                    let totClamps = {
                        left    : Infinity,
                        right   : Infinity,
                        up      : Infinity,
                        down    : Infinity
                    }
                    
                    selectedNotes.value.forEach((note) => {
                        const noteOffsetTop = noteKeys.value.find((n) => note.note === n.note.note + n.octave).top * trackHeight.value
                        totClamps.left    = Math.min(totClamps.left,note.start - eventStart)
                        totClamps.right   = Math.min(totClamps.right,eventEnd - note.end)
                        totClamps.up      = Math.min(totClamps.up,noteOffsetTop)
                        totClamps.down    = Math.min(totClamps.down,(octavesHeight - (noteOffsetTop + trackHeight.value)))
                    })

                    selectedNotes.value.forEach((note,index) => {
                        const noteOffsetTop = noteKeys.value.find((n) => note.note === n.note.note + n.octave).top * trackHeight.value
                        clamps[index] = {
                            left    : note.start - totClamps.left,
                            right   : note.end + totClamps.right - (note.end - note.start),
                            up      : noteOffsetTop - totClamps.up,
                            down    : noteOffsetTop + totClamps.down
                        }
                    })
                },
                move (event) {
                    selectedNotes.value.forEach((note,index) => {
                        const noteData          = note
                        const noteDuration      = noteData.end - noteData.start
                        const noteOffsetTop     = noteKeys.value.find((n) => note.note === n.note.note + n.octave).top * trackHeight.value
                        const shiftX            = (Math.abs(event.dx)<unitSize.value)?0:event.dx
                        const shiftY            = (Math.abs(event.dy)<trackHeight.value)?0:event.dy
                        
                        //calcolo spostamento orizzontale
                        if(shiftX !== 0){
                            const newPosition = clamp(
                                parseInt(noteData.start) + (shiftX / unitSize.value),
                                clamps[index].left,
                                clamps[index].right
                            )
                            realEvents.value[note.index].start = parseInt(newPosition)
                            realEvents.value[note.index].end = parseInt(newPosition) + noteDuration
                        }
                        
                        //calcolo spostamento verticale
                        if(shiftY !== 0){
                            const newHeight = clamp(
                                noteOffsetTop + (shiftY),
                                clamps[index].up,
                                clamps[index].down
                            )
                            realEvents.value[note.index].note = noteQuotes.value[newHeight/trackHeight.value]
                            midiPlayer.stop()
                            if(canPlay(realEvents.value[note.index].note) && selectedNotes.value.length == 1){
                                highlightNote(realEvents.value[note.index])
                                midiPlayer.play(realEvents.value[note.index].note, audioContext.currentTime, { duration: noteDuration * timeTick.value})
                            }else{
                                delightNotes()
                            }
                        }
                    })

                    event.preventDefault()
                    event.stopPropagation()
                },
                end (event) {
                    commitChanges()
                    event.preventDefault()
                    event.stopPropagation()
                    clamps = []
                }
            },
            modifiers: [
                interact.modifiers.snap({
                    targets: [
                        interact.snappers.grid({ x: parseInt(unitSize.value), y: parseInt(trackHeight.value) })
                    ],
                    offset: { x: 0, y: 0 },
                    relativePoints: [{ x: 0, y: 0 }],
                    endOnly: false
                })
            ]
        })
        .resizable({
            edges: {
                top   : false,
                left  : '.resize-l',
                bottom: false,
                right : '.resize-r'
            },
            listeners: {
                start : function(event){
                    const eventStart      = parseInt(props.rollInfos.event.left) + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)
                    const eventEnd        = eventStart + parseInt(props.rollInfos.event.length) + (props.rollInfos.event.trim?props.rollInfos.event.trim.stop:0)

                    let totClampsResize = {
                        leftMin : Infinity,
                        leftMax : Infinity,
                        rightMin: Infinity,
                        rightMax: Infinity
                    }

                    selectedNotes.value.forEach((note) => {
                        totClampsResize.leftMin     = Math.min(totClampsResize.leftMin,note.start - eventStart)
                        totClampsResize.leftMax     = Math.min(totClampsResize.leftMax,note.end - note.start - 1)
                        totClampsResize.rightMin    = Math.min(totClampsResize.rightMin,note.end - note.start - 1)
                        totClampsResize.rightMax    = Math.min(totClampsResize.rightMax,eventEnd - note.end)
                    })

                    selectedNotes.value.forEach((note,index) => {
                        clampsResize[index] = {
                            leftMin     : note.start - totClampsResize.leftMin,
                            leftMax     : note.start + totClampsResize.leftMax,
                            rightMin    : note.end - totClampsResize.rightMin,
                            rightMax    : note.end + totClampsResize.rightMax
                        }
                    })
                    event.preventDefault()
                    event.stopPropagation()
                },
                move: function (event) {
                    selectedNotes.value.forEach((note,index) => {
                        let movedEdge = "left"
                        if(event.edges.right){
                            movedEdge = "right"
                        }

                        let shiftX = (Math.abs(event.delta.x)<unitSize.value)?0:event.delta.x;
                        
                        switch(movedEdge){
                            case "left":
                                realEvents.value[note.index].start = clamp(parseInt(realEvents.value[note.index].start) + (shiftX / unitSize.value), clampsResize[index].leftMin, clampsResize[index].leftMax)
                            break;

                            case "right":
                                realEvents.value[note.index].end = clamp(parseInt(realEvents.value[note.index].end) + (shiftX / unitSize.value), clampsResize[index].rightMin, clampsResize[index].rightMax)
                            break;

                            default:
                            break;
                        
                        }
                    })
                },
                end (event) {
                    commitChanges()
                    clampsResize = []
                    event.preventDefault()
                    event.stopPropagation()
                }
            },
            modifiers: [
                interact.modifiers.snap({
                    targets: [
                        interact.snappers.grid({ x: parseInt(unitSize.value), y: parseInt(trackHeight.value) })
                    ],
                    offset: { x: 0, y: 0 },
                    relativePoints: [{ x: 0, y: 0 }],
                    endOnly: false
                })
            ]
        })
    }

    const deleteNotes = () => {
        realEvents.value = realEvents.value.filter((event) => !event.focus)
        commitChanges()
    }

    const commitChanges = () => {
        var midiNotes = {}
        realEvents.value.forEach((note) => {
            if(!midiNotes[note.note]){
                midiNotes[note.note] = []
            }
            midiNotes[note.note].push({
                start   : parseInt(note.start),
                end     : parseInt(note.end)
            })
            note.focus = false
        })
        
        store.commit('setEventProperties',{
            trackid     : props.rollInfos.trackid,
            eventid     : props.rollInfos.event.id,
            properties  : {
                midiNotes   : midiNotes
            }
        })
        
        window.emitter.emit('updateMidiBackground')
    }

    const keyDownListener = (event => {
        if(store.getters.getProjectProperty("drumsRollInfos")){
            switch(event.keyCode){
                case 67:    //c
                    if(event.ctrlKey || event.metaKey) copySelected()
                    event.stopPropagation()
                    event.preventDefault()
                break;
                case 86:    //v
                    if(event.ctrlKey || event.metaKey) pasteSelected()
                    event.stopPropagation()
                    event.preventDefault()
                break;
                case 32:    //space
                    event.stopPropagation()
                    event.preventDefault()
                    togglePlay()
                break;
                case 8:     //backspace
                case 46:    //canc
                    event.stopPropagation()
                    event.preventDefault()
                    deleteNotes()
                break;
            }
        }
    })

    const copySelected = () => {
        pendingCopies.value = _.cloneDeep(selectedNotes.value)
    }

    const pasteSelected = () => {
        let minStart = Infinity
        let maxEnd = 0
        pendingCopies.value.forEach((note) => {
            if(note.start < minStart){
                minStart = note.start
            }
        })
        pendingCopies.value.forEach((note) => {
            const tick = note.start - minStart + rulerPosition.value
            const duration = note.end - note.start
            addNote(note.note,tick,duration,false)
            if(maxEnd < tick + duration){
                maxEnd = tick + duration
            }
        })

        //sposta il cursore alla fine dell'ultima nota
        store.commit("setRulerRollPosition",maxEnd)
    }

    const drumsInfos = async () => {
        const response = await fetch('./soundfont/'+track.value.instrument+'-labels.json')
        return response.json()
    }


    onMounted(() => {
        store.commit("setRulerRollPosition",
            (props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0))
        )

        rollPanel.value.scrollLeft = parseInt((props.rollInfos.event.left + (props.rollInfos.event.trim?props.rollInfos.event.trim.start:0)) * unitSize.value)
        rollPanel.value.scrollTop = parseInt(noteKeys.value.find((n) => (n.note.note+n.octave) === 'C3').top) - (rollPanel.value.offsetHeight / 2)

        interact("#close-drums-roll").on('tap', function (event) {
            event.preventDefault()
            midiPlayer.stop()
            store.commit("setProjectProperties",{drumsRollInfos : undefined})
        })

        interact('.copy-btn').on('tap',(event) => {
            event.preventDefault()
            event.stopPropagation()
            copySelected()

        })

        interact('.paste-btn').on('tap',(event) => {
            event.preventDefault()
            event.stopPropagation()
            pasteSelected()
        })

        interact('.flush-copies-btn').on('tap',(event) => {
            event.preventDefault()
            event.stopPropagation()
            pendingCopies.value = []
        })
        
        toggleLoadingModal(true)
        let player = require('soundfont-player')
        const outputId = store.getters.getProjectProperty('outputId')
        audioContext.setSinkId(outputId||'')
        player.instrument(audioContext, './soundfont/'+track.value.instrument+'-mp3.js')
            .then(function (pl) {
                
                midiPlayer = pl

                drumsInfos().then((response) => {
                    drumLabels.value = response
                    toggleLoadingModal(false)
                })
                
            })
            .catch(function(err){console.log(err);toggleLoadingModal(false)})
        
        addListeners()
        computeBackgrounds()

        selection.on('beforestart', evt => {
            evt.selection.resolveSelectables();
            evt.selection.clearSelection(true,true)
        }).on('move', evt => {
            let noteEvents = document.querySelectorAll('.drum-note')
            noteEvents.forEach(key => {
                key.classList.remove('!bg-indigo-400', '!border-indigo-400','!bg-indigo-200', '!border-indigo-200')
                realEvents.value[key.dataset.noteindex].focus = false
            })

            evt.store.selected.forEach((element) => element.classList.add('!bg-indigo-400', '!border-indigo-400'))
        }).on('stop', evt => {
            evt.store.selected.forEach((element) => {
                element.classList.remove('!bg-indigo-400', '!border-indigo-400')
                realEvents.value[element.dataset.noteindex].focus = true
            })
        });

        document.body.addEventListener('keydown',keyDownListener)
    })

    onBeforeUnmount(() => {
        selection.destroy()
        document.body.removeEventListener('keydown',keyDownListener)
        interact("#close-drums-roll").unset()
        interact(".drum-note").unset()
        interact('.copy-btn').unset()
        interact('.paste-btn').unset()
        interact('.flush-copies-btn').unset()
    })
</script>

<style>
.roll-wrapper{
    filter: drop-shadow(0 0 20px #000001);
    user-select: none;
}

.roll-grid {
    grid-template-columns: 400px 1fr;
}

.roll-panel{
    grid-template-rows: 35px 1fr;
    grid-template-columns: 185px 1fr;
}

.white-key{
    background-color: rgb(255, 255, 255);
    font-size: 11px;
    margin-bottom: 1px;
    padding-right: 1px;
    width: 70px;
    border-radius: 0px 2px 2px 0px;
    padding-top: 7px;
    padding-right: 3px;
}

.white-key-large{
    background-color: rgb(255, 255, 255);
    font-size: 11px;
    margin-bottom: 1px;
    padding-right: 1px;
    width: 70px;
    border-radius: 0px 2px 2px 0px;
}

.black-key{
    background-color: rgb(0, 0, 0);
    position: absolute;
    width: 50px;
    border-radius: 0px 2px 2px 0px;
    transform: translateY(-10px);
}

.ghost-grid{
    opacity:0.2;
    background-position:8px top
}

.selection-area {
    background: rgba(46, 115, 252, 0.11);
    border: 2px solid rgba(98, 155, 255, 0.81);
    border-radius: 0.1em;
}

.selection-area-container{
    z-index:999999 !important;
}

</style>