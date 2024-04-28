<template>
    <div 
        id="ruler-roll-top" 
        :style="{width : ((maxBatt * (16 * (divisions[0] / divisions[1]))) * unitSize) + 'px'}"
        class="h-[35px] sticky z-[12] bg-[#1a1d21] top-0 box-border"
        :class="{
            'type-instrument'   : props.type === 'instrument',
            'type-percussion'   : props.type === 'percussion',
        }"
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
                id="ruler-ticks-roll" 
                class="h-[16px] relative bottom-0 left-0 w-full bg-repeat-x bg-left-bottom"
                :data-zoom="zoom"
                :style="ticksStyle"
            >
            </div>
        </div>
        <div 
            id="cursor-roll" 
            class="cursor-col-resize inline-block absolute top-0 left-0 pointer-events-none w-[12px] z-[12] h-[1674px]" 
            :style="{
                transform : 'translateX('+(position * unitSize)+'px)',
                transition : (isPlaying)?'transform '+ (store.getters.getRecordingTimeTick/1000) +'s linear' : 'none'
            }"
        ></div>
    </div>
</template>

<script setup>
    import {ref,onMounted,computed,watch,defineProps} from 'vue'
    import interact from 'interactjs'
    import {useStore} from 'vuex'
    import {clamp} from '../../../../utils/utils'

    const props                 = defineProps({
        type: {type: String}
    })
    const zoomProperty          = (props.type === 'instrument')?'zoomPianoRoll':'zoomDrumsRoll'
    const unitSizeProperty      = (props.type === 'instrument')?'getUnitSizePianoRoll':'getUnitSizeDrumsRoll'

    const store                 = useStore();
    const unitSize              = computed(() => store.getters[unitSizeProperty])
    const zoom                  = computed(() => store.getters.getProjectProperty(zoomProperty))
    const maxBatt               = computed(() => store.getters.getProjectProperty("maxBatt"))
    const position              = ref(store.getters.getProjectProperty("rulerRollPosition"))
    const divisions             = computed(() => store.getters.getProjectProperty("divisions"))
    const ticksStyle            = ref({})
    const isPlaying             = computed(() => store.getters.getProjectProperty("playingRoll"))
    

    const computeBg = () => {
        let lines = []
        
        const svgWidth = (unitSize.value * 4) * (4 / divisions.value[1]) * divisions.value[0]
        const tickWidth = (unitSize.value * 4) * (4 / divisions.value[1])

        lines.push(`<rect class="st0" width="1" height="16"/>`)
        lines.push(`<rect fill="#383844" x="0" y="15" width="${svgWidth}" height="1"/>`)

        for(let t = 1; t < (divisions.value[0] * (divisions.value[1] / 4)); t++){
            lines.push(`<rect x="${tickWidth * t}" y="8" class="st0" width="1" height="8"/>`)
        }

        const svg = `
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${svgWidth} 16" style="enable-background:new 0 0 ${svgWidth} 16;" xml:space="preserve">
            <style type="text/css">.st0{fill:#8D94A5;}</style>
            ${lines.join('')}
        </svg>
        `
        const encoded = window.btoa(svg)
        ticksStyle.value = {
            backgroundSize  : svgWidth + 'px' + ' 16px',
            backgroundImage : `url(data:image/svg+xml;base64,${encoded})`
        }
    }

    watch(() => store.state.project.rulerRollPosition, (newVal) => {
        position.value = newVal;
    })
    watch(zoom,() => {
        computeBg()
    })

    const addDragListeners = () => {
        const targets = [];
        
        for(let i=0; i < maxBatt.value * (unitSize.value * 16); i+=unitSize.value){
            targets.push({x:i,y:10});
        }

        interact("#ruler-ticks-roll").unset()
        interact("#cursor-roll").unset()
        interact("#cursor-roll").draggable({
            lockAxis: 'x',
            listeners : {
                move (event) {
                    let shiftX = (Math.abs(event.dx)<unitSize.value)?0:event.dx;
                    let newPosition = clamp(position.value + (shiftX / unitSize.value),0,maxBatt.value * 16)
                    //position.value = newPosition
                    store.commit("setRulerRollPosition",newPosition)
                }
            },
            modifiers: [
                interact.modifiers.snap({targets: targets})
            ]
        })

        interact("#ruler-ticks-roll").on('down',function (event) {
            store.commit("setRulerRollPosition",
                parseInt(
                    (parseInt(event.clientX) - document.getElementById('roll-info-panel').offsetWidth + document.getElementById('roll-panel').scrollLeft - 8 - document.getElementById('ruler-roll-filler').offsetWidth) / 
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
#cursor-roll:before {
    width:16px;
    height:16px;
    background-image: url('../../../../assets/ruler-cursor.svg');
    content: " ";
    pointer-events: auto;
    position: absolute;
    top: 19px;
    transform: translate3d(2%, 0, 0);
}

#cursor-roll:after {
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

#ruler-roll-top.type-instrument:before{
    content:"";
    display:block;
    position:absolute;
    width:62px;
    height:35px;
    transform:translateX(-62px);
    z-index:100;
    background:#1a1d21;
}

#ruler-roll-top.type-percussion:before{
    content:"";
    display:block;
    position:absolute;
    width:185px;
    height:35px;
    transform:translateX(-185px);
    z-index:100;
    background:#1a1d21;
}
</style>