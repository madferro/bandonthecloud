<template>
    <div class="flex items-center p-2 w-full h-32">
        <div class="w-1/6 flex flex-col">
            <div class="flex w-full">
                <div class="header-logo cursor-pointer"></div>
            </div>
            <div class="w-full nomeproggetto pt-4">
                <input @change="updateProjectTitle" type="text" :value="title" class="text-gray-400 w-full block text bg-transparent rounded outline-none transition duration-300 shadow-none hover:bg-gray-200 p-1 focus:shadow-lg focus:bg-gray-200" placeholder="Nuovo progetto">
                <!--<span class="text-gray-400 text-xs px-1">Ultima modifica: {{ lastModify }}</span>-->
                <select class="w-full bg-[#1e2025] text-gray-300 shadow-lg rounded text-xs p-1" @change="handleOutputChange">
                <option v-for="device in outputDevices"
                    :key=device.deviceId 
                    :value=device.deviceId
                >{{ device.label }}</option>
            </select>
            </div>
        </div>
        <div class="w-4/6">
            <div class="flex justify-center p-[5px] w-full items-center gap-8">
                <div class="w-5/12 flex">
                    <PlayStopButton></PlayStopButton>
                </div>
                <div class="w-[450px]">
                    <div class="flex bg-[#1e2025] text-[#8d94a5] rounded-lg p-4 items-center gap-1">
                        <TimeDisplay></TimeDisplay>
                        <BpmDisplay></BpmDisplay>
                        <DivisionsDisplay></DivisionsDisplay>
                        <MetronomeDisplay></MetronomeDisplay>
                    </div>
                </div>
                <div class="w-5/12">
                    <div class="mr-auto flex items-center gap-6">
                        <ZoomDisplay></ZoomDisplay>
                    </div>
                </div>
            </div>
        </div>
        <div class="w-1/6 flex items-center justify-end gap-2">
            <DropDownMenu></DropDownMenu>
            <UndoRedo></UndoRedo> 
            <ExportButton></ExportButton> 
        </div>
    </div>
</template>
<script setup>
    import TimeDisplay from './header/TimeDisplay'
    import DivisionsDisplay from './header/DivisionsDisplay'
    import BpmDisplay from './header/BpmDisplay'
    import MetronomeDisplay from './header/MetronomeDisplay'
    import ZoomDisplay from './header/ZoomDisplay'
    import DropDownMenu from './header/DropDownMenu'
    import PlayStopButton from './header/PlayStopButton'
    import UndoRedo from './header/UndoRedo'
    import ExportButton from './header/ExportButton' 

    import {useStore} from 'vuex'
    import {computed} from 'vue'

    const store             = useStore()
    const outputDevices     = computed(() => store.getters.getOutputDevices)
    const title             = computed(() => store.getters.getProjectProperty("title"))
    /*const lastModify        = computed(() => {
        const date = store.getters.getProjectProperty("lastModify")
        return (date != null)?new Date(date).toLocaleString():'n.d.'
    })*/    

    const handleOutputChange = (event) => {
        store.commit("setOutputDevice",event.target.value)
        store.commit('updateProjectHistory')
    }
    
    const updateProjectTitle = (event) => {
        store.commit("setProjectProperties",{title : event.target.value})
        store.commit('updateProjectHistory')
    }
</script>