<template>
    <div 
        :id="track.id"
        class="track bg-repeat relative box-border border-transparent border border-l-0 overflow-hidden"
        :class="{
            'selected bg-[rgb(37,38,45)]'   : track.selected,
            'bg-[#1e2025]'                  : !track.selected,
            'type-instrument'               : track.type === 'instrument',
            'type-percussion'               : track.type === 'percussion'
        }"
        :data-zoom="zoom"
        :data-instrumentname="instrumentName()"
        :style="trackStyle"    
        @contextmenu="showContextMenu($event)"  
    >
        
        <UploadingModal ref="contextMenu" :show="uploadModal.show" :filename="uploadModal.filename" :percent="uploadModal.percent" />
        <ContextMenu ref="contextMenu" :model="menuItems" />
        <input type="file" class="hidden" ref="ghostFileUpload" @change="upload"/>
        <EventItem 
            v-for="event in track.events" 
            :key="event.id+'-'+event.left+'-'+event.length+'-'+track.id"
            :event="event"
            :trackid="track.id"
            :type="track.type"
        />
    </div>
</template>
<script setup>
    import {ref,onMounted,computed,defineProps,onBeforeUnmount,watch} from 'vue'
    import interact from 'interactjs'
    import {useStore} from 'vuex'
    import {addEvent} from '../../../store/store'
    import EventItem from './EventItem'
    import ContextMenu from 'primevue/contextmenu'
    import UploadingModal from '../../modals/UploadingModal'
    import { performBackendRequest,getAudioBlobFromServer,getAudioDuration,allowedAudioFormats,base64ToBlob,midiInstrumentsCode } from '@/utils/utils'
    import instrumentsList from '../../../../assets/midiInstruments'
    import drumsList from '../../../../assets/midiDrums'
    import MidiWriter from 'midi-writer-js'
    import { toast } from "vue3-toastify";
    import "vue3-toastify/dist/index.css"

    const props = defineProps({
        track: Object
    })
    const _                     = require('lodash')
    const store                 = useStore()
    const contextMenu           = ref(null)
    const ghostFileUpload       = ref(null)
    const bpm                   = computed(() => store.getters.getProjectProperty("bpm"))
    let lastClickPosition       = 0
    const maxBatt               = computed(() => store.getters.getProjectProperty("maxBatt"))
    const trackHeight           = computed(() => store.getters.getProjectProperty("trackHeight"))
    const unitSize              = computed(() => store.getters.getUnitSize);
    const zoom                  = computed(() => store.getters.getProjectProperty("zoom"))
    const track                 = computed(() => store.getters.getTrack(props.track.id))
    const timeTick              = computed(() => store.getters.getTimeTick)
    const divisions             = computed(() => store.getters.getProjectProperty("divisions"))
    const minDivisions          = computed(() => store.getters.getProjectProperty("minDivisions"))
    const trackStyle            = ref({})
    const selectedEvents        = computed(() => store.getters.getSelectedEvents)
    //const copiedEvents          = computed(() => store.getters.getCopiedEvents)
    const uploadModal           = ref({
        show        : false,
        filename    : '',
        percent     : 0
    })
    let menuItems               = computed(() => {
        const toReturn = []
        if(store.getters.getCopiedEvents.length > 0){
            toReturn.push({ label: 'Incolla', icon: 'bi bi-clipboard-check', command: (event) => pasteEvents(event) })    
        }
        toReturn.push({ label: 'Elimina', icon: 'bi bi-trash', command: () => deleteTrack() })
        if(props.track.type != "audio") toReturn.unshift({label: 'Esporta in MIDI', icon: 'bi bi-download ', command: () => exportTrack()})
        return toReturn
    })
    

    watch(unitSize, () => computeBg())
    watch(divisions, () => computeBg())
    watch(trackHeight, () => computeBg())
    
    
    

    window.emitter.on("closeContextMenu",() => {contextMenu.value && contextMenu.value.hide()})

    const pasteEvents = () => {
        //recupero la posizione del ruler per sapere da dove incollare
        const rulerPosition = store.getters.getProjectProperty("rulerPosition")
        const tracks = store.getters.getProjectProperty('tracks')
        
        const copiedEvents = store.getters.getCopiedEvents

        let nextRulerPosition   = 0
        let notCopied           = 0
        let notEnoughTracks     = 0
        let minTrackIndex       = Infinity
        let minLeft             = Infinity

        copiedEvents.forEach((event) => {
            const eventInfos                = store.getters.getEvent(event)
            minTrackIndex   = Math.min(minTrackIndex,store.getters.getTrackPosition(event.trackid))
            minLeft         = Math.min(minLeft,eventInfos.left + (eventInfos.trim?eventInfos.trim.start:0))
        })

        const tracksDelta = store.getters.getTrackPosition(props.track.id) - minTrackIndex

        copiedEvents.forEach((event) => {
            const eventInfos                = store.getters.getEvent(event)
            const originalTrackPosition     = store.getters.getTrackPosition(event.trackid)
            const originalTrackType         = store.getters.getTrackType(event.trackid)
            const destinationTrackPosition  = originalTrackPosition + tracksDelta
            const destinationTrack          = tracks[destinationTrackPosition]
            const leftOffset                = eventInfos.left + (eventInfos.trim?eventInfos.trim.start:0) - minLeft


            if(!destinationTrack){
                notEnoughTracks++;
                return;
            }else{
                const destinationTrackType      = destinationTrack.type
                

                if((originalTrackType !== destinationTrackType)){
                    notCopied++;
                    return;
                }else{
                    nextRulerPosition = Math.max(nextRulerPosition,eventInfos.length+rulerPosition+(eventInfos.trim?eventInfos.trim.stop:0))
                    switch(originalTrackType){
                        case 'audio':
                            addEvent(store, destinationTrack.id, rulerPosition + leftOffset, eventInfos.length, eventInfos.url, eventInfos.blob, false, eventInfos.trim)
                        break;

                        case 'instrument':
                        case 'percussion':
                            var newMidinotes = {}
                            for(let note in eventInfos.midiNotes){
                                if(!newMidinotes[note]) newMidinotes[note] = []
                                eventInfos.midiNotes[note].forEach((singleNote) => {
                                    newMidinotes[note].push({
                                        start   : (singleNote.start - eventInfos.left) + rulerPosition,
                                        end     : (singleNote.end - eventInfos.left) + rulerPosition
                                    })
                                })
                            }
                            addEvent(store, destinationTrack.id, rulerPosition + leftOffset, eventInfos.length, eventInfos.url, eventInfos.blob, false, eventInfos.trim, newMidinotes)
                        break;
                        default:
                        break;
                    }
                }
            }

            
        })

        if(notCopied > 0 || notEnoughTracks > 0){
            let message = []

            if(notCopied > 0){
                message.push((notCopied> 1)?notCopied+' eventi non sono stati incollati perchè la traccia destinazione non è compatibile':'1 evento non è stato incollato perchè la traccia destinazione non è compatibile')
            }
            if(notEnoughTracks > 0){
                message.push((notEnoughTracks> 1)?notEnoughTracks+' eventi non sono stati incollati perchè non ci sono abbastanza tracce':'1 evento non è stato incollato perchè non ci sono abbastanza tracce')
            }

            toast(message.join('<br/>'), {
                "theme"                 : "dark",
                "type"                  : "error",
                "autoClose"             : 3000,
                "dangerouslyHTMLString" : true
            })          
        }

        if(notCopied !== copiedEvents.length){
            store.commit('updateProjectHistory')
            store.commit("setRulerPosition", nextRulerPosition)
        }
    }

    const instrumentName = () => {
        if(track.value.type === 'instrument'){
            return instrumentsList.instrumentsList.list[track.value.instrument]
        }else if(track.value.type === 'percussion'){
            return drumsList.drumsList.list[track.value.instrument]
        }
    }

    const deleteTrack = () => {
        if(confirm('Vuoi davvero eliminare questa traccia?')){
            store.commit('deleteTrack',props.track.id)
        }
    }

    const exportTrack = () => {
        const track = new MidiWriter.Track();
        
        if(props.track.type === 'instrument'){
            //imposto lo strumento
            const instrumentCode = midiInstrumentsCode.indexOf(props.track.instrument)
            track.addEvent(new MidiWriter.ProgramChangeEvent({instrument: instrumentCode}))
        }

        track.setTempo(bpm.value)
        track.setTimeSignature(divisions.value[0],divisions.value[1])
        
        //l'unità case del tick è 128 per ogni quarto, la nostra è su tutta la battuta (di base in 16esimi)
        const ticksConversion = (128 * 4) / minDivisions.value
        
        let allNotes = []

        props.track.events.forEach((event) => {
            const startTrim       = (event.trim?event.trim.start:0)
            const endTrim         = (event.trim?event.trim.stop:0)
            const eventStart      = event.left + startTrim

            for(let note in event.midiNotes){
                event.midiNotes[note].forEach((singleNote) => {
                    let realStart       = singleNote.start
                    let realEnd         = singleNote.end
                    if(realEnd > eventStart){
                        if(eventStart > realStart){
                            realStart       = eventStart
                        }

                        if((event.left + event.length + endTrim) < realEnd){
                            realEnd = event.left + event.length + endTrim
                        }

                        allNotes.push({
                            note    : note,
                            start   : realStart,
                            end     : realEnd
                        })
                    }
                })
            }
        })

        const orderedNotes = _.orderBy(allNotes,['start'],['asc'])
        const noteArray = []
        orderedNotes.forEach((n) => {
            let duration = (n.end - n.start) * ticksConversion
            noteArray.push(new MidiWriter.NoteEvent({pitch: [n.note], duration: 'T'+duration,tick: (n.start * ticksConversion)}))
        })
        track.addEvent(noteArray, function() {
            return {sequential: false};
        })

        const write = new MidiWriter.Writer(track)

        const buffer = write.buildFile()
        const blob = new Blob([buffer], { type: 'audio/midi' });

        //lo converto in url
        var url = URL.createObjectURL(blob)

        //creo un link finto e lo cliccoforzatamente per scaricare il file
        var link = document.createElement('a')
        link.href = url
        link.download = (props.track.title?props.track.title:props.track.id)+'.mid'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)










    }

    const handleDropFromDevice = (event) => {
        if (event.dataTransfer && event.dataTransfer.files.length > 0) {
        // Si tratta di file droppati
            const file = event.dataTransfer.files[0]
            if(!allowedAudioFormats.includes(file.type)){
                alert("ATTENZIONE: tipo di file non ammesso. Puoi solo importare file di tipo .wav, .mp3 o .ogg")
                return
            }
            lastClickPosition = parseInt(
                (parseInt(event.clientX) - document.getElementById('track-headers-section').offsetWidth + document.getElementById('total-grid').scrollLeft - 8) / 
                unitSize.value
            )
            doUpload(file)
        }
        event.preventDefault();  // Previene il drop di file
    } 

    const upload = () => {
        if(ghostFileUpload.value.files.length <= 0) return
        doUpload(ghostFileUpload.value.files[0])
    }

    const doUpload = (file) => {
        uploadModal.value.show = true
        uploadModal.value.filename = file.name
        let reader = new FileReader()
        let audio = document.createElement('audio')
        const mimeType = file.type

        if(!allowedAudioFormats.includes(mimeType)){
            alert("ATTENZIONE: tipo di file non ammesso. Puoi solo importare file di tipo .wav, .mp3 o .ogg")
            return
        }
        reader.onprogress = (event) => {uploadModal.value.percent = Math.round((event.loaded / event.total) * 100)}
        reader.onload = function (e2) {
            audio.src = e2.target.result
            const base64String = e2.target.result.replace('data:'+mimeType+';base64,','')
            console.log(e2.target.result,file)
            audio.addEventListener('progress', (event) => {console.log(event)})
            audio.addEventListener('loadedmetadata', async function(){
                uploadModal.value.show = false
                const eventLength = Math.ceil((audio.duration / timeTick.value))
                addEvent(store, props.track.id, lastClickPosition, eventLength, undefined, base64ToBlob(base64String, mimeType), false)
            },false)
        }
        reader.readAsDataURL(file);
    }

    const showContextMenu = (event) => {
        event.preventDefault(); // Impedisci l'apertura del menu contestuale di default del browser
        window.emitter.emit("closeContextMenu")
        contextMenu.value.show(event); // Mostra il ContextMenu di PrimeVue
    }

    const computeBg = () => {
        let lines = [];
        lines.push(`<rect fill="#373944" width="1" height="5"/>`)

        const svgWidth = (unitSize.value * 4) * (4 / divisions.value[0]) * divisions.value[0]
        const tickWidth = (unitSize.value * 4) * (4 / divisions.value[1])

        for(let t = 0; t < divisions.value[1]; t++){
            let line
            switch(divisions.value[1]){
                case 4:
                    line = `<rect x="${tickWidth * t}" fill="#373944" width="1" height="5"/>`;        
                break;

                case 8:
                    if(t % 2 === 0){
                        line = `<rect x="${tickWidth * t}" fill="#373944" width="1" height="5"/>`;        
                    }else{
                        line = `<rect x="${tickWidth * t}" y="1" fill="#373944" width="1" height="3"/>`;        
                    }
                break;

                case 16:
                    if(t % 4 === 0){
                        line = `<rect x="${tickWidth * t}" fill="#373944" width="1" height="5"/>`;        
                    }else if(t % 2 === 0){
                        line = `<rect x="${tickWidth * t}" y="1" fill="#373944" width="1" height="3"/>`; 
                    }else{
                        line = `<rect x="${tickWidth * t}" y="2" fill="#373944" width="1" height="1"/>`;
                    }
                break;
            }
            lines.push(line);
        }

        const svg = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${svgWidth} 5" style="enable-background:new 0 0 ${svgWidth} 5;">
            ${lines.join('')}
        </svg>
        `;
        const encoded = window.btoa(svg);
        
        trackStyle.value = {
            height          : trackHeight.value + 'px',
            minHeight       : trackHeight.value + 'px',  
            width           : ((maxBatt.value * (16 * (divisions.value[0] / divisions.value[1]))) * unitSize.value) + 'px',
            backgroundImage : `url(data:image/svg+xml;base64,${encoded})`,
            backgroundSize  : svgWidth + 'px' + ' 5px'
        }
    }

    onMounted(() => {
        computeBg()
        interact("#"+props.track.id).on('down', function (event) {
            event.preventDefault()
            store.commit('setTrackSelected',props.track.id)
        })

        interact("#"+props.track.id).on('doubletap',function(event){
            event.preventDefault()
            switch (props.track.type){
                case "audio":
                    //mi segno la posizione del click per posizionare poi il file uploadato nella giusta posizione
                    lastClickPosition = parseInt(
                        (parseInt(event.clientX) - document.getElementById('track-headers-section').offsetWidth + document.getElementById('total-grid').scrollLeft - 8) / 
                        unitSize.value
                    )
                    ghostFileUpload.value.click()
                break;

                default : 
                break;
            }
        })

        document.getElementById(props.track.id).addEventListener('drop', handleDropFromDevice, {passive:false})

        interact("#"+props.track.id).dropzone({
            accept: '.loop-item',
            ondrop: function (event) {
                
                /*if(event.relatedTarget.classList.contains('event-item')){
                    setTimeout(() => {
                        if((props.track.type === event.relatedTarget.dataset.type) && (props.track.id != event.relatedTarget.dataset.trackid) && (selectedEvents.value.length === 1)){
                            store.commit('shiftEventTrack',{
                                eventId     : event.relatedTarget.id,
                                newTrackId  : props.track.id,
                                oldTrackId  : event.relatedTarget.dataset.trackid
                            })

                            store.commit('setTrackSelected',props.track.id)
                        }
                    },1)
                    
                }else{*/
                    performBackendRequest(
                        {
                            action : "getLoop",
                            loopId : event.relatedTarget.closest('.loop-item-container').dataset.loopid
                        },
                        "post",
                        (response) => {
                            //calcolo la posizione del drop: dal puntatore del mouse tolgo la larghezza della colonna delle tracce, 8px di distanza dalle tracce, aggiungo lo scroll dell'area delle tacce e tolgo 75px che sono la metà del placeholder che uso per il drop
                            let eventLeft = parseInt(
                                (parseInt(event.dragEvent.clientX) - document.getElementById('track-headers-section').offsetWidth + document.getElementById('total-grid').scrollLeft - 8 - 75) / 
                                unitSize.value
                            )
                            
                            //recupero il file da cui creare il blob
                            let url = "./"+response.data.data.path+'/'+response.data.data.filename
                            getAudioBlobFromServer(url).then(blob => {
                                getAudioDuration(blob).then(duration => {
                                    let eventLength = Math.ceil((duration / timeTick.value))
                                    addEvent(
                                        store,
                                        props.track.id,
                                        eventLeft,
                                        eventLength,
                                        url,
                                        blob,
                                        false
                                    )
                                    store.commit('updateProjectHistory')
                                }).catch(error => {
                                    console.error(error);
                                });
                            });
                        }
                    )
                //}
            },
            ondragenter: () => {if(selectedEvents.value.length === 1) store.commit('setTrackSelected',props.track.id)}
        })
    })

    onBeforeUnmount(() => {
        interact("#"+props.track.id).unset()
        document.getElementById(props.track.id).removeEventListener('drop', handleDropFromDevice)
    })
</script>

<style>
.track.selected{
    border: 1px solid #9ca3af;
    border-top:0;
    box-shadow:inset 1px 1px 0 0 #9ca3af;
    border-left:0;
}

.track.type-instrument::before,
.track.type-percussion::before {
    text-wrap: nowrap;
    color: rgba(156, 163, 175, 0.05);
    content: attr(data-instrumentname);
    display: block;
    font-size: 6rem;
    font-weight: 900;
    letter-spacing: -0.025em;
    line-height: 1;
    position: absolute;
    overflow: hidden;
    bottom:0px;
    height:calc(100% - 24px);
}
</style>