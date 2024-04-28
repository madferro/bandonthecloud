<template>
    <div class="flex items-center z-[70]">
        <div class="relative">
            <span role="button" tabindex="0" aria-haspopup="true" aria-expanded="false" class="toggle-menu bg-[#1e2025] rounded-full text-[#8d94a5] hover:text-white hover:bg-[#2f323c] w-9 h-9 guidamenu flex items-center justify-center cursor-pointer outline-none hover:no-underline transition duration-300">
                <i class="bi-list"></i>
            </span>
            <div v-if="opened" role="menu" tabindex="-1" class="shadow-2xl header-menu bg-[#32353e] z-[197] absolute top-full left-0 rounded-lg mt-2 left-[-214px]">
                <ul>
                    <li class="min-w-[250px] border-[#363a45] border-b cursor-pointer" v-for="(item, key) in menuItems" :key="key">
                        <div :data-act="key" role="menuitem" tabindex="-1" class="menu-button header-menu-item text-sm py-3 px-3 transition duration-200 bg-transparent hover:bg-[#3b3e49] text-gray-400 hover:text-white" v-html="item"></div>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup>
    import {ref,onMounted,computed,onBeforeUnmount,watch} from 'vue'
    import interact from 'interactjs'
    import {useStore} from 'vuex'

    const store = useStore();
    const opened = ref(false);
    const fullscreenFromStore = computed(() => store.state.fullScreen);
    let fullscreen = fullscreenFromStore.value;
    const menuItems = ref({
        "save"          : "<i class='bi bi-floppy h-4 w-4'></i><span class='ml-2'>Salva</span>",
        "loops"         : "<i class='bi bi-music-note-list w-4 h-4'></i><span class='ml-2'>Libreria Loop e suoni</span>",
        "my-loops"      : "<i class='bi bi-disc'></i><span class='ml-2'>Libreria Registrazioni progetto</span>",
        "history"       : "<i class='bi bi-list-check'></i><span class='ml-2'>Salvataggi precedenti</span>",
        "tutorial"      : "<i class='bi bi-tv'></i><span class='ml-2'>Guarda il Tutorial</span>",
        "fullscreen"    : "<i class='bi "+(fullscreen?"bi-fullscreen-exit":"bi-fullscreen")+"'></i><span class='ml-2'>"+(fullscreen?"Disattiva fullscreen":"Attiva fullscreen")+"</span>"
    });

    watch(fullscreenFromStore, (newVal) => {
        menuItems.value["fullscreen"] = "<i class='bi "+(newVal?"bi-fullscreen-exit":"bi-fullscreen")+"'></i><span class='ml-2'>"+(newVal?"Disattiva fullscreen":"Attiva fullscreen")+"</span>"
    });

    onMounted(() => {
        interact('.toggle-menu').on('down', function (event) {
            opened.value = !opened.value
            //stoppo la propagazione degli eventi click e touchstart
            interact(event.target).on('click', function (_event) {_event.stopImmediatePropagation();}, true)
            interact(event.target).on('touchstart', function (_event) {_event.stopImmediatePropagation();}, true)
        })
        interact('.menu-button').on('tap', function (event) {
            const act = event.target.closest('.menu-button').dataset.act;

            switch(act){
                case "save": break;
                case "loops": 
                    opened.value = false
                    store.commit("showLoopsPanel")
                break;
                case "my-loops": break;
                case "history": break;
                case "tutorial": break;
                case "fullscreen": 
                    store.commit("toggleFullscreen")
                break;
            }

            //stoppo la propagazione degli eventi click e touchstart
            interact(event.target).on('click', function (_event) {_event.stopImmediatePropagation();}, true)
            interact(event.target).on('touchstart', function (_event) {_event.stopImmediatePropagation();}, true)
        })
    }) 

    onBeforeUnmount(() => {
        interact('.toggle-menu').unset();
        interact('.menu-button').unset();
    })

    //listener per chiudere il menu se si clicca da qualsiasi parte che non sia una voce del menu o l'icona del menu
    window.emitter.on("genericClick",function(){
        opened.value = false;
    });
</script>

<style>
.header-menu ul li:first-child .header-menu-item {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

.header-menu ul li:last-child .header-menu-item {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
}

.header-menu ul li:last-child{
    border-bottom:0;
}
</style>