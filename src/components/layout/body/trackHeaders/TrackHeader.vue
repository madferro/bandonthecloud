<template>
    <div
        :id="'track-header-'+props.track.id"
        :style="{
            height:trackHeight+'px'
        }"
        :class="{
            selected                : track.selected,
            'bg-[#2e2f38]'          : track.selected,
            'border-[#9ca3af]'      : track.selected,
            'bg-[#24262d]'          : !track.selected,
            'border-[#383844]'      : !track.selected,
            'border-l-green-400'    : (props.track.type === 'audio'),
            'border-l-pink-400'     : (props.track.type === 'instrument'),
            'border-l-yellow-400'   : (props.track.type === 'percussion'),
            'justify-center'        : trackHeight < 100
        }" 
        class="track-head flex border-b border-r border-t-transparent border-t flex-col items-center p-1 relative box-border"
        :data-trackid="props.track.id"
    >
        <div class="flex w-full items-center">
            <div class="w-6 h-6 text-center text-gray-100 " aria-label="Sposta" data-balloon-pos="right" data-balloon-blunt data-balloon-nofocus>
                <i class="bi-arrow-down-up drag-handler-track !cursor-ns-resize "></i>
            </div>
            <i 
                :class="{
                    'bi-volume-up-fill' : (props.track.type === 'audio'),
                    'bip-midi'          : (props.track.type === 'instrument'),
                    'bip-drums'         : (props.track.type === 'percussion')
                }"
                class="w-6 h-6 text-center text-gray-100 ">
            </i>
            <input
                v-if="trackHeight >= 100"
                v-model=title
                placeholder="nuova traccia"
                class="w-full block text-xs bg-transparent text-gray-400 rounded outline-none transition duration-300 shadow-none hover:bg-gray-200/10 focus:bg-gray-200 p-1 focus:shadow-lg focus:text-gray-700 focus:bg-gray-200"
                @change="updateTrackTitle"
            />
            <div class="flex w-full items-center gap-1" v-if="trackHeight < 100">
                <input
                    v-model=title
                    placeholder="nuova traccia"
                    class="w-[50px] block text-sm bg-transparent text-gray-400 rounded-md outline-none transition duration-300 shadow-none hover:bg-gray-200/10 focus:bg-gray-200 p-1 focus:shadow-lg focus:text-gray-700 focus:bg-gray-200"
                    @change="updateTrackTitle"
                />
                <div class="flex w-[175px] items-center">
                    <button 
                        :class="{
                            '!bg-red-600'            : mute,
                            '!text-gray-100'         : mute,
                            '!hover:text-gray-100'   : mute
                        }"

                        class="w-6 h-6 text-xs rounded-l-lg muteguida hover:no-underline opacity-100 bg-[#a6adbb] text-gray-800 hover:bg-white hover:text-gray-800"
                    > M </button>
                    <button 
                        :class="{
                            '!bg-yellow-600'         : solo,
                            '!text-gray-100'         : solo,
                            '!hover:text-gray-100'   : solo
                        }"
                        class="w-6 h-6 text-xs rounded-r-lg sologuida hover:no-underline opacity-100 bg-[#a6adbb] text-gray-800 hover:bg-white hover:text-gray-800"
                    > S </button>
                    <div class="w-[120px] px-2 volumeguida">
                        <Slider 
                            class="w-[120px] h-1" 
                            v-model="volume" 
                            :min=-6 
                            :max=6 
                            :step=0.1 
                            tooltipPosition="top" 
                            showTooltip="focus"
                            :format="volumeFormat"
                            :lazy=false></Slider>
                    </div>
                </div>
            </div>
        </div>
        <div v-if="trackHeight >= 100 && props.track.type === 'audio'" class="flex mb-2 text-xs justify-center items-center gap-1 px-1">
            <div class="text-gray-300">Input:</div>
            <select class="w-full bg-[#1e2025] text-gray-300 shadow-lg rounded text-xs p-1" @change="handleInputChange">
                <option v-for="device in inputDevices"
                    :key=device.deviceId 
                    :value=device.deviceId
                >{{ device.label }}</option>
            </select>
        </div>
        <div v-if="trackHeight >= 100 && props.track.type !== 'audio'" class="flex mb-2 text-xs justify-center items-center gap-1 px-1 w-full">
            <select class="w-1/2 bg-[#1e2025] text-gray-300 shadow-lg rounded text-xs p-1" @change="handleMidiInputChange">
                <option v-for="(device,deviceId) in midiInputDevices"
                    :key=deviceId
                    :value=deviceId
                >{{ device.name }} ({{ device.manufacturer }})</option>
            </select>
            <select v-if="props.track.type === 'instrument'" id="instrumentDropdown" class="w-1/2 bg-[#1e2025] text-gray-300 shadow-lg rounded text-xs p-1" @change="handleDropdownMidiInstrumentChange">
                <optgroup :key=groupName :label=groupName v-for="(group,groupName) in instrumentList2.groups">
                    <option v-for="name in group"
                        :key=name 
                        :value=name
                        :selected="name === props.track.instrument"
                    >{{ instrumentList2.list[name] }}</option>
                </optgroup>
            </select>
            <select v-if="props.track.type === 'percussion'" id="instrumentDropdown" class="w-1/2 bg-[#1e2025] text-gray-300 shadow-lg rounded text-xs p-1" @change="handleDropdownMidiInstrumentChange">
                <optgroup :key=groupName :label=groupName v-for="(group,groupName) in drumsList2.groups">
                    <option v-for="name in group"
                        :key=name 
                        :value=name
                        :selected="name === props.track.instrument"
                    >{{ drumsList2.list[name] }}</option>
                </optgroup>
            </select>
        </div>
        <div v-if="trackHeight >= 100" class="flex w-full items-center px-1 justify-between self-start gap-2">
            
            <div class="flex">
                <button 
                    :class="{
                        '!bg-red-600'            : mute,
                        '!text-gray-100'         : mute,
                        '!hover:text-gray-100'   : mute
                    }"

                    class="w-6 h-6 text-xs rounded-l-lg muteguida hover:no-underline opacity-100 bg-[#a6adbb] text-gray-800 hover:bg-white hover:text-gray-800"
                > M </button>
                <button 
                    :class="{
                        '!bg-yellow-600'         : solo,
                        '!text-gray-100'         : solo,
                        '!hover:text-gray-100'   : solo
                    }"
                    class="w-6 h-6 text-xs rounded-r-lg sologuida hover:no-underline opacity-100 bg-[#a6adbb] text-gray-800 hover:bg-white hover:text-gray-800"
                > S </button>
            </div>
            <div class="flex-grow volumeguida">
                <Slider 
                    class="w-44 h-1" 
                    v-model="volume" 
                    :min=0 
                    :max=1 
                    :step=0.1 
                    tooltipPosition="top" 
                    showTooltip="focus"
                    :format="volumeFormat"
                    :lazy=false>
                </Slider>
            </div>
    
            <div class="w-8 h-8 panguida pt-[1px] relative" :aria-label="tooltipText" data-balloon-pos="left" data-balloon-blunt data-balloon-nofocus>
                <div class="knob-center-point absolute top-[2px] left-1/2 h-[3px] w-[2px] -translate-x-1/2 bg-[#6365f2]"></div>
                <Knob 
                    valueTemplate=""
                    v-model="pan" 
                    :min=-50 
                    :max=50 
                    :step=1
                    :size=30
                    :strokeWidth=10
                    valueColor="#6365f2"
                    rangeColor="#1e2025"
                />
                
            </div>
            <!--<div class="w-8 h-8 pitchguida pl-1">
                <Slider 
                    class="h-full w-1" 
                    v-model="pitch" 
                    orientation="vertical"
                    direction="rtl"
                    :min=-12 
                    :max=12 
                    :step=1 
                    tooltipPosition="left" 
                    showTooltip="focus"
                    :format="pitchFormat"
                    :lazy=false>
                </Slider>
            </div>-->
        </div>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {defineProps,onMounted,computed,ref, onBeforeUnmount} from 'vue'
    import interact from 'interactjs'
    import Knob from 'primevue/knob'
    import Slider from '@vueform/slider'
    import instrumentsList from '../../../../assets/midiInstruments'
    import drumsList from '../../../../assets/midiDrums'

    const store = useStore();
    const props = defineProps({
        track: Object
    })

    let panUpdateTimeout            = undefined
    //let pitchUpdateTimeout          = undefined
    let volumeUpdateTimeout         = undefined
    const inputDevices              = computed(() => store.state.inputDevices)
    const instrumentList2           = instrumentsList.instrumentsList
    const drumsList2                = drumsList.drumsList
    const midiInputDevices          = computed(() => store.state.midiInputDevices)
    const track                     = computed(() => store.getters.getTrack(props.track.id))
    const title                     = ref(props.track.title)
    const trackHeight               = computed(() => store.getters.getProjectProperty("trackHeight"))
    const pan                       = computed({
                                        get: () => props.track.pan,
                                        set: (value) => {
                                            tooltipText.value = `L: ${50 -parseInt(value)} %  R: ${50 + parseInt(value)}%`
                                            store.commit('setTrackProperties',{
                                                trackid     : props.track.id,
                                                properties  : {
                                                    pan : value
                                                }
                                            })
                                            store.commit('updatePannerNode', { trackid: props.track.id, pan: value/50 })

                                            clearTimeout(panUpdateTimeout)
                                            panUpdateTimeout = setTimeout(function(){store.commit('updateProjectHistory')},500)
                                        }
                                    })
    const mute                      = ref(props.track.mute)
    const solo                      = ref(props.track.solo)
    const opened                    = ref(false);
    const volume                    = computed({
                                        get: () => props.track.volume,
                                        set: (value) => {
                                            store.commit('setTrackProperties',{
                                                trackid     : props.track.id,
                                                properties  : {
                                                    volume : value
                                                }
                                            })
                                            store.commit('updateGainNode', { trackid: props.track.id, volume: value })

                                            clearTimeout(volumeUpdateTimeout)
                                            volumeUpdateTimeout = setTimeout(function(){store.commit('updateProjectHistory')},500)
                                        }
                                    })
    /*const pitch                     =  computed({
                                        get: () => props.track.pitch,
                                        set: (value) => {
                                            store.commit('setTrackProperties',{
                                                trackid     : props.track.id,
                                                properties  : {
                                                    pitch : value
                                                }
                                            })
                                            store.commit('updatePitch', { trackid: props.track.id, pitch: value })

                                            clearTimeout(pitchUpdateTimeout)
                                            pitchUpdateTimeout = setTimeout(function(){store.commit('updateProjectHistory')},500)
                                        }
                                    })*/
    const volumeFormat              = (value) => {return `Volume<br/> <strong>${value.toFixed(2)}</strong> db`};
    //const pitchFormat               = (value) => {return `Pitch<br/> <strong>${parseInt(value)}</strong> ${(Math.abs(parseInt(value))!=1)?'semitoni':'semitono'}`};
    let menuItems                   = {"delete" : "<i class='bi bi-trash h-4 w-4'></i><span class='ml-2'>Elimina</span>"}
    const tooltipText               = ref(`L: ${50 -pan.value} %  R: ${50 + pan.value}%`)

    const updateTrackTitle          = () => {
        store.commit('setTrackProperties',{
            trackid         : track.value.id,
            properties      : {
                title : title.value
            },
            updateHistory   : true
        })
    }

    if(props.track.type != "audio"){menuItems["export"] = "<i class='bi bi-download h-4 w-4'></i><span class='ml-2'>Esporta traccia</span>"}

    const handleDropdownMidiInstrumentChange = (event) => {
        store.commit('setTrackProperties',{
            trackid         : props.track.id,
            updateHistory   : true,
            properties      : {instrument : event.target.value}
        })
        store.commit('loadPlayerInstrument',{
            trackid     : props.track.id,
            instrument  : event.target.value,
            inputId     : track.value.inputSource
        })
    }

    const handleMidiInputChange  = (event) => {
        //inputSource.value = event.target.value
        store.commit('setTrackProperties',{
            trackid     : props.track.id,
            properties  : {
                inputSource : event.target.value
            }
        })

        store.commit('loadPlayerInstrument',{
            trackid     : props.track.id,
            instrument  : track.value.instrument,
            inputId     : event.target.value
        })
    }

    const handleInputChange = (event) => {
        //inputSource.value = event.target.value
        store.commit('setTrackProperties',{
            trackid     : props.track.id,
            properties  : {
                inputSource : event.target.value
            }
        })
    }

    onMounted(() => {
        if(props.track.type !== 'audio'){
            if(!props.track.inputSource || !Object.keys(midiInputDevices.value).includes(props.track.inputSource)){
                store.commit('setTrackProperties',{
                    trackid         : props.track.id,
                    updateHistory   : true,
                    properties      : {inputSource : Object.keys(midiInputDevices.value)[0]}
                })
            }
            
            store.commit('loadPlayerInstrument',{
                trackid     : props.track.id,
                instrument  : track.value.instrument,
                inputId     : Object.keys(midiInputDevices.value)[0]
            })
        }

        interact("#track-header-"+props.track.id).on('up', function (event) {
            event.preventDefault();
            store.commit('setTrackSelected',props.track.id)
        })

        interact("#track-header-"+props.track.id+" .muteguida").on('up', function (event) {
            event.preventDefault();
            mute.value = !mute.value;
            store.commit('setTrackProperties',{
                trackid     : props.track.id,
                properties  : {
                    mute : mute.value
                }
            })
        })

        interact("#track-header-"+props.track.id+" .sologuida").on('up', function (event) {
            event.preventDefault();
            solo.value = !solo.value;
            store.commit('setTrackProperties',{
                trackid     : props.track.id,
                properties  : {
                    solo : solo.value
                }
            })
        })

        interact("#track-header-"+props.track.id+"-menu").on('up', function (event) {
            event.preventDefault();
            const prevOpened = opened.value;

            window.emitter.emit('genericClick');
            opened.value = !prevOpened

            //stoppo la propagazione degli eventi click e touchstart
            interact(event.target).on('click', function (_event) {_event.stopImmediatePropagation();}, true)
            interact(event.target).on('touchstart', function (_event) {_event.stopImmediatePropagation();}, true)
        });
    })

    onBeforeUnmount(() => {
        interact("#track-header-"+props.track.id).unset();
        interact("#track-header-"+props.track.id+"-menu").unset();
        interact("#track-header-"+props.track.id+" .muteguida").unset();
        interact("#track-header-"+props.track.id+" .sologuida").unset();
    })

    window.emitter.on("genericClick",function(){
        opened.value = false;
    });
</script>