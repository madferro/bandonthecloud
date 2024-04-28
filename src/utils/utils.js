
import axios from 'axios'
import { store } from '../components/store/store.js'
import toWav from 'audiobuffer-to-wav'

export const allowedAudioFormats = [
    "audio/wav",
    "audio/ogg",
    "audio/mpeg"
]

export class Metronome {
    constructor(tempo = 120, divisions = [4,4]) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        this.tempo = tempo // BPM
        this.beatsPerMeasure = divisions[0] // Battute per misura
        this.noteValue = divisions[1] // Valore della nota che conta come battuta
        this.currentBeat = 0
        this.isPlaying = false
        this.tickVolume = 0.5
        this.accentVolume = 0.8
        this.nextNoteTime = 0.0
        this.scheduleAheadTime = 0.1
        this.noteLength = 0.1
        this.ticksCount = 0
        this.maxTicks = 0
        this.listeners = {}
    }

    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    emit(event, ...args) {
        const listeners = this.listeners[event];
        if (listeners) {
            listeners.forEach(listener => listener(...args));
        }
    }

    playTick(freq) {
        const osc = this.audioContext.createOscillator()
        const envelope = this.audioContext.createGain()

        osc.frequency.value = freq // Frequenza del tick
        osc.type = "sine"
        envelope.gain.value = 0.5
        osc.connect(envelope)
        envelope.connect(this.audioContext.destination)

        osc.start(this.nextNoteTime)
        osc.stop(this.nextNoteTime + this.noteLength)
        this.ticksCount++

        this.emit((this.maxTicks > 0)?'preroll-tick':'metronome-tick')
    }

    nextTick() {
        if(this.maxTicks > 0){
            if(this.maxTicks < this.ticksCount){
                this.stop()
                return
            }
        }
        const secondsPerBeat = 60.0 / this.tempo
        this.nextNoteTime += this.noteValue === 8 ? secondsPerBeat / 2 : secondsPerBeat

        this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure
    }

    scheduler() {
        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            this.playTick(this.currentBeat === 0 ? 1100 : 550)
            this.nextTick()
        }
    }

    start(maxTicks = 0) {
        if (this.isPlaying) return

        this.currentBeat = 0
        this.nextNoteTime = this.audioContext.currentTime
        this.isPlaying = true
        this.maxTicks = maxTicks * this.beatsPerMeasure

        this.interval = setInterval(() => this.scheduler(), 25)

        this.emit((this.maxTicks > 0)?'preroll-start':'metronome-start')
    }

    stop() {
        this.isPlaying = false
        this.ticksCount = 0
        clearInterval(this.interval)
        if (this.audioContext.state === 'running') {
            this.audioContext.close()
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
        }
        
        this.emit((this.maxTicks > 0)?'preroll-stop':'metronome-stop')
    }

    setTempo(tempo) {
        this.tempo = tempo
    }

    setDivisions(divisions){
        this.beatsPerMeasure    = divisions[0]
        this.noteValue          = divisions[1]
    }
}

export function noteToNumber(note) {
    const noteBaseNumbers = {c:12,db:13,d:14,eb:15,e:16,f:17,fb:18,g:19,ab:20,a:21,bb:22,b:23}
    const octave = parseInt(note.slice(-1))
    const noteName = note.slice(0, -1).toLowerCase()

    return noteBaseNumbers[noteName] + (octave * 12) 
}

export function toggleLoadingModal(flag){
    if(flag){
        document.getElementById("generic-loading-modal").classList.remove("hidden")
    }else{
        document.getElementById("generic-loading-modal").classList.add("hidden")
    }
}

export function isTouchDevice() {
    return (('ontouchstart' in window) ||
       (navigator.maxTouchPoints > 0) ||
       (navigator.msMaxTouchPoints > 0))
}

export function performBackendRequest(data,method,successCallback,errorCallback,debugResponse){
    //const store = useStore()
    axios.defaults.withCredentials = true
    axios({
        method          : method?method:"post",
        url             : "/api",
        data            : data,
        withCredentials : true
    })
    .then(
        successCallback?
        successCallback:
        (response)=>{
            if(debugResponse){
                console.log("debug risposta: ",response.data)
            }
        }
    )
    .catch(
        errorCallback?
        errorCallback:
        (error) => {
            if(debugResponse){
                console.log("debug errore: ",error)
            }
            switch(error.response.status){
                case 401:
                    store.commit('setUser',{})
                break;
            }
        }
    );
}

export function clamp(num, min, max){
    return Math.min(Math.max(num, min), max)
}

async function decodeAudioBlob(audioBlob) {
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    return audioContext.decodeAudioData(arrayBuffer);
}

function extractPortionFromAudioBuffer(audioBuffer, startTime, endTime, audioContext) {
    const sampleRate = audioBuffer.sampleRate;
    const startOffset = startTime * sampleRate;
    const endOffset = endTime * sampleRate;
    const frameCount = endOffset - startOffset;

    const newBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, frameCount, sampleRate);

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const newChannelData = newBuffer.getChannelData(channel);
        const originalChannelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            newChannelData[i] = originalChannelData[i + startOffset];
        }
    }

    return newBuffer;
}

