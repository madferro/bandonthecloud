<template>
    <div class="backdrop bg-[rgba(36,38,45,0.95)] w-screen h-screen fixed top-0 left-0 z-[250] transition duration-300">
        <div class="bg-[#1a1d21] p-4 shadow-xl shadow-[rgba(0,0,0,0.4)] rounded-lg absolute left-1/2 top-1/2 transform z-[300] w-1/2 min-w-[300px] -translate-y-1/2 -translate-x-1/2">
            <h2 class="text-xl font-bold text-gray-300 mb-4 tracking-tight">Aggiungi Traccia</h2>
            <a id="close-add-track-modal" className="absolute inline-block top-0 right-0 bg-[#1a1d21] hover:bg-gray-100 hover:text-[#1a1d21] transition duration-200 px-4 py-2 text-gray-100 rounded-tr-lg rounded-bl-lg inline-block text-sm cursor-pointer">
                <i class="bi bi-x inline-block align-middle"></i>
                <span class="inline-block align-middle">Chiudi</span>
            </a>
            <div class="flex flex-col w-full mb-4">
                <div class="w-full text-gray-300 text-md font-bold">Titolo</div>      
                <div class="w-full">
                    <input v-model=title class="w-full text-sm block text-md bg-[#272b33] text-gray-300 rounded-md outline-none transition duration-300 hover:bg-gray-200 p-2 shadow-lg focus:bg-gray-200" id="txb_titolo" type="text" placeholder="inserisci il titolo della traccia" />
                    <!--<input class="hidden" id="txb_colore" type="color" value="#64b5f6"/>-->
                </div>
            </div>
            <div class="flex flex-col w-full">
                <div class="w-full text-gray-300 text-md font-bold">Tipo di traccia</div>
                <div class="flex w-full gap-4 justify-between">
                    <div class="w-1/3 h-52 flex flex-col justify-end">
                        <button data-type="audio" class="addtrack hover:bg-transparent drop-shadow-[0_0_20px_rgba(74,222,128,0)] hover:drop-shadow-[0_0_20px_rgba(74,222,128,0.8)] flex flex-col p-[1px] h-40 w-full rounded border-green-400 border text-green-400 flex flex-col justify-center items-center hover:no-underline text-lg shadow-lg transition-all duration-200">
                            <div class="icon-audio h-24 w-24 bg-no-repeat bg-cover"></div>
                            <div class="text-sm text-green-400">Traccia audio</div>
                        </button>
                    </div>
    
                    <div className="w-1/3 h-52 flex flex-col justify-end">
                        <select id="instrumentDropdown" class="w-full bg-[#272b33] mb-2 text-gray-300 shadow-lg rounded p-2 text-sm" @change="handleDropdownChange">
                            <optgroup :key=groupName :label=groupName v-for="(group,groupName) in instrumentList2.groups">
                                <option v-for="name in group"
                                    :key=name 
                                    :value=name
                                >{{ instrumentList2.list[name] }}</option>
                            </optgroup>
                        </select>
                        <button data-type="instrument" class="addtrack hover:bg-transparent drop-shadow-[0_0_20px_rgba(244,114,182,0)] hover:drop-shadow-[0_0_20px_rgba(244,114,182,0.8)] flex flex-col p-[1px] h-40 w-full rounded border-pink-300 border text-pink-300 flex flex-col justify-center items-center hover:no-underline text-lg shadow-lg transition-all duration-200">
                            <div class="icon-strumento h-24 w-24  bg-no-repeat bg-cover"></div>
                            <div class="text-sm text-pink-300">Strumento</div>
                        </button>
                    </div>

                    <div class="w-1/3 h-52 flex flex-col justify-end">
                        <select id="drumsDropdown" class="w-full bg-[#272b33] mb-2 text-gray-300 shadow-lg rounded p-2 text-sm" @change={handleDrumsDropdownChange}>
                            <optgroup :key=groupName :label=groupName v-for="(group,groupName) in drumsList2.groups">
                                <option v-for="name in group"
                                    :key=name 
                                    :value=name
                                >{{ drumsList2.list[name] }}</option>
                            </optgroup>
                        </select>
                        <button data-type="percussion" class="addtrack hover:bg-transparent drop-shadow-[0_0_20px_rgba(250,204,21,0)] hover:drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] flex flex-col p-[1px] h-40 w-full rounded border-yellow-400 border text-yellow-400 flex flex-col justify-center items-center hover:no-underline text-lg shadow-lg transition-all duration-200" onClick={handleDrumsSelection}>
                            <div class="icon-drums h-24 w-24  bg-no-repeat bg-cover"></div>
                            <div class="text-sm text-yellow-400">Batteria</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import {ref,onMounted,onBeforeUnmount} from 'vue'
    import interact from 'interactjs'
    import instrumentsList from '../../../assets/midiInstruments'
    import drumsList from '../../../assets/midiDrums'
    import {useStore} from 'vuex'

    const store                 = useStore()
    const instrumentList2       = instrumentsList.instrumentsList
    const drumsList2            = drumsList.drumsList
    const selectedInstrument    = ref('acoustic_grand_piano')
    const selectedDrums         = ref('acoustic_drum_machine')
    let title                   = ref()

    const handleDropdownChange      = (event)   => {selectedInstrument.value = event.target.value}
    const handleDrumsDropdownChange = (event)   => {selectedDrums.value = event.target.value}

    onMounted(() => {
        interact("#close-add-track-modal").on('tap', function (event) {
            event.preventDefault()
            store.commit('setTrackModal',false)
        })

        interact(".addtrack").on('tap',function (event){
            const type = event.target.closest("button").dataset.type
            let instrument = null
            switch(type){
                case "instrument": instrument = selectedInstrument; break;
                case "percussion": instrument = selectedDrums; break;
                default: break;
            }

            //aggiungo traccia 
            store.commit('addTrack',{
                "type"          : type,
                "title"         : title.value,
                "instrument"    : instrument
            })

            //stoppo la propagazione degli eventi click e touchstart
            interact(event.target).on('click', function (_event) {_event.stopImmediatePropagation();}, true)
            interact(event.target).on('touchstart', function (_event) {_event.stopImmediatePropagation();}, true)

            //chiudo la modale
            store.commit('setTrackModal',false)
        })
    })

    onBeforeUnmount(() => {
        interact(".addtrack").unset()
        interact("#close-add-track-modal").unset()
    })

</script>

<style>
.icon-audio{background-image: url('../../../assets/audio-icon.svg');}
.icon-strumento {background-image: url('../../../assets/guitar-icon.svg');}
.icon-drums {background-image: url('../../../assets/drums-icon.svg');}
</style>