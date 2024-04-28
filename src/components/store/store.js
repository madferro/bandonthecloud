import Vuex from 'vuex'
import Dexie from 'dexie'
import {toggleLoadingModal,noteToNumber} from '../../utils/utils.js'
import { toast } from "vue3-toastify";
import "vue3-toastify/dist/index.css"

const _ = require('lodash')
const midimessage = require('midimessage')
const midiNoteConverter = require('midi-note')
let globalMidiAccess

const db = new Dexie('BandOnTheCloud')
db.version(1).stores({
    project: 'userid,project', // Primary key and indexed props
});

db.open().catch(err => {console.error('Apertura del database fallita:', err)});

const cloneProjectForSave = (project) => {
    let cloned = _.cloneDeep(project)

    cloned.tracks.forEach((track) => {
        track.selected = false
        track.events.forEach((event) => {
            event.selected  = false
            event.flash     = false
        })
    })

    return {
        bpm         : cloned.bpm,
        counters    : cloned.counters,
        divisions   : cloned.divisions,
        lastModify  : cloned.lastModify,
        title       : cloned.title,
        tracks      : cloned.tracks
    }
}

const updateProjectHistory = (project) => {
    let toSend = cloneProjectForSave(project)
    window.emitter.emit('updateProjectHistory',toSend);

    //salvataggio su indexedDb
    db.project
    .where({userid:project.creator})
    .delete()
    .then(function () {
        db.project.put({
            userid:project.creator,
            project: toSend
        })
    });
}

export const addEvent = (store, trackid, left, length, url, blob, recording, trim, midiNotes) => {
    store.commit("incrementCounter","events");
    
    let track = store.getters.getTrack(trackid);
    let eventId = "event-"+store.getters.getProjectProperty("counters").events
    let event = {
        id          : eventId,  
        left        : left || store.getters.getProjectProperty("rulerPosition"),
        length      : length || 0,
        blob        : blob || undefined,
        url         : url,
        trim        : trim || undefined,
        recording   : recording,
        selected    : false,
        midiNotes   : midiNotes || {},
        flash       : false

    }
    track.events.push(event)
    initializeTracks(store.state)
    return eventId;
}

async function getMediaPermissions() {
    try {
        // Richiede l'accesso a video e audio per ottenere i permessi
        // È possibile chiedere solo per l'audio se non serve l'accesso alla webcam
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

        // Una volta ottenuti i permessi, elenca i dispositivi
        const devices = await navigator.mediaDevices.enumerateDevices()

        // Filtra per ottenere solo gli input devices audio
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput')
        const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput')

        return {input:audioInputDevices,output:audioOutputDevices}
    } catch (error) {
        console.error('Errore nell\'ottenimento dei permessi o nell\'elencazione dei dispositivi:', error);
        return [];
    }
}

const discoverInputDevices = () => {
    let inputDevices    = []
    let outputDevices   = []
    getMediaPermissions().then(discoveredDevices => {
        discoveredDevices.input.forEach(device => {
            inputDevices.push(device)
        })

        discoveredDevices.output.forEach(device => {
            outputDevices.push(device)
        })
        store.commit("setInputDevices",inputDevices)
        store.commit("setOutputDevices",outputDevices)
    });
    navigator.mediaDevices.getUserMedia({ audio: true })
}

const discoverMIDIDevices = () => {
    if (!navigator.requestMIDIAccess) {
        console.log("Web MIDI API is not available in this browser.")
        return
    }

    navigator.requestMIDIAccess().then(midiAccess => { 
        globalMidiAccess = midiAccess        
        setupMidiEnvironment()
        midiAccess.removeEventListener('statechange',setupMidiEnvironment)
        midiAccess.addEventListener('statechange',setupMidiEnvironment)
    }).catch(err => {
        console.error("Could not access MIDI devices:", err)
    })
}