function audioBufferToBlob(audioBuffer) {
    const wav = toWav(audioBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' })
    return blob
}

export async function cutAudioBlob(audioBlob, startTime, endTime) {
    const audioContext = new AudioContext()
    const audioBuffer = await decodeAudioBlob(audioBlob)
    
    const portionBuffer = extractPortionFromAudioBuffer(audioBuffer, startTime, endTime, audioContext)
    console.log(audioBlob, startTime, endTime,audioBuffer,portionBuffer)
    return audioBufferToBlob(portionBuffer)
}

export async function getAudioBlobFromServer(url) {
    try {
        const resp = await fetch(encodeURIComponent(url))
        const audioBlob = await resp.blob()
        return audioBlob
    } catch (error) {
        console.error('Error fetching the audio file:', error);
    }
}

export function base64ToBlob(base64, mimeType) {
    // Decodifica la stringa Base64 in una stringa di byte
    let byteString = atob(base64);
    // Crea un array di numeri interi per l'ArrayBuffer
    let arrayBuffer = new ArrayBuffer(byteString.length);
    let uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
    }
    // Crea il blob con il tipo MIME specificato
    return new Blob([arrayBuffer], { type: mimeType });
}

export function getAudioDuration(blob) {
    return new Promise((resolve, reject) => {
        const audioElement = new Audio();
        const url = URL.createObjectURL(blob);
  
        audioElement.addEventListener('loadedmetadata', () => {
            // Quando i metadati sono caricati, ottieni la durata
            resolve(audioElement.duration);
            // Rilascia l'URL del blob per evitare perdite di memoria
            URL.revokeObjectURL(url);
        });
  
        audioElement.addEventListener('error', () => {
            reject(new Error('Failed to load audio'));
            URL.revokeObjectURL(url);
        });
  
        audioElement.src = url;
    });
}

export const midiInstrumentsCode = [
    "acoustic_grand_piano",
    "bright_acoustic_piano",
    "electric_grand_piano",
    "honkytonk_piano",
    "electric_piano_1",
    "electric_piano_2",
    "harpsichord",
    "clavinet",
    "celesta",
    "glockenspiel",
    "music_box",
    "vibraphone",
    "marimba",
    "xylophone",
    "tubular_bells",
    "dulcimer",
    "drawbar_organ",
    "percussive_organ",
    "rock_organ",
    "church_organ",
    "reed_organ",
    "accordion",
    "harmonica",
    "tango_accordion",
    "acoustic_guitar_nylon",
    "acoustic_guitar_steel",
    "electric_guitar_jazz",
    "electric_guitar_clean",
    "electric_guitar_muted",
    "overdriven_guitar",
    "distortion_guitar",
    "guitar_harmonics",
    "acoustic_bass",
    "electric_bass_finger",
    "electric_bass_pick",
    "fretless_bass",
    "slap_bass_1",
    "slap_bass_2",
    "synth_bass_1",
    "synth_bass_2",
    "violin",
    "viola",
    "cello",
    "contrabass",
    "tremolo_strings",
    "pizzicato_strings",
    "orchestral_harp",
    "timpani",
    "string_ensemble_1",
    "string_ensemble_2",
    "synth_strings_1",
    "synth_strings_2",
    "choir_aahs",
    "voice_oohs",
    "synth_choir",
    "orchestra_hit",
    "trumpet",
    "trombone",
    "tuba",
    "muted_trumpet",
    "french_horn",
    "brass_section",
    "synth_brass_1",
    "synth_brass_2",
    "soprano_sax",
    "alto_sax",
    "tenor_sax",
    "baritone_sax",
    "oboe",
    "english_horn",
    "bassoon",
    "clarinet",
    "piccolo",
    "flute",
    "recorder",
    "pan_flute",
    "blown_bottle",
    "shakuhachi",
    "whistle",
    "ocarina",
    "lead_1_square",
    "lead_2_sawtooth",
    "lead_3_calliope",
    "lead_4_chiff",
    "lead_5_charang",
    "lead_6_voice",
    "lead_7_fifths",
    "lead_8_bass__lead",
    "pad_1_new_age",
    "pad_2_warm",
    "pad_3_polysynth",
    "pad_4_choir",
    "pad_5_bowed",
    "pad_6_metallic",
    "pad_7_halo",
    "pad_8_sweep",
    "fx_1_rain",
    "fx_2_soundtrack",
    "fx_3_crystal",
    "fx_4_atmosphere",
    "fx_5_brightness",
    "fx_6_goblins",
    "fx_7_echoes",
    "fx_8_scifi",
    "sitar",
    "banjo",
    "shamisen",
    "koto",
    "kalimba",
    "bagpipe",
    "fiddle",
    "shanai",
    "tinkle_bell",
    "agogo",
    "steel_drums",
    "woodblock",
    "taiko_drum",
    "melodic_tom",
    "synth_drum",
    "reverse_cymbal",
    "guitar_fret_noise",
    "breath_noise",
    "seashore",
    "bird_tweet",
    "telephone_ring",
    "helicopter",
    "applause",
    "gunshot"
]