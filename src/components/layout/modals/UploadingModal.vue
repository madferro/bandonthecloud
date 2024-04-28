<template>
<div class="uploading-modal fixed flex items-center justify-center left-0 top-0 right-0 bottom-0 z-[9999] bg-[rgba(30,32,37,0.95)]" v-show="props.show">
    <div class="flex w-1/2 flex-col text-center gap-3">
        <div class="text-xl font-bold text-gray-500 mb-2 tracking-tight">Caricamento</div>
        <div class="text-sm text-gray-200">{{ props.filename }}</div>
        <div class="relative w-full h-1 bg-gray-700 rounded-full">
            <div class="absolute top-0 left-0 h-1 bg-green-400 rounded-full w-[0] duration-300 " :style="{width: props.percent +'%'}"></div>
        </div>
    </div>
</div>
</template>

<script setup>
    import { defineProps } from 'vue'

    const props = defineProps({
        show        : Boolean,
        filename    : String,
        percent     : Number
    })
</script>