const setupMidiEnvironment = () => {
    const devices = {}
    // Itera su tutti gli input MIDI disponibili
    const inputs = globalMidiAccess.inputs.values()
    
    inputs.forEach((input) => {
        //require('soundfont-player')

        input.onmidimessage = (msg) => {
            var mm = msg.messageType ? msg : midimessage(msg)
            if (mm.messageType === 'noteon' && mm.velocity === 0) {
                mm.messageType = 'noteoff'
            }
            let noteName = midiNoteConverter(mm.key)
            
            switch (mm.messageType) {
                case 'noteon':
                    for(let trackid in store.state.midiPlayer.players){
                        if((store.state.midiPlayer.players[trackid].inputId === input.id) && (!store.state.midiPlayer.players[trackid].playedMidiNotes[noteName])){
                            let actualPlayer = store.state.midiPlayer.players[trackid]
                            if(store.state.midiPlayer.players[trackid].player.buffers[mm.key]){
                                actualPlayer.playedMidiNotes[noteName] = store.state.midiPlayer.players[trackid].player.play(mm.key, 0, { gain: mm.velocity / 127, loop:true })
                            }
                            delete store.state.midiPlayer.players[trackid]
                            store.state.midiPlayer.players[trackid] = actualPlayer
                        }
                    }
                break;
                case 'noteoff':
                    for(let trackid in store.state.midiPlayer.players){
                        if(store.state.midiPlayer.players[trackid].inputId === input.id){
                            let actualPlayer = store.state.midiPlayer.players[trackid]
                            if(actualPlayer.playedMidiNotes[noteName]){
                                actualPlayer.playedMidiNotes[noteName].stop()
                            }
                            delete actualPlayer.playedMidiNotes[noteName]
                            delete store.state.midiPlayer.players[trackid]
                            store.state.midiPlayer.players[trackid] = actualPlayer
                        }
                    }
                break;
                default:
                break;
                
            }
            
        }
        devices[input.id] = input
    })

    // Commit al tuo store Vuex
    store.commit("setMidiInputDevices", devices)
}

/*FUNZIONI PER GLI AUDIOBUFFER*/
async function loadAudioBlob(audioContext,blob) {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    return audioBuffer
}

async function createAudioSource(state,audioContext,item,type,instrument,trackid) {
    let toReturn
    if(type === 'audio'){
        const buffer = await loadAudioBlob(audioContext,item.blob)
        const sourceNode = audioContext.createBufferSource()
        sourceNode.buffer = buffer
        toReturn = sourceNode
    }else{
        let player = require('soundfont-player')

        const trackPlayer = await player.instrument(
            audioContext, 
            './soundfont/'+instrument+'-mp3.js',
            {
                destination : state.player.pannerNodes[trackid]
            }
        )
        toReturn = trackPlayer        
    }
    
    return toReturn;
}

const initializeTracks = async (state) => {
    const promises = []
    state.project.tracks.forEach(track => {
        
        const gainNode = state.player.context.createGain()
        gainNode.gain.value = track.volume

        const pannerNode = state.player.context.createStereoPanner()
        pannerNode.pan.value = track.pan / 50

        /*const pitchShifterNode = new AudioWorkletNode(state.player.context, 'phase-vocoder-processor')
        pitchShifterNode.parameters.get('pitchFactor').value = Math.pow(2, track.pitch/12)*/

        state.player.gainNodes[track.id] = gainNode
        state.player.pannerNodes[track.id] = pannerNode
        //state.player.pitchShifterNodes[track.id] = pitchShifterNode

        //pitchShifterNode.connect(pannerNode)
        pannerNode.connect(gainNode);
        gainNode.connect(state.player.context.destination)

        track.events.forEach(event => {
            if (!state.player.sourceNodes[event.id]) {
                const promise = createAudioSource(state,state.player.context, event, track.type, track.instrument, track.id).then(sourceNode => {
                    state.player.sourceNodes[event.id] = sourceNode
                    if(track.type === 'audio') sourceNode.connect(state.player.pannerNodes[track.id])

                })
                promises.push(promise)
            }
        })
    })

    await Promise.all(promises)
}
/*FINE FUNZIONI PER GLI AUDIOBUFFER*/

