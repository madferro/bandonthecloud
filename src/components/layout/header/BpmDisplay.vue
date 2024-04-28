<template>
    <div class="flex flex-col w-[80px] -mt-4">
        <span class="rounded-t-lg uppercase text-xs text-[#8d94a5] block text-center w-full py-0.5">bpm</span>
        <div class="flex flex-row w-full relative items-center">
          <button 
            class="decrement-bpm opacity-50 bg-trasparent hover:bg-transparent hover:text-white hover:opacity-100 px-1 cursor-pointer outline-none hover:no-underline transition duration-300">
            <span class="m-auto text-xl hover:no-underline">−</span>
          </button>
          <input type="number" 
            id="bpm-counter"
            step="1"
            @change="setBpmValue"
            @keydown.up="incrementBpmValue"
            @keydown.down="decrementBpmValue"
            v-model=bpm
            class="[appearance:textfield] focus:text-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:outline-none text-center w-full bg-transparent font-semibold text-md flex items-center text-[#8d94a5]  outline-none" name="bpm-input-number"
            />
          <button
            class="increment-bpm opacity-50 bg-trasparent hover:bg-transparent text-[#8d94a5] hover:text-white hover:opacity-100 px-1 cursor-pointer outline-none hover:no-underline transition duration-300">
            <span class="m-auto text-xl hover:no-underline">+</span>
          </button>
        </div>
    </div>

</template>

<script setup>
    import {useStore} from 'vuex'
    import {computed,onMounted} from 'vue'
    import interact from 'interactjs'

    const store = useStore()
    const bpm = computed(() => store.getters.getProjectProperty("bpm"))

    const setBpmValue       = (event) => {event.preventDefault();store.commit('setProjectProperties',{bpm:parseInt(event.target.value)})}
    const incrementBpmValue = (event) => {event.preventDefault();store.commit('incrementBPM')}
    const decrementBpmValue = (event) => {event.preventDefault();store.commit('decrementBPM')}

    onMounted(() => {
        interact('.decrement-bpm').on('tap', function () {store.commit('decrementBPM')})
        interact('.increment-bpm').on('tap', function () {store.commit('incrementBPM')})
    }) 
</script>
