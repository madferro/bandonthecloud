<template>
    <div class="border-r pr-3 border-gray-100/10 h-9">
        <span id="time-display" class="min-w-[128px] block text-center text-3xl">
        {{ new Date(projectTime * 1000).toISOString().substr(14, 8) }}
        </span>
    </div>
</template>
<script setup>
    import {useStore} from 'vuex'
    import {computed} from 'vue'

    const store = useStore();
    const projectTime = computed(() => store.getters.getProjectProperty("time"))

</script>
<style scoped>
#time-display{
    font-family: "Azeret Mono", monospace !important;
}
</style>