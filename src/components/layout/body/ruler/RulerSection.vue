<template>
    <div 
        id="ruler-top" 
        :style="{width : ((maxBatt * (16 * (divisions[0] / divisions[1]))) * unitSize) + 'px'}"
        class="h-[35px] sticky z-[12] bg-[#24262d] top-0 box-border"
    >
        <div class="flex flex-col w-full h-full ml-[8px]">
            <div class="flex w-full h-[19px]">
                <div 
                    class="text-xs text-[rgb(141,148,165)] ruler-span relative inline-block" 
                    v-for="index in maxBatt" :key="'ruler-span-'+index" 
                    :style="{width : ((16 * (divisions[0] / divisions[1])) * unitSize) + 'px'}"
                >
                    <span class="inline-block transform -translate-x-2/4 ">{{ index }}</span>
                </div>
            </div>
            <div 
                id="ruler-ticks" 
                class="h-[16px] relative bottom-0 left-0 w-full bg-repeat-x bg-left-bottom"
                :data-zoom="zoom"
                :style="ticksStyle"
            >
            </div>
        </div>
        <div 
            id="cursor" 
            class="cursor-col-resize inline-block absolute top-0 left-0 pointer-events-none w-[12px] z-[12]" 
            :style="{
                transform : 'translateX('+(position * unitSize)+'px)',
                height : (trackHeight * tracks.length) + 'px',
                transition : (isPlaying || isRecording)?'transform '+ (store.getters.getRecordingTimeTick/1000) +'s linear' : 'none'
            }"
        ></div>
    </div>
</template>

<script setup>
    import {ref,onMounted,computed,watch} from 'vue'
    import interact from 'interactjs'
    import {useStore} from 'vuex'
    import {clamp} from '../../../../utils/utils'

    const store                 = useStore();
    const unitSize              = computed(() => store.getters.getUnitSize)
    const zoom                  = computed(() => store.getters.getProjectProperty("zoom"))
    const maxBatt               = computed(() => store.getters.getProjectProperty("maxBatt"))
    const position              = ref(store.getters.getProjectProperty("rulerPosition"))
    const trackHeight           = computed(() => store.getters.getProjectProperty("trackHeight"))
    const tracks                = computed(() => store.getters.getProjectProperty("tracks"))
    const divisions             = computed(() => store.getters.getProjectProperty("divisions"))
    const ticksStyle            = ref({})
    const isPlaying             = computed(() => store.getters.getProjectProperty("playing"))
    const isRecording           = computed(() => store.getters.getProjectProperty("recording"))
    //const quarterSize           = computed(() => store.getters.getQuarterSize)

    const computeBg = () => {
        let lines = [];
        
        const svgWidth = (unitSize.value * 4) * (4 / divisions.value[1]) * divisions.value[0]
        const tickWidth = (unitSize.value * 4) * (4 / divisions.value[1])

        lines.push(`<rect class="st0" width="1" height="16"/>`)
        lines.push(`<rect fill="#383844" x="0" y="15" width="${svgWidth}" height="1"/>`)

        for(let t = 1; t < (divisions.value[0] * (divisions.value[1] / 4)); t++){
            lines.push(`<rect x="${tickWidth * t}" y="8" class="st0" width="1" height="8"/>`);
        }

        const svg = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${svgWidth} 16" style="enable-background:new 0 0 ${svgWidth} 16;" xml:space="preserve">
            <style type="text/css">.st0{fill:#8D94A5;}</style>
            ${lines.join('')}
        </svg>
        `;
        const encoded = window.btoa(svg);
        ticksStyle.value = {
            backgroundSize  : svgWidth + 'px' + ' 16px',
            backgroundImage : `url(data:image/svg+xml;base64,${encoded})`
        }
    }

    watch(unitSize, (newVal) => {
        store.commit("setProjectProperties",{unitSize:newVal})
        computeBg()
        addDragListeners()
    });

    watch(divisions, () => {
        computeBg()
        addDragListeners()
    });

    watch(() => store.state.project.rulerPosition, (newVal) => {
        position.value = newVal;
    });

    const addDragListeners = () => {
        const targets = [];
        
        for(let i=0; i < maxBatt.value * (unitSize.value * 16); i+=unitSize.value){
            targets.push({x:i,y:10});
        }

        //console.log(targets)
        interact("#ruler-ticks").unset()
        interact("#cursor").unset()
        interact("#cursor").draggable({
            lockAxis: 'x',
            listeners : {
                move (event) {
                    let shiftX = (Math.abs(event.dx)<unitSize.value)?0:event.dx;
                    let newPosition = clamp(position.value + (shiftX / unitSize.value),0,maxBatt.value * 16)
                    //position.value = newPosition
                    store.commit("setRulerPosition",newPosition)
                }
            },
            modifiers: [
                interact.modifiers.snap({targets: targets})
            ]
        })

        interact("#ruler-ticks").on('down',function (event) {
            store.commit("setRulerPosition",
                parseInt(
                    (parseInt(event.clientX) - document.getElementById('track-headers-section').offsetWidth + document.getElementById('total-grid').scrollLeft - 8) / 
                    unitSize.value
                )
            )
        })
    }

    onMounted(() => {
        computeBg()
        addDragListeners()
    })
</script>

<style>
#cursor:before {
    width:16px;
    height:16px;
    background-image: url('../../../../assets/ruler-cursor.svg');
    content: " ";
    pointer-events: auto;
    position: absolute;
    top: 19px;
    transform: translate3d(2%, 0, 0);
}

#cursor:after {
    background-color: rgba(156,164,175,0.5);
    content: "";
    display: inline-block;
    height: 100%;
    margin-top: 35px;
    left:8px;
    pointer-events: none;
    position: relative;
    width: 1px;
}
</style>