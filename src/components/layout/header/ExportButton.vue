<template>
    <div 
        aria-label="Esporta progetto" data-balloon-pos="up-right" data-balloon-blunt data-balloon-nofocus 
        class="export-btn cursor-pointer esportas rounded-full bg-[#1e2025] text-xl text-[#8d94a5] w-9 h-9 transition duration-200 hover:bg-[#2f323c] hover:text-white flex items-center justify-center"
    >
        <i className="bi-save2"></i>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {onMounted,computed} from 'vue'
    import interact from 'interactjs'
    import { saveAs } from 'file-saver'
    import {noteToNumber} from '../../../utils/utils'

    const store     = useStore();
    const timeTick  = computed(() => store.getters.getTimeTick)
    const player    = {
        context             : undefined,
        gainNodes           : {},
        pannerNodes         : {},
        //pitchShifterNodes   : {},
        sourceNodes         : {},
        playbackTimer       : undefined,
        monitorPlayback     : (state, actualStartTime, timeTick, startOffset = 0) => {
            if (player.playbackTimer) {
                cancelAnimationFrame(state.player.playbackTimer);
            }
    
            function update() {
                const rulerPosition = Math.ceil((state.player.context.currentTime - actualStartTime + startOffset) / timeTick) + 1
                state.project.rulerPosition = rulerPosition
                state.project.time = (rulerPosition * timeTick).toFixed(3)
                state.player.playbackTimer = requestAnimationFrame(update);
            }
    
            player.playbackTimer = requestAnimationFrame(update);
        },
        reset               : () => {
            for(let id in player.sourceNodes){
                if(player.sourceNodes[id].disconnect){
                    player.sourceNodes[id].disconnect()
                }
                delete player.sourceNodes[id]
            }
            for(let id in player.gainNodes){player.gainNodes[id].disconnect();delete player.gainNodes[id]}
            for(let id in player.pannerNodes){player.pannerNodes[id].disconnect();delete player.pannerNodes[id]}
            //for(let id in state.player.pitchShifterNodes){state.player.pitchShifterNodes[id].disconnect();delete state.player.pitchShifterNodes[id]}
        },
        workletsLoaded      : {
            'pitch' : false
        }
    }

    //const toDecibels = (linearValue) => 20 * Math.log10(linearValue);

    async function loadAudioBlob(audioContext,blob) {
        const arrayBuffer = await blob.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        return audioBuffer
    }

    async function createAudioSource(audioContext,item,type,instrument,trackid) {
        let toReturn
        if(type === 'audio'){
            const buffer = await loadAudioBlob(audioContext,item.blob)
            const sourceNode = audioContext.createBufferSource()
            sourceNode.buffer = buffer
            toReturn = sourceNode
        }else{
            let soundfontPlayer = require('soundfont-player')

            const trackPlayer = await soundfontPlayer.instrument(
                audioContext, 
                './soundfont/'+instrument+'-mp3.js',
                {
                    destination : player.pannerNodes[trackid]
                }
            )
            toReturn = trackPlayer        
        }
        
        return toReturn;
    }

    const initializeTracks = async () => {
        const promises = []
        store.state.project.tracks.forEach(track => {
            
            const gainNode = player.context.createGain()
            gainNode.gain.value = track.volume

            const pannerNode = player.context.createStereoPanner()
            pannerNode.pan.value = track.pan / 50

            player.gainNodes[track.id] = gainNode
            player.pannerNodes[track.id] = pannerNode
            //state.player.pitchShifterNodes[track.id] = pitchShifterNode

            //pitchShifterNode.connect(pannerNode)
            pannerNode.connect(gainNode);
            gainNode.connect(player.context.destination)

            track.events.forEach(event => {
                if (!player.sourceNodes[event.id]) {
                    const promise = createAudioSource(player.context, event, track.type, track.instrument, track.id).then(sourceNode => {
                        player.sourceNodes[event.id] = sourceNode
                        if(track.type === 'audio') sourceNode.connect(player.pannerNodes[track.id])

                    })
                    promises.push(promise)
                }
            })
        })

        await Promise.all(promises)
    }
            

    onMounted(() => {
        interact('.export-btn').on('tap', function (event) {
            event.preventDefault();
            player.reset()

            //recupero la lunghezza massima degli eventi
            let minStart  = Infinity
            let maxEnd    = 0

            store.state.project.tracks.forEach((track) => {
                track.events.forEach((event) => {
                    minStart  = Math.min(minStart, (event.left + (event.trim?event.trim.start:0)) * timeTick.value)
                    maxEnd    = Math.max(maxEnd, (event.left + event.length + (event.trim?event.trim.stop:0)) * timeTick.value)
                })
            })

            const sampleRate = 44100 // Frequenza di campionamento standard
            const durationInSeconds = maxEnd
            player.context = new OfflineAudioContext(2, sampleRate * durationInSeconds, sampleRate)

            initializeTracks().then(async () => {
                const actualStartTime = player.context.currentTime
                const startOffset = 0
                const timeTick = (((60 / store.state.project.bpm) / 4))

                store.state.project.tracks.forEach(track => {
                    track.events.forEach(event => {
                        const sourceNode = player.sourceNodes[event.id]

                        if(track.type === 'audio'){
                            //recupero il sourceNode relativo all'evento
                            
                            //calcolo start, duration e stop del sourceNode
                            const leftInSeconds       = event.left * timeTick                                    //inizio assoluto evento in secondi
                            const lengthInSeconds     = event.length * timeTick                                  //lunghezza assoluta evento in secondi
                            const trimLeftInSeconds   = (event.trim?event.trim.start:0) * timeTick               //trim sinistro evento in secondi
                            const trimRightInSeconds  = (event.trim?event.trim.stop:0) * timeTick                //trim destro evento in secondi

                            const start     = Math.max((leftInSeconds + trimLeftInSeconds) - startOffset,0)      //l'inizio del play è dato dalla differenza dell'inizio assoluto più il trim eventuale sinistro e la posizione del ruler
                            const offset    = trimLeftInSeconds + startOffset                                    //l'offset da cui suonare il blob è la posizione assoluta iniziale più il trim sinistro
                            const end       = lengthInSeconds - trimLeftInSeconds + trimRightInSeconds           //la fine del play è data dall'inizio assoluto più la lunghezza assoluta meno i due trim
                            
                            sourceNode.start(
                                actualStartTime + start, 
                                offset,
                                end
                            )
                        }else{
                            //è un midi o una drum machine, devo schedulare le note nel soundfont-player
                            let schedule = []
                            const rulerPosition = 0

                            for(let note in event.midiNotes){
                                event.midiNotes[note].forEach((singleNote) => {
                                    
                                    let realStart       = singleNote.start
                                    let realEnd         = singleNote.end
                                    let realDuration    = (realEnd - realStart)
                                    let startTrim       = (event.trim?event.trim.start:0)
                                    let endTrim         = (event.trim?event.trim.stop:0)
                                    

                                    //se la fine della nota è dopo la posizione del ruler o dopo il reale inizio dell'evento compreso il trim left allora non schedularla
                                    if(
                                        (realEnd <= rulerPosition) || 
                                        (realEnd <= event.left + startTrim) ||
                                        (sourceNode && !sourceNode.buffers[noteToNumber(note)])
                                    ) return
                                    
                                    //se l'inizio della nota è prima dell'inizio dell'evento allora cambia il punto d'inizio e riduci la durata
                                    if((event.left + startTrim) > realStart){
                                        realStart       = event.left + startTrim
                                        realDuration    = realEnd - realStart
                                    }

                                    //se la fine della nota è dopo la fine dell'evento meno il trim end allora riduci la durata
                                    if((event.left + event.length + endTrim) < realEnd){
                                        realDuration -= realEnd - (event.left + event.length + endTrim)
                                    }

                                    schedule.push({
                                        time        : (realStart - rulerPosition) * timeTick,
                                        note        : note,
                                        duration    : realDuration * timeTick,
                                        gain        : singleNote.velocity || 1
                                    })
                                })
                            }
                            if(sourceNode) sourceNode.schedule(actualStartTime,schedule)
                        }
                    })
                    //state.player.monitorPlayback(state, actualStartTime, timeTick, startOffset);
                })



              const renderedBuffer = await player.context.startRendering()
              const toWav = require('audiobuffer-to-wav')
              const wav = toWav(renderedBuffer)
              saveAs(new Blob([wav], { type: 'audio/wav' }), store.state.project.title?store.state.project.title+'.wav':'output.wav');
            })

        })
    }) 
</script>