export const store = new Vuex.Store({
    state: {
        userInfos           : {},
        trackModal          : false,
        fullScreen          : false,
        copiedEvents        : [],
        inputDevices        : [],
        loops               : [],
        midiInputDevices    : {},
        midiPlayer          : {
            context             : new (window.AudioContext || window.webkitAudioContext)(),
            players             : {},
            loadPlayerInstrument: (state,trackid,instrument,inputId) => {
                toggleLoadingModal(true)
                delete state.midiPlayer.players[trackid]
                //if(state.midiInputDevices[inputId]){
                    state.midiPlayer.players[trackid] = {
                        inputId             : inputId,
                        player              : undefined,
                        playedMidiNotes     : {}
                    }

                    let player = require('soundfont-player')

                    player.instrument(state.midiPlayer.context, './soundfont/'+instrument+'-mp3.js')
                    .then(function (pl) {
                        
                        state.midiPlayer.players[trackid].player = pl
                        state.midiPlayer.players[trackid].playedMidiNotes = {}
                        
                        state.player.reset(state)           // distruggi tutti i nodi per un play successivo
                        initializeTracks(state).then(() => {
                            toggleLoadingModal(false)
                        })
                        
                    })
                    .catch(function(err){console.log(err);toggleLoadingModal(false)})
                /*}else{
                    toggleLoadingModal(false)
                }*/
            }
        },
        outputDevices           : [],
        player: {
            context             : new (window.AudioContext || window.webkitAudioContext)(),
            gainNodes           : {},
            pannerNodes         : {},
            //pitchShifterNodes   : {},
            sourceNodes         : {},
            playbackTimer       : undefined,
            monitorPlayback     : (state, actualStartTime, timeTick, startOffset = 0) => {
                if (state.player.playbackTimer) {
                    cancelAnimationFrame(state.player.playbackTimer);
                }
        
                function update() {
                    const rulerPosition = Math.ceil((state.player.context.currentTime - actualStartTime + startOffset) / timeTick) + 1
                    state.project.rulerPosition = rulerPosition
                    state.project.time = (rulerPosition * timeTick).toFixed(3)
                    state.player.playbackTimer = requestAnimationFrame(update);
                }
        
                state.player.playbackTimer = requestAnimationFrame(update);
            },
            reset               : (state) => {
                for(let id in state.player.sourceNodes){
                    if(state.player.sourceNodes[id].disconnect){
                        state.player.sourceNodes[id].disconnect()
                    }
                    delete state.player.sourceNodes[id]
                }
                for(let id in state.player.gainNodes){state.player.gainNodes[id].disconnect();delete state.player.gainNodes[id]}
                for(let id in state.player.pannerNodes){state.player.pannerNodes[id].disconnect();delete state.player.pannerNodes[id]}
                //for(let id in state.player.pitchShifterNodes){state.player.pitchShifterNodes[id].disconnect();delete state.player.pitchShifterNodes[id]}
            },
            workletsLoaded      : {
                'pitch' : false
            }
        },
        project             : {
            bpm                 : 120,
            counters            : {
                tracks  : 0,
                events  : 0
            },
            creator             : undefined,
            divisions           : [4,4],
            drumsRollInfos      : undefined,
            lastModify          : null,
            metronomeActive     : false,
            maxBatt             : 400,
            midiRollInfos       : undefined,
            minDivisions        : 16,
            octaves             : 6,
            outputId            : undefined,
            playing             : false,
            playingDrums        : false,
            playingRoll         : false,
            prerollBatt         : 0,
            recording           : false,
            rulerPosition       : 0,
            rulerDrumsPosition  : 0,
            rulerRollPosition   : 0,
            selectedEvents      : [],
            selectedTracks      : [],
            time                : 0.000,
            title               : '',
            trackHeight         : 100,
            trackHeightDrumsRoll: 20,
            trackHeightPianoRoll: 20,
            tracks              : [],
            unitSize            : 12,
            unitSizeDrumsRoll   : 12,
            unitSizePianoRoll   : 12,
            zoom                : 100,
            zoomDrumsRoll       : 100,
            zoomPianoRoll       : 100
        },
        showLoopPanel       : false
    },
    mutations: {
        addTrack(state,trackProperties){
            state.project.counters.tracks++;
            state.project.tracks.push({
                events      : [],
                id          : "track-"+state.project.counters.tracks,
                inputSource : undefined,
                instrument  : trackProperties.instrument,
                mute        : false,
                pan         : 0,
                pitch       : 0,
                selected    : false,
                solo        : false,
                title       : trackProperties.title,
                type        : trackProperties.type,
                volume      : 0.5
            })
            state.project.lastModify = Date.now()
            updateProjectHistory(state.project)
        },
        copyEvents(state,copiedEvents){
            state.copiedEvents = copiedEvents
        },
        decrementBPM(state){
            state.project.bpm = state.project.bpm - 1 
            state.project.lastModify = Date.now()
            updateProjectHistory(state.project)
        },
        deleteEvent(state,eventInfos){
            const trackIndex = state.project.tracks.findIndex(t => t.id === eventInfos.trackid);
            if (trackIndex !== -1) {
                state.project.tracks[trackIndex].events = state.project.tracks[trackIndex].events.filter(e => e.id !== eventInfos.eventid)
            }
            state.project.lastModify = Date.now()

            if (state.player.sourceNodes[eventInfos.eventid]) {
                if(state.player.sourceNodes[eventInfos.eventid].disconnect){
                    state.player.sourceNodes[eventInfos.eventid].disconnect()
                }
                delete state.player.sourceNodes[eventInfos.eventid]
            }

            updateProjectHistory(state.project)
        },
        deleteEvents(state){
            state.project.selectedEvents.forEach((event) => {
                const trackIndex = state.project.tracks.findIndex(t => t.id === event.trackid);
                if (trackIndex !== -1) {
                    state.project.tracks[trackIndex].events = state.project.tracks[trackIndex].events.filter(e => e.id !== event.eventid)
                }
                state.project.lastModify = Date.now()

                if (state.player.sourceNodes[event.eventid]) {
                    if(state.player.sourceNodes[event.eventid].disconnect){
                        state.player.sourceNodes[event.eventid].disconnect()
                    }
                    delete state.player.sourceNodes[event.eventid]
                }
            })
            state.project.selectedEvents = []
            updateProjectHistory(state.project)
        },
        deleteTrack(state,trackid){
            const track = state.project.tracks.find(t => t.id === trackid);
            if (track) {
                track.events.forEach(event => {
                    if (state.player.sourceNodes[event.id]) {
                        if(state.player.sourceNodes[event.id].disconnect){
                            state.player.sourceNodes[event.id].disconnect()
                        }
                        delete state.player.sourceNodes[event.id];
                    }
                });
            }
            if (state.player.gainNodes[trackid]) {
                state.player.gainNodes[trackid].disconnect();
                delete state.player.gainNodes[trackid];
            }

            if (state.player.pannerNodes[trackid]) {
                state.player.pannerNodes[trackid].disconnect();
                delete state.player.pannerNodes[trackid];
            }

            /*if (state.player.pitchShifterNodes[trackid]) {
                state.player.pitchShifterNodes[trackid].disconnect();
                delete state.player.pitchShifterNodes[trackid];
            }*/

            state.project.tracks = state.project.tracks.filter(t => t.id !== trackid)
            updateProjectHistory(state.project)
        },
        deleteTracks(state){
            state.project.selectedTracks.forEach((trackid) => {
                const track = state.project.tracks.find(t => t.id === trackid);
                if (track) {
                    track.events.forEach(event => {
                        if (state.player.sourceNodes[event.id]) {
                            if(state.player.sourceNodes[event.id].disconnect){
                                state.player.sourceNodes[event.id].disconnect()
                            }
                            delete state.player.sourceNodes[event.id];
                        }
                    });
                }
                if (state.player.gainNodes[trackid]) {
                    state.player.gainNodes[trackid].disconnect();
                    delete state.player.gainNodes[trackid];
                }

                if (state.player.pannerNodes[trackid]) {
                    state.player.pannerNodes[trackid].disconnect();
                    delete state.player.pannerNodes[trackid];
                }

                /*if (state.player.pitchShifterNodes[trackid]) {
                    state.player.pitchShifterNodes[trackid].disconnect();
                    delete state.player.pitchShifterNodes[trackid];
                }*/

                state.project.tracks = state.project.tracks.filter(t => t.id !== trackid)
            })
            state.project.selectedTracks = []
            updateProjectHistory(state.project)
        },
        deselectEvents(state){
            state.project.selectedEvents = []
            state.project.tracks.forEach((track) => track.events.forEach((event) => event.selected = false))
        },
        deselectTracks(state){
            state.project.selectedTracks = []
            state.project.tracks.forEach((track) => track.selected = false)
        },
        hideLoopsPanel(state){state.showLoopPanel = false},
        incrementBPM(state){
            state.project.bpm = state.project.bpm + 1
            state.project.lastModify = Date.now()
            updateProjectHistory(state.project)
        },
        incrementCounter(state,counter){state.project.counters[counter]++},
        loadPlayerInstrument(state,properties){state.midiPlayer.loadPlayerInstrument(state,properties.trackid,properties.instrument,properties.inputId)},
        playerPlay(state) {
            if (state.player.context.state === 'suspended') {
                state.player.context.resume().then(() => {
                    doPlay(state)
                })
            }else{
                doPlay(state)
            }

            function doPlay(state){
                const actualStartTime = state.player.context.currentTime
                const startOffset = parseFloat(state.project.time)
                const timeTick = (((60 / state.project.bpm) / 4))

                state.project.tracks.forEach(track => {
                    track.events.forEach(event => {
                        const sourceNode = state.player.sourceNodes[event.id]

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
                            const rulerPosition = state.project.rulerPosition

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
                    state.player.monitorPlayback(state, actualStartTime, timeTick, startOffset);
                })
            }
            
        },
        playerStop(state) {
            Object.keys(state.player.sourceNodes).forEach(id => {
                const sourceNode = state.player.sourceNodes[id]
                if (sourceNode) {
                    sourceNode.stop()                   // Ferma il nodo   
                }
            })

            state.player.reset(state)           // distruggi tutti i nodi per un play successivo
            initializeTracks(state)             // reinizializza tutti i nodi per un play successivo 
    
            if (state.player.playbackTimer) {
                cancelAnimationFrame(state.player.playbackTimer);
            }

            state.player.context.suspend()
        },
        reorderTracks(state,newOrder){
            let reorderedTracks = [];
            newOrder.forEach((trackid) => {reorderedTracks.push(state.project.tracks.find((track) => track.id === trackid))})
            state.project.tracks = reorderedTracks
            updateProjectHistory(state.project)
        },
        resetPlayer(state){
            state.player.reset(state)
            initializeTracks(state)
        },
        setCopiedEvents(state,events){
            state.copiedEvents = events
            toast((state.copiedEvents.length > 1)?state.copiedEvents.length+' eventi copiati':'1 evento copiato', {
                "theme"     : "dark",
                "type"      : "success",
                "autoClose" : 1000
            })
        },
        setEventProperties(state,eventInfos){
            const trackIndex = state.project.tracks.findIndex(t => t.id === eventInfos.trackid);
            if (trackIndex !== -1) {
                const eventIndex = state.project.tracks[trackIndex].events.findIndex(e => e.id === eventInfos.eventid);
                if (eventIndex !== -1) {
                    state.project.tracks[trackIndex].events[eventIndex] = { 
                        ...state.project.tracks[trackIndex].events[eventIndex], 
                        ...eventInfos.properties 
                    }
                }
            }
            state.project.lastModify = Date.now()
            updateProjectHistory(state.project)
        },
        setEventSelected(state,eventInfos){
            const trackIndex = state.project.tracks.findIndex(t => t.id === eventInfos.trackid)
            if (trackIndex !== -1) {
                const eventIndex = state.project.tracks[trackIndex].events.findIndex(e => e.id === eventInfos.eventid)
                if (eventIndex !== -1) {
                    state.project.tracks[trackIndex].events[eventIndex].selected = eventInfos.selected
                }
            }
            state.project.selectedEvents = []
            state.project.tracks.forEach((track) => {
                track.events.forEach((event) => {
                    if(event.selected) state.project.selectedEvents.push({eventid:event.id,trackid:track.id})
                })
            })
        },
        setInputDevices(state,devices){state.inputDevices = devices},
        setLoops(state,loops){state.loops = loops},
        setMidiInputDevices(state, devices) {state.midiInputDevices = devices},
        setOutputDevice(state,deviceId){
            state.project.outputId = deviceId
            state.player.context.setSinkId((state.project.outputId !== 'default')?state.project.outputId:'')
            state.midiPlayer.context.setSinkId((state.project.outputId !== 'default')?state.project.outputId:'')
        },
        setOutputDevices(state,devices){state.outputDevices = devices},
        setProjectFromDb(state){
            db.project.get({userid:state.project.creator}).then((proj) => {
                if(proj){
                    const savedProject = proj.project
                    state.project = {
                        ...state.project,
                        ...savedProject
                    }
                    window.emitter.emit('projectLoadedFromDb',cloneProjectForSave(state.project))
                }
            })
        },
        setProjectProperties(state,properties){
            Object.keys(properties).forEach((key) => {
                state.project[key] = properties[key]
                switch(key){
                    case "zoom":
                        state.project.unitSize = (200 / 16) * (properties[key] / 100)
                    break;
                    case "zoomDrumsRoll":
                        state.project.unitSizeDrumsRoll = (200 / 16) * (properties[key] / 100)
                    break;
                    case "zoomPianoRoll":
                        state.project.unitSizePianoRoll = (200 / 16) * (properties[key] / 100)
                    break;
                    default: 
                    break;
                }
            })
        },
        setRulerPosition(state,rulerPosition){
            state.project.rulerPosition = rulerPosition
            state.project.time = (state.project.rulerPosition * ((60 / state.project.bpm) / 4)).toFixed(3)
        },
        setRulerRollPosition(state,rulerPosition){
            state.project.rulerRollPosition = rulerPosition
        },
        async setupPlayer(state) {
            // Carica il modulo worklet se non è già stato caricato
            /*if (!state.player.workletsLoaded['pitch']) {
                try {
                    await state.player.context.audioWorklet.addModule('audioWorklets/phase-vocoder.js')
                    state.player.workletsLoaded['pitch'] = true; // Imposta un flag per indicare che il worklet è stato caricato
                    initializeTracks(state)
                } catch(error) {
                    console.error('Errore nel caricamento del worklet audio:', error)
                }
            } else {*/
                initializeTracks(state)
            //}
        },
        setUser(state,userInfos){
            state.userInfos = userInfos
            if(!state.project.creator){
                state.project.creator = userInfos.userid
            }
        },
        setTrackModal(state,flag){state.trackModal = flag},
        setTrackSelected(state,trackid){
            state.project.tracks.forEach((track) => track.selected = false)
            state.project.tracks.find((track) => track.id === trackid).selected = true
            state.project.selectedTracks = []
            state.project.tracks.forEach((track) => {
                if(track.selected) state.project.selectedTracks.push(track.id)
            })
        },
        setTrackProperties(state,properties){
            const trackIndex = state.project.tracks.findIndex(t => t.id === properties.trackid)
            if(trackIndex !== -1) { state.project.tracks[trackIndex] = { ...state.project.tracks[trackIndex], ...properties.properties }}
            if(properties.updateHistory === true){ updateProjectHistory(state.project) }
        },
        shiftEventTrack(state,properties){
            const oldTrackIndex = state.project.tracks.findIndex(t => t.id === properties.oldTrackId)
            const newTrackIndex = state.project.tracks.findIndex(t => t.id === properties.newTrackId)
            const event         = state.project.tracks[oldTrackIndex].events.find(e => e.id === properties.eventId)
            const eventIndex    = state.project.tracks[oldTrackIndex].events.findIndex(e => e.id === properties.eventId)
            event.flash         = false

            if(eventIndex !== -1){
                state.project.tracks[oldTrackIndex].events.splice(eventIndex, 1)
                state.project.tracks[newTrackIndex].events.push(event)
                initializeTracks(state)
                updateProjectHistory(state.project)
            }
        },
        showLoopsPanel(state){state.showLoopPanel = true},
        toggleDrumsRollPlaying(state){state.project.playingDrums = !state.project.playingDrums},
        toggleFullscreen(state){
            state.fullScreen = !state.fullScreen
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        },
        toggleMetronome(state){state.project.metronomeActive = !state.project.metronomeActive},
        toggleRecording(state){
            state.project.recording = !state.project.recording
            if(state.project.recording){
                let selectedTrack = this.getters.getSelectedTrack();
                addEvent(
                    this,               //store
                    selectedTrack.id,   //id traccia
                    undefined,          //left
                    0,                  //length
                    undefined,          //url file wav
                    undefined,          //blob audio
                    true                //registrazione
                );
            }
        },
        togglePianoRollPlaying(state){state.project.playingRoll = !state.project.playingRoll},
        togglePlaying(state){state.project.playing = !state.project.playing},
        updatePannerNode(state, { trackid, pan }) {
            const pannerNode = state.player.pannerNodes[trackid];
            if (pannerNode) {
                pannerNode.pan.value = pan;
            }
        },
        updateGainNode(state, { trackid, volume }) {
            const gainNode = state.player.gainNodes[trackid]
            if (gainNode) {
                gainNode.gain.value = volume
            }
        },
        /*updatePitch(state, { trackid, pitch }) {
            state.player.pitchShifterNodes[trackid].parameters.get('pitchFactor').value = Math.pow(2, pitch/12)
        },*/
        updateProjectHistory(state){
            state.project.lastModify = Date.now()
            updateProjectHistory(state.project)
        }
    },
    actions: {
        deleteItems(store){
            if(store.state.project.selectedEvents.length > 0){
                if(confirm('Vuoi davvero eliminare gli eventi selezionati?')){
                    store.commit('deleteEvents')
                }
            }else if(store.state.project.selectedTracks.length > 0){
                if(confirm('Vuoi davvero eliminare le tracce selezionate?')){
                    store.commit('deleteTracks')
                }
                //cancella le tracce selezionate
            }
        },
        initializePlayer({ commit }) {commit('setupPlayer')},
        playerPlay({ commit }) {
            commit('playerPlay')
            commit('togglePlaying')
        },
        playerStop({ commit }) {
            commit('playerStop')
            commit('togglePlaying')
            commit('setupPlayer')
        }
    },
    getters: {
        getCopiedEvents         : (state) => state.copiedEvents,
        getEvent                : (state) => (eventInfos) => {
            let event = null
            const trackIndex = state.project.tracks.findIndex(t => t.id === eventInfos.trackid);
            if (trackIndex !== -1) {
                const eventIndex = state.project.tracks[trackIndex].events.findIndex(e => e.id === eventInfos.eventid);
                event = state.project.tracks[trackIndex].events[eventIndex]
            }
            return event
        },
        getEvents               : (state) => {
            let events = []
            state.project.tracks.forEach((track) => track.events.forEach((event) => events.push(event)))
            return events
        },
        getEventProperty        : (state) => (eventInfos) => {
            let propertyValue = null
            const trackIndex = state.project.tracks.findIndex(t => t.id === eventInfos.trackid)
            if (trackIndex !== -1) {
                const eventIndex = state.project.tracks[trackIndex].events.findIndex(e => e.id === eventInfos.eventid)
                propertyValue = state.project.tracks[trackIndex].events[eventIndex][eventInfos.property]
            }
            return propertyValue
        },
        getEventsBlobs          : (state) => {
            let blobs = [];
            state.project.tracks.forEach((track) => {
                track.events.forEach((event) => {
                    if(event.blob && event.blob != null){
                        blobs.push({
                            left    : event.left,
                            length  : event.length,
                            trim    : event.trim,
                            blob    : event.blob
                        })
                    }
                })
            })
            return blobs
        },
        getFullscreen           : (state) => state.fullScreen,
        getInputDevices         : (state) => state.inputDevices,
        getmidiInputDevices     : (state) => state.midiInputDevices,
        getMidiPlayerNotes      : (state) => (trackid) => state.midiPlayer.players[trackid] ? state.midiPlayer.players[trackid].playedMidiNotes : {},
        getLoop                 : (state) => (loopid) => state.loops.samples.find((loop) => loop.id === loopid),
        getLoops                : (state) => state.loops.samples,
        getLoopsFilters         : (state) => state.loops.filters,
        getOutputDevices        : (state) => state.outputDevices,
        getProject              : (state) => state.project,
        getProjectProperty      : (state) => (property) => state.project[property],
        getRecordingTimeTick    : (state) => (((60 / state.project.bpm) / 4) * 1000 ),
        getSelectedEvents       : (state) => {
            const selected = []
            state.project.tracks.forEach((track) => {
                track.events.forEach((event) => {
                    if(event.selected){
                        selected.push({
                            eventid : event.id,
                            trackid : track.id,
                            type    : track.type 
                        })
                    }
                })
            })

            return selected
        },
        getSelectedTrack        : (state) => () => state.project.tracks.find((track) => track.selected === true),
        getTimeTick             : (state) => (((60 / state.project.bpm) / 4)),
        getTrack                : (state) => (trackid) => state.project.tracks.find((track) => track.id === trackid),
        getTrackIndex           : (state) => (trackid) => state.project.tracks.findIndex((track) => track.id === trackid),
        getTrackInputSource     : (state) => (trackid) => {
            const track = state.project.tracks.find(t => t.id === trackid);
            return track ? track.inputSource : null;
        },  
        getTrackInstrument      : (state) => (trackid) => {
            const track = state.project.tracks.find(t => t.id === trackid);
            return track ? track.instrument : null;
        },     
        getTrackModal           : (state) => state.trackModal,
        getTrackPosition        : (state) => (trackid) => state.project.tracks.findIndex((track) => track.id === trackid),
        getTracksNumber         : (state) => state.project.tracks.length,
        getTrackType            : (state) => (trackid) => state.project.tracks.find((track) => track.id === trackid).type,
        getUnitSize             : (state) => parseInt(state.project.unitSize),
        getUnitSizeDrumsRoll    : (state) => parseInt(state.project.unitSizeDrumsRoll),
        getUnitSizePianoRoll    : (state) => parseInt(state.project.unitSizePianoRoll),
        getUserInfos            : (state) => state.userInfos,
        isLogged                : (state) => Object.keys(state.userInfos).length > 0,
        isLoopPanelOpened       : (state) => state.showLoopPanel,
    },
})

discoverMIDIDevices()
discoverInputDevices()
navigator.mediaDevices.removeEventListener('devicechange', discoverInputDevices)
navigator.mediaDevices.addEventListener('devicechange', discoverInputDevices)

const keyDownListener = (event) => {
    //console.log(event.keyCode,store)
    switch(event.keyCode){
        case 67:    //c
            //if(event.ctrlKey || event.metaKey) copySelected()
            event.stopPropagation()
            event.preventDefault()
        break;
        case 86:    //v
            //if(event.ctrlKey || event.metaKey) pasteSelected()
            event.stopPropagation()
            event.preventDefault()
        break;
        case 32:    //space
            event.stopPropagation()
            event.preventDefault()
            //togglePlay()
        break;
        case 8:     //backspace
        case 46:    //canc
            event.stopPropagation()
            event.preventDefault()
            store.dispatch('deleteItems')
        break;
    }
}

document.removeEventListener('keydown',keyDownListener)
document.addEventListener('keydown',keyDownListener)


export default store;