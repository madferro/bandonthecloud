<script setup>
    import HeaderSection from './HeaderSection'
    import FooterSection from './FooterSection'
    import CenterSection from './CenterSection'
    import LoginModal from './modals/LoginModal'
    import AddTrackModal from './modals/AddTrackModal'
    import GenericLoadingModal from './modals/GenericLoadingModal'
    import PianoRoll from './body/rolls/PianoRoll'
    import DrumsRoll from './body/rolls/DrumsRoll'
    import {useStore} from 'vuex'
    import {computed,ref,watch} from 'vue'
    import {performBackendRequest} from '../../utils/utils'
    import 'animate.css';

    const store             = useStore();
    const isLogged          = computed(() => store.getters.isLogged)
    const trackModal        = ref(store.getters.getTrackModal)
    const tracks            = computed(() => store.getters.getProjectProperty('tracks').length)
    const midiRollInfos     = computed(() => store.getters.getProjectProperty('midiRollInfos'))
    const drumsRollInfos    = computed(() => store.getters.getProjectProperty('drumsRollInfos'))

    watch(tracks,() => {store.dispatch('initializePlayer')})
    
    //controllo se c'è un utente loggato
    performBackendRequest(
        {action : "isLogged"},
        "post",
        (response) => {
            store.commit('setUser', response.data.data)
            store.commit('setProjectFromDb')
        },
        () => {
            window.emitter.emit('notLogged');
        }
    )

    //recupero i loops dal db
    performBackendRequest(
        {action : "getLoops"},
        "post",
        (response) => {
            if(response.data.resp == "ok"){
                store.commit('setLoops', response.data.data)
            }else{
                store.commit('setLoops', [])
            }
        }
    )


    watch(() => store.state.trackModal, (newVal) => {
        trackModal.value = newVal;
    });

    window.emitter.on('flash',(elementid) => {
        document.getElementById(elementid).classList.add('animate__animated', 'animate__shakeXShort')
        document.getElementById(elementid).addEventListener('animationend', () => {
            document.getElementById(elementid).classList.remove('animate__animated', 'animate__shakeXShort')
        })
    })
</script> 
<template>
    <div class="flex flex-col bg-[#24262d] absolute top-0 left-0 right-0 bottom-0">
        <LoginModal v-if="!isLogged"></LoginModal>
        <AddTrackModal v-if="trackModal"></AddTrackModal>
        <GenericLoadingModal></GenericLoadingModal>
        <PianoRoll :rollInfos="midiRollInfos" v-if="midiRollInfos"></PianoRoll>
        <DrumsRoll :rollInfos="drumsRollInfos" v-if="drumsRollInfos"></DrumsRoll>
        <HeaderSection></HeaderSection>
        <CenterSection></CenterSection>
        <FooterSection></FooterSection>
    </div>
</template>