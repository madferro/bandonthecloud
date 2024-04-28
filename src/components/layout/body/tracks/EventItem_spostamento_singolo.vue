<template>
    <div 
        :id = "event.id"
        class="event-item h-full absolute bg-no-repeat z-[190]" 
        :style="{ 
            left                : left * unitSize + (trim?(trim.start * unitSize):0) + 'px', 
            width               : length  * unitSize + (trim?((trim.stop * unitSize) - (trim.start * unitSize) ):0) + 'px',
            backgroundColor     : eventBg,
            backgroundImage     : eventBgImage,
            backgroundSize      : (length + (trim?(trim.start + trim.stop):0)) * unitSize + 'px ' + trackHeight + 'px',
            backgroundPosition  : backgroundXShift+'px center',
            transition          : (isPlaying || isRecording)?'width '+ (store.getters.getRecordingTimeTick/1000) +'s linear' : 'none',
            transform           : 'translateY('+ top +'px)'
        }"
        :data-trackid = "props.trackid"
        :data-type = "props.type"
        @contextmenu="showContextMenu($event)"
    >
        <ContextMenu ref="contextMenu" :model="items" />
        <div v-if="!isRecording && length > 0"
            class="resize-l h-full left-0 top-0 absolute z-[5]"
            :class="{
                '!cursor-e-resize' : type === 'audio'
            }"
            :style="{
                backgroundColor : resizeBg,
                width : (isTouch?'12px':'6px')
            }"
        ></div>
        <canvas v-if="props.type === 'audio'" class="waveform bg-transparent top-[1px] relative"  
            :style="{ 
                width           : length  * unitSize + 'px',
                height          : trackHeight - 4 + 'px'
            }"
        ></canvas>
        <div v-if="!isRecording && length > 0"
            class="resize-r h-full right-0 top-0 absolute z-[5]"
            :class="{
                '!cursor-w-resize' : type === 'audio'
            }"
            :style="{
                backgroundColor : resizeBg,
                width : (isTouch?'12px':'6px')
            }"
        ></div>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {defineProps,ref,computed,onMounted,watch} from 'vue'
    import interact from 'interactjs'
    import {clamp,isTouchDevice,midiInstrumentsCode} from '../../../../utils/utils'
    import WaveSurfer from 'wavesurfer.js'
    import ContextMenu from 'primevue/contextmenu'
    import MidiWriter from 'midi-writer-js'

    const props                     = defineProps({
        event: {
            type: Object,
            required: true
        },
        trackid :{
            type: String,
            required: true
        },
        type : {
            type: String,
            required: true
        }
    })

    const items                     = [
        { label: 'Copia', icon: 'bi bi-copy', command: () => copyEvents() },
        { label: 'Elimina', icon: 'bi bi-trash', command: () => deleteEvent() }
    ]
    
    if(props.type === 'instrument'){
        items.unshift({ label: 'Esporta regione in MIDI', icon: 'bi bi-download', command: () => exportRegion() })
        items.unshift({ label: 'Modifica note', icon: 'bip-midi-alt', command: () => store.commit("setProjectProperties",{midiRollInfos : props}) })
    }
    if(props.type === 'percussion'){
        items.unshift({ label: 'Esporta regione in MIDI', icon: 'bi bi-download', command: () => exportRegion() })
        items.unshift({ label: 'Modifica note', icon: 'bip-midi', command: () => alert('Opzione 1 selezionata') })
    }

    const _                         = require('lodash')
    const eventBg                   = ref("transparent")
    const contextMenu               = ref(null)
    const top                       = ref(0)
    const resizeBg                  = ref("transparent")
    const eventBgImage              = ref(null)
    const store                     = useStore()
    const unitSizeFromStore         = computed(() => store.getters.getUnitSize)
    const bpm                       = computed(() => store.getters.getProjectProperty("bpm"))
    const trackHeight               = computed(() => store.state.project.trackHeight)
    const unitSize                  = ref(unitSizeFromStore)
    const backgroundXShift          = ref(props.event.trim?-(props.event.trim.start * unitSize.value):0)
    const maxBatt                   = computed(() => store.getters.getProjectProperty("maxBatt"))
    const isRecording               = ref(props.event.recording)
    const isRecordingProject        = computed(() => store.getters.getProjectProperty("recording"))
    const isPlaying                 = computed(() => store.getters.getProjectProperty("playing"))
    const isSelected                = computed(() => store.getters.getEventProperty({trackid:props.trackid,eventid:props.event.id,property:'selected'}))
    const minDivisions              = computed(() => store.getters.getProjectProperty("minDivisions"))
    const divisions                 = computed(() => store.getters.getProjectProperty("divisions"))
    const isTouch                   = ref(isTouchDevice())
    const left                      = ref(props.event.left)
    const length                    = ref(props.event.length)
    const trim                      = ref(props.event.trim || {start:0,stop:0})
    const trackInstrument           = computed(() => store.getters.getTrackInstrument(props.trackid) )
    const tracksNumber              = computed(() => store.getters.getTracksNumber)
    const trackPosition             = computed(() => store.getters.getTrackPosition(props.trackid))

    const inputSource               = computed(() => store.getters.getTrackInputSource(props.trackid))
    const playedMidiNotes           = computed(() => store.getters.getMidiPlayerNotes(props.trackid))
    const audioblob                 = ref(props.event.blob)
    let                             wavesurfer,  recordingInterval

    let audioContext                = new AudioContext();
    let analyserNode                = audioContext.createAnalyser();
    let dataArray, bufferLength
    let animationFrameRequest
    let recordedChunks              = []
    let mediaRecorder
    let stopMidiWatch
    let midiNotes                   = {}
    let actualPlayedNotes
    let notes                       = ["B","Bb","A","Ab","G","Gb","F","E","Eb","D","Db","C"]
    let notes4Midi                  = {}

    const copyEvents = () => {
        const selectedEvents    = store.getters.getSelectedEvents
        const event             = {
            eventid : props.event.id,
            trackid : props.trackid,
            type    : props.type
        }

        const eventExists = selectedEvents.some(e => 
            e.eventid === event.eventid && e.trackid === event.trackid && e.type === event.type
        )
        let newArray = eventExists ? [...selectedEvents] : [...selectedEvents, event];

        store.commit('setCopiedEvents',newArray)
    }
        
    const exportRegion = () => {
        
        const track = new MidiWriter.Track();
        
        if(props.type === 'instrument'){
            //imposto lo strumento
            const instrumentCode = midiInstrumentsCode.indexOf(trackInstrument.value);
            track.addEvent(new MidiWriter.ProgramChangeEvent({instrument: instrumentCode}))
        }

        track.setTempo(bpm.value)
        track.setTimeSignature(divisions.value[0],divisions.value[1])
        
        //l'unità case del tick è 128 per ogni quarto, la nostra è su tutta la battuta (di base in 16esimi)
        const ticksConversion = (128 * 4) / minDivisions.value
        
        const startTrim       = (props.event.trim?props.event.trim.start:0)
        const endTrim         = (props.event.trim?props.event.trim.stop:0)
        const eventStart      = props.event.left + startTrim

        let allNotes = []

        for(let note in midiNotes){
            midiNotes[note].forEach((singleNote) => {
                let realStart       = singleNote.start
                let realEnd         = singleNote.end
                let velocity        = parseInt(((singleNote.velocity * 127) * 100) / 127)
                if(realEnd > eventStart){
                    if(eventStart > realStart){
                        realStart       = eventStart
                    }

                    if((props.event.left + props.event.length + endTrim) < realEnd){
                        realEnd = props.event.left + props.event.length + endTrim
                    }

                    allNotes.push({
                        note    : note,
                        start   : realStart,
                        end     : realEnd,
                        velocity: velocity
                    })
                }
            })
        }

        const orderedNotes = _.orderBy(allNotes,['start'],['asc'])
        const noteArray = []
        orderedNotes.forEach((n) => {
            let duration = (n.end - n.start) * ticksConversion
            
                noteArray.push(new MidiWriter.NoteEvent({pitch: [n.note], duration: 'T'+duration,tick: (n.start * ticksConversion) - (eventStart * ticksConversion), velocity: n.velocity}))
            
                
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
        link.download = props.event.id+'.mid'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        
    }

    const computeNotesQuotes = () => {
        var counter = 0;
        for(let h=6 ; h>=0 ; h--){
            for(let n=0 ; n<notes.length ; n++){
                counter += trackHeight.value / 84
                notes4Midi[notes[n]+""+h] = counter;
            }
        }
    }

    const deleteEvent = () => {
        const selectedEvents    = store.getters.getSelectedEvents

        if(selectedEvents.length > 1){
            if(confirm('Vuoi davvero eliminare questi eventi?')){
                selectedEvents.forEach((event) => store.commit('deleteEvent',{eventid:event.eventid,trackid:event.trackid}))
            }
        }else{
            if(confirm('Vuoi davvero eliminare questo evento?')){
                store.commit('deleteEvent',{eventid:props.event.id,trackid:props.trackid})
            }
        }
    }

    const showContextMenu = (event) => {
        event.preventDefault(); // Impedisci l'apertura del menu contestuale di default del browser
        window.emitter.emit("closeContextMenu")
        contextMenu.value.show(event) // Mostra il ContextMenu di PrimeVue
    }

    window.emitter.on("closeContextMenu",() => {contextMenu.value && contextMenu.value.hide()})

    const startRecording = () => {
        const constraints = { 
            audio: { 
                deviceId: { 
                    exact: inputSource.value 
                },
                echoCancellation : false,
                noiseSuppression : false,
                autoGainControl  : false
            } 
        }

        navigator.mediaDevices.getUserMedia(constraints).then(stream => {
            let source = audioContext.createMediaStreamSource(stream);
            source.connect(analyserNode);

            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = function(event) {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };
            mediaRecorder.start(10);

            bufferLength = analyserNode.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            draw();
        })
        .catch(error => {
            console.error('Errore nella cattura dell’audio:', error);
        });
    }

    

    const startRecordingMidi = () => {
        stopMidiWatch = watch(playedMidiNotes,(newVal) => {
            actualPlayedNotes = newVal
            for(let note in newVal){
                console.log(newVal[note].env.value.value)
                if(!midiNotes[note]){
                    midiNotes[note] = []
                }
                if(midiNotes[note].length == 0){
                    midiNotes[note].push({
                        start   : store.getters.getProjectProperty("rulerPosition"),
                        end     : undefined,
                        velocity: newVal[note].env.value.value
                    })
                }else if(midiNotes[note].length > 0 && midiNotes[note][midiNotes[note].length-1].end !== undefined){
                    midiNotes[note].push({
                        start   : store.getters.getProjectProperty("rulerPosition"),
                        end     : undefined,
                        velocity: newVal[note].env.value.value
                    })
                }
            }

        }, { deep: true })
        drawMidi()
    }

    const recordingUpdateEvent      = () => {
        store.commit("setRulerPosition", store.getters.getProjectProperty("rulerPosition") + 1)
        length.value++

        if(props.type !== 'audio'){
            drawMidiBackground()
        }
    }

    const drawMidi = () => {
        animationFrameRequest = requestAnimationFrame(drawMidi)
        for(let note in midiNotes){
            if(!actualPlayedNotes[note]){
                if(!midiNotes[note][midiNotes[note].length-1].end){
                    midiNotes[note][midiNotes[note].length-1].end = store.getters.getProjectProperty("rulerPosition")
                }
            }
        }
    }

    const drawMidiBackground = () => {
        let lines = []
        let realLength = length.value + (props.event.trim?(props.event.trim.start + props.event.trim.stop):0)
        for(let note in midiNotes){
            for(let d in midiNotes[note]){
                let start = midiNotes[note][d].start - left.value
                let end = (midiNotes[note][d].end?midiNotes[note][d].end:store.getters.getProjectProperty("rulerPosition")) - left.value
                lines.push(`<rect x="${parseInt(start * unitSize.value)}" y="${parseInt(notes4Midi[note])}" class="st0" width="${parseInt((end - start) * unitSize.value)}" height="1" shape-rendering="crispEdges"/>`)
            }
        }
        let svgWidth = realLength * unitSize.value
        
        const svg = `
            <svg width="${svgWidth}" height="${trackHeight.value}" viewBox="0 0 ${svgWidth} ${trackHeight.value}" fill="none" xmlns="http://www.w3.org/2000/svg">
                <style type="text/css">.st0{fill:#FCE7F3;}</style>
            ${lines.join('')}
            </svg>
        `
        const encoded = window.btoa(svg)        
        setEventBgImage(`data:image/svg+xml;base64,${encoded}`)
    }

    const draw = () => {
        animationFrameRequest = requestAnimationFrame(draw)
        analyserNode.getByteTimeDomainData(dataArray)

        const canvas = document.querySelector("#"+props.event.id+" .waveform")
        const ctx = canvas.getContext('2d')

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.beginPath()

        let sliceWidth = canvas.width * 1.0 / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0 // 128.0 normalizza l'ampiezza
            let y = v * canvas.height / 2

            if (i === 0) {ctx.moveTo(x, y)} else {ctx.lineTo(x, y)}

            x += sliceWidth
        }
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
    }

    const stopRecording = () => {
        isRecording.value = false
        if (animationFrameRequest) {
            cancelAnimationFrame(animationFrameRequest)
            animationFrameRequest = null
        }

        if (audioContext) {
            audioContext.close();
            audioContext = new AudioContext() // Ricrea per future operazioni
        }

        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop()
        }

        if(props.type == "audio"){
            audioblob.value = new Blob(recordedChunks, { type: 'audio/wav' })
            recordedChunks = [] // Resetta per la prossima registrazione
            
            // aggiorno la forma d'onda con wavesurfer
            drawWaveForm()
            //aggiorno l'evento con i valori attuali
            store.commit('setEventProperties',{
                trackid     : props.trackid,
                eventid     : props.event.id,
                properties  : {
                    left        : left.value,
                    length      : length.value,
                    blob        : audioblob.value,
                    recording   : false
                }
            })
        }else{
            stopMidiWatch()
            store.commit('setEventProperties',{
                trackid     : props.trackid,
                eventid     : props.event.id,
                properties  : {
                    left        : left.value,
                    length      : length.value,
                    recording   : false,
                    midiNotes   : midiNotes
                }
            })
            drawMidiBackground()
        }
        store.commit('resetPlayer')
    }

    const drawWaveForm = () => {
        const oldWave = document.querySelector("#"+props.event.id+" .waveform")
        if(oldWave != null){
            oldWave.remove()
        }
        if (wavesurfer) {
            wavesurfer.destroy()
        }
        const url = URL.createObjectURL(audioblob.value)
        
        wavesurfer = WaveSurfer.create({
            autoCenter      : false,
            autoplay        : false,
            barAlign        : '',
            container       : '#'+props.event.id,
            cursorWidth     : 0,
            height          : trackHeight.value,
            width           : length.value * unitSize.value,
            hideScrollbar   : true, 
            interact        : false,
            minPxPerSec     : 1,
            waveColor       : 'rgba(255,255,255,0.7)',
            sampleRate      : 48000,
            url             : url
        })

        wavesurfer.on('ready', () => {
            setEventBgImage(wavesurfer.renderer.canvasWrapper.childNodes[0].childNodes[0].toDataURL())
            URL.revokeObjectURL(url)
            wavesurfer.destroy()
        })
    }

    //listeners per drag e resize
    const addDragListeners = () => {
        let clampBounds = {
            left : {
                min : 0,
                max : maxBatt.value
            },

            length : {
                min : 0,
                max : maxBatt.value
            }
            
        }

        interact("#"+props.event.id).unset()
        interact("#"+props.event.id).on('doubletap',function(event){
            event.preventDefault();
            event.stopPropagation();

            switch(props.type){
                case 'instrument':
                    store.commit("setProjectProperties",{midiRollInfos : props})
                break;

                case 'percussion':
                    store.commit("setProjectProperties",{drumsRollInfos : props})
                break;

                default:
                break;
            }
        })
        
        interact("#"+props.event.id).on('up', function (event) {
            if(!event.shiftKey){
                store.commit('deselectEvents')
                store.commit('setEventSelected',{
                    trackid     : props.trackid,
                    eventid     : props.event.id,
                    selected    : true
                })
            }else{
                store.commit('setEventSelected',{
                    trackid     : props.trackid,
                    eventid     : props.event.id,
                    selected    : !props.event.selected
                })
            }
            
            setEventBg()
            event.preventDefault()
            event.stopPropagation()
            interact(event.target).on('click', function (_event) {_event.stopImmediatePropagation();}, true)
            interact(event.target).on('touchstart', function (_event) {_event.stopImmediatePropagation();}, true)
        })

        interact("#"+props.event.id).on('hold', (event) => {
            console.log(event);
            event.preventDefault();  // Previene l'azione di default del browser
            event.stopPropagation();
        },{hold: 1000});



        interact("#"+props.event.id).draggable({
            listeners : {
                start (event){
                    store.commit('setEventSelected',{
                        trackid     : props.trackid,
                        eventid     : props.event.id
                    })
                    event.preventDefault()
                    event.stopPropagation()
                },
                move (event) {
                    const shiftX    = (Math.abs(event.dx)<unitSize.value)?0:event.dx
                    const shiftY    = (Math.abs(event.dy)<trackHeight.value)?0:event.dy

                    let newPosition = clamp(
                        left.value + (shiftX / unitSize.value),
                        0 - (trim.value?trim.value.start:0),
                        maxBatt.value
                    )

                    left.value = parseInt(newPosition)

                    let newTop = clamp(
                        top.value + shiftY,
                        - (trackPosition.value * trackHeight.value),
                        trackHeight.value * (tracksNumber.value - trackPosition.value - 1)
                    )
                    top.value = newTop

                    event.preventDefault()
                    event.stopPropagation()
                },
                end (event) {
                    if(props.type == "audio"){
                        setTimeout(() => {top.value = 0},100)

                        store.commit('setEventProperties',{
                            trackid     : props.trackid,
                            eventid     : props.event.id,
                            properties  : {
                                left        : parseInt(left.value),
                                selected    : true
                            }
                        })
                    }else{
                        const leftDelta = parseInt(left.value) - parseInt(props.event.left)
                        for(let note in midiNotes){
                            midiNotes[note].forEach((singleNote) => {
                                singleNote.start    += leftDelta
                                singleNote.end      += leftDelta 
                            })
                        }

                        store.commit('setEventProperties',{
                            trackid     : props.trackid,
                            eventid     : props.event.id,
                            properties  : {
                                left        : parseInt(left.value),
                                selected    : true,
                                midiNotes   : midiNotes
                            }
                        })
                        drawMidiBackground()
                    }
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
        .resizable({
            edges: {
                top   : false,
                left  : '.resize-l',
                bottom: false,
                right : '.resize-r'
            },
            listeners: {
                start : function(){
                    store.commit('setEventSelected',{
                        trackid     : props.trackid,
                        eventid     : props.event.id
                    })
                    if(props.type === 'audio'){
                        clampBounds.left.min = 0
                        clampBounds.left.max = parseInt(length.value) - 1
                        clampBounds.length.min = - (parseInt(length.value) - 1)
                        clampBounds.length.max = 0
                    }else{
                        clampBounds.left.min = -props.event.left
                        clampBounds.left.max = parseInt(length.value)
                        clampBounds.length.min = - (parseInt(length.value) - 1)
                        clampBounds.length.max = maxBatt.value * 16
                    }
                },
                move: function (event) {
                    
                    let movedEdge = "left"
                    if(event.edges.right){
                        movedEdge = "right"
                    }

                    let shiftX = (Math.abs(event.delta.x)<unitSize.value)?0:event.delta.x;
                    switch(movedEdge){
                        case "left":
                            if(shiftX > 0){
                                trim.value.start = clamp(trim.value.start + (shiftX / unitSize.value), clampBounds.left.min, clampBounds.left.max)    
                            }else{
                                trim.value.start = clamp(trim.value.start + (shiftX / unitSize.value), clampBounds.left.min, clampBounds.left.max)
                            }
                            backgroundXShift.value = -((trim.value.start ) * unitSize.value)
                        break;

                        case "right":
                            trim.value.stop = clamp(trim.value.stop + (shiftX / unitSize.value), clampBounds.length.min, clampBounds.length.max)
                        break;

                        default:break;
                    }
                    drawMidiBackground()
                },
                end () {

                    store.commit('setEventProperties',{
                        trackid     : props.trackid,
                        eventid     : props.event.id,
                        properties  : {
                            trim    : trim.value,
                            left    : left.value,
                            length  : length.value,
                            selected: true
                        }
                    })

                    if(props.type !== "audio"){
                        drawMidiBackground()
                    }
                }
            },
            modifiers: [
                interact.modifiers.snap({
                    targets: [
                        interact.snappers.grid({ x: parseInt(unitSize.value), y: 10 })
                    ],
                    offset: { x: 0, y: 0 },
                    relativePoints: [{ x: 0, y: 0 }],
                    endOnly: false
                })
            ]
        })
    }

    

    const setEventBg                = () => {
        const alpha = (isSelected.value)?0.6:0.3
        if(isRecording.value){
            eventBg.value = "rgba(255,77,77,0.3)"
        }else{
            switch (props.type) {
                case "audio"        : eventBg.value = "rgba(75,222,128,"+alpha+")"; resizeBg.value = "rgba(75,222,128,0.8)"; break;
                case "instrument"   : eventBg.value = "rgba(244,114,183,"+alpha+")"; resizeBg.value = "rgba(244,114,183,0.8)"; break;
                case "percussion"   : eventBg.value = "rgba(250,204,21,"+alpha+")"; resizeBg.value = "rgba(250,204,21,0.8)";break;
                default: break;
            }
        }
    }

    const setEventBgImage                = (image) => {
        eventBgImage.value = 'url('+image+')'
        //backgroundXShift.value = props.event.trim?-(props.event.trim.start * unitSize.value):0
    }

    watch(isRecordingProject,(newVal) => {
        if(isRecording.value){
            if(!newVal){
                clearInterval(recordingInterval)
                //record.stopRecording()
                stopRecording()
                setEventBg()
            }   
        }
    })

    watch(isSelected, () => {setEventBg()})
    watch(unitSize, () => {addDragListeners()});
    watch(trackHeight, () => { if(props.type !== "audio"){ computeNotesQuotes();drawMidiBackground() }})
    window.emitter.on('updateMidiBackground',() => {
        midiNotes = JSON.parse(JSON.stringify(store.getters.getEventProperty({trackid:props.trackid,eventid:props.event.id,property:'midiNotes'})))
        drawMidiBackground()
    })

    onMounted(() => {
        setEventBg()
        addDragListeners()
        if(isRecording.value){
            recordingInterval = setInterval(recordingUpdateEvent,store.getters.getRecordingTimeTick)
            if(props.type == "audio"){
                startRecording()
            }else{
                computeNotesQuotes()
                startRecordingMidi()
            }
            
        }else{
            if(props.type == "audio"){
                drawWaveForm()
            }else{
                midiNotes = JSON.parse(JSON.stringify(props.event.midiNotes))
                computeNotesQuotes()
                drawMidiBackground()
            }
        }
    })
</script>