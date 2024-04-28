<template>
    <div class="pl-2 border-gray-100/10 border-l h-9 flex items-center">
        <div id="preroll-container" class="h-6 flex-grow relative" >
            <div 
                id="preroll"
                :aria-label="prerollAriaLabel" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus
                class="h-6 bg-no-repeat cursor-pointer flex items-center justify-center px-1 relative mr-0" 
                :class="{
                    'bg-gradient-to-br from-indigo-500 to-indigo-600 text-gray-200 rounded' : prerollBatt > 0
                }"
            >
                <div class="absolute top-[-10px] text-[9px] bg-[#1e2025] border-indigo-500 border-2 rounded-full h-4 w-4 flex items-center justify-center" v-if="prerollBatt > 0">{{ prerollBatt }}</div>
                <div class="text-[7px] leading-[24px]">1</div>
                <div class="text-[9px] leading-[24px]">2</div>
                <div class="text-[12px] leading-[24px]">3</div>
                <div class="text-[15px] leading-[24px]">4</div>
            </div>
            <ul v-show="prerollMenuOpened" class="absolute z-[100] rounded-lg top mt-2 bg-[#32353e] text-left shadow-2xl">
               <li data-preroll=0 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 0}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white border-[#363a45] border-b rounded-t-lg">Disattivato</li>
               <li data-preroll=1 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 1}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white border-[#363a45] border-b">1 battuta</li>
               <li data-preroll=2 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 2}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white border-[#363a45] border-b">2 battute</li>
               <li data-preroll=3 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 3}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white border-[#363a45] border-b">3 battute</li>
               <li data-preroll=4 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 4}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white border-[#363a45] border-b">4 battute</li>
               <li data-preroll=5 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 5}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white border-[#363a45] border-b">5 battute</li>
               <li data-preroll=6 :class="{'!bg-gradient-to-br !from-indigo-500 !to-indigo-600 text-gray-200 !cursor-default !text-white' : prerollBatt === 6}" class="cursor-pointer preroll-button text-xs py-1 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white rounded-b-lg">6 battute</li>
            </ul>
        </div>
        <div id="metronome-container" class="h-6 w-6 text-xl" :aria-label="ariaLabel" data-balloon-pos="up" data-balloon-blunt data-balloon-nofocus>
            <div 
                id="metronome"
                class="bg-cover h-6 w-6 bg-no-repeat cursor-pointer opacity-50" 
                :class="{metronomeActive : isActive}"
                :style="{animationDuration : (120/bpm)+'s'}"
            ></div>
        </div>
    </div>
</template>
<script setup>
    import {useStore} from 'vuex'
    import {ref,computed,onMounted,watch} from 'vue'
    import {Metronome} from '../../../utils/utils'
    import interact from 'interactjs'

    const store             = useStore()
    const ariaLabel         = ref('Attiva metronomo')
    const prerollAriaLabel  = ref()
    const prerollMenuOpened = ref(false)
    const isActive          = computed(() => store.getters.getProjectProperty("metronomeActive"))
    const bpm               = computed(() => store.getters.getProjectProperty("bpm"))
    const divisions         = computed(() => store.getters.getProjectProperty("divisions"))
    const prerollBatt       = computed(() => parseInt(store.getters.getProjectProperty("prerollBatt")))
    
    const metronome = new Metronome(bpm.value, divisions.value)
    const setPrerollLabel = (val) => {
        if(val !== 0){
            prerollAriaLabel.value = 'Preroll : ' + val + ' ' + ((val === 1)?'battuta':'battute')
        }else{
            prerollAriaLabel.value = 'Preroll disattivato'
        }
    }  

    watch(() => store.state.project.metronomeActive, (newVal) => {
        if(newVal){
            ariaLabel.value = 'Disattiva metronomo';
            metronome.start();
        }else{
            ariaLabel.value = 'Attiva metronomo';
            metronome.stop();
        }
    });

    watch(() => store.state.project.bpm, (newVal) => {metronome.setTempo(newVal)})
    watch(() => store.state.project.divisions, (newVal) => {metronome.setDivisions(newVal)})
    watch(() => store.state.project.prerollBatt, (newVal) => {setPrerollLabel(newVal)})

    onMounted(() => {
        interact("#metronome-container").on('tap', function (event) {
            event.preventDefault();
            store.commit('toggleMetronome')
        })
        interact("#preroll").on('tap', function (event) {
            event.preventDefault();
            prerollMenuOpened.value = !prerollMenuOpened.value

            interact(event.target).on('click', function (_event) {_event.stopImmediatePropagation();}, true)
            interact(event.target).on('touchstart', function (_event) {_event.stopImmediatePropagation();}, true)
        })
        interact(".preroll-button").on('tap', function (event) {
            event.preventDefault();
            store.commit('setProjectProperties',{prerollBatt:parseInt(event.target.dataset.preroll)})
        })
        setPrerollLabel(prerollBatt.value)
    })

    window.emitter.on("genericClick",function(){
        prerollMenuOpened.value = false;
    });
</script>
<style>
    #metronome{
        background-position:0px center;
        background-image: url('../../../assets/metronomo-tot.svg')
    }

    .metronomeActive{
        animation-name: tictac; 
        animation-timing-function: steps(2);
        animation-iteration-count: infinite;
        opacity:1 !important;
        filter:drop-shadow(0 0 4px #4bf253)
    }

    @keyframes tictac {
        from { background-position: 0px; }
        to { background-position: -48px; }
    }
</style>