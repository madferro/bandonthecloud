<template>
    <div class="flex flex-col w-[45px]">
        
        <div class="flex flex-row w-full relative items-center border-gray-100/10 border-l h-[36px]">
          <input type="number" 
            id="division-numerator"
            step="1"
            min="2"
            @change="setDivisionsValue"
            v-model="divisions[0]"
            class="mt-[3px] ml-1 [appearance:textfield] focus:text-white [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none outline-none focus:outline-none text-center w-full bg-transparent font-semibold text-md flex items-center text-[#8d94a5]  outline-none" name="bpm-input-number"
            />
            <span class="mt-[3px]">/</span>
            <select
                id="division-denominator"
                v-model=divisions[1]
                @change="setDivisionsValue"
                class="mt-[3px] appearance-none bg-transparent focus:text-white focus:outline-none text-center w-full bg-transparent font-semibold text-md flex items-center text-[#8d94a5]  outline-none"
            >
                <option :value=4>4</option>
                <option :value=8>8</option>
                <option :value=16>16</option>
            </select>
        </div>
    </div>
</template>

<script setup>
    import {useStore} from 'vuex'
    import {computed} from 'vue'
    //import interact from 'interactjs'

    const store = useStore();
    const divisions = computed(() => store.getters.getProjectProperty("divisions"));

    const setDivisionsValue = (event) => {
        store.commit('setProjectProperties',{divisions:[divisions.value[0], divisions.value[1]]})
        store.commit('updateProjectHistory')
        event.preventDefault();
    }
</script>
