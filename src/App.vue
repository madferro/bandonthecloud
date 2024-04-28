<template>
  <SloganSection></SloganSection>
  <BodySection v-cloak/>
</template>

<script setup>
    import BodySection from './components/layout/BodySection.vue'; 
    import SloganSection from './components/layout/SloganSection.vue'; 
    import {useStore} from 'vuex'
    
    const store                     = useStore()
    //listener per inviare i click generici sugli elementi dom
    document.addEventListener("click",function(){
        window.emitter.emit("genericClick")
        store.commit("deselectEvents")
    });

    //listener per inviare i touchstart generici sugli elementi dom
    document.addEventListener("touchstart",function(){
        window.emitter.emit("genericClick")
        store.commit("deselectEvents")
        //event.preventDefault();
    },{passive:false});

    window.emitter.on("openAddTrackModal",function(){
        console.log("openaddtrackmodal")
    });
</script>