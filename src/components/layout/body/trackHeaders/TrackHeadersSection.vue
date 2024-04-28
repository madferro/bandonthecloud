<template>
    <div id="track-headers-section" class="w-72 min-w-72 flex flex-col sticky left-0 z-[20] bg-[#24262d] z-[300]">
        <div class="sticky w-full h-[35px] top-0 bg-[#24262d] z-[21] border-b-[#383844] border border-t-0 border-l-0 border-r-0 box-border"></div>
        <div class="track-headers-list flex-grow">
            <TrackHeader v-for="(track,index) in trackHeaders" :key="track.id+index" :track=track></TrackHeader>
            <div className="p-3 addtrack-btn">
                <button class="flex px-3 py-3 shadow-lg shadow-indigo-500/0 hover:shadow-indigo-500/40 bg-gradient-to-br from-indigo-500 to-indigo-600 text-gray-200 text-sm hover:no-underline hover:from-indigo-400 hover:to-indigo-500 hover:text-white rounded transition-all duration-300 mx-auto w-full justify-center">
                    <i className="bi-plus"></i>
                    <span class="aggiungitraccia" >Aggiungi Traccia</span>
                </button>
            </div>
        </div>
    </div>
</template>
<script setup>
    import {useStore} from 'vuex'
    import {onMounted,computed,onBeforeUnmount,onUpdated} from 'vue'
    import interact from 'interactjs'
    import TrackHeader from './TrackHeader'

    const store             = useStore();
    const trackHeaders      = computed(() => store.getters.getProjectProperty("tracks"))
    const trackHeight       = computed(() => store.getters.getProjectProperty("trackHeight"))
    const checkReorder      = 
        (draggedElement,offset) => {
            var draggedRect = draggedElement.getBoundingClientRect();
            var container = draggedElement.closest('.track-headers-list');
            var tracksContainer = document.getElementById('tracks-container');
            Array.from(container.getElementsByClassName('track-head')).forEach(function(element) {
                if (element !== draggedElement) {
                    var rect = element.getBoundingClientRect();
                    if (draggedRect.top < rect.top + rect.height / 2 && draggedRect.bottom > rect.top + rect.height / 2) {
                        if (draggedRect.top > rect.top) {
                            if(offset > 0){
                                container.insertBefore(draggedElement, element.nextSibling);
                                tracksContainer.insertBefore(
                                    document.getElementById(draggedElement.getAttribute('data-trackid')),
                                    document.getElementById(element.getAttribute('data-trackid')).nextSibling
                                )
                                draggedElement.setAttribute('data-y', 0);
                            }else{
                                container.insertBefore(draggedElement, element);
                                tracksContainer.insertBefore(
                                    document.getElementById(draggedElement.getAttribute('data-trackid')),
                                    document.getElementById(element.getAttribute('data-trackid'))
                                )
                                draggedElement.setAttribute('data-y', trackHeight.value/2);
                            }
                            
                        }
                    }
                }
            });
        }

    onMounted(() => {
        interact('.addtrack-btn').on('tap', function (event) {event.preventDefault();store.commit("setTrackModal",true)})
    })

    onUpdated(()=>{
        interact('.track-head').unset();
        interact('.track-head')
        .draggable({
            allowFrom: '.drag-handler-track',
            inertia: false,
            lockAxis: 'y',
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            onstart: (event) => {
                event.stopPropagation();
                event.preventDefault();
                var target = event.target,
                trackElement = document.getElementById(target.getAttribute('data-trackid'))
                
                target.classList.add("dragging")
                trackElement.classList.add("dragging")
            },
            onmove: (event) => {
                event.stopPropagation();
                event.preventDefault();
                var target = event.target,
                trackElement = document.getElementById(target.getAttribute('data-trackid')),
                y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

                target.style.transform = 'translate(0px, ' + y + 'px)';
                trackElement.style.transform = 'translate(0px, ' + y + 'px)';
                target.setAttribute('data-y', y);

                // Controllo della posizione rispetto agli altri elementi
                checkReorder(target,y);
            },
            onend: (event) => {
                event.stopPropagation();
                event.preventDefault();
                var target = event.target;
                var trackElement = document.getElementById(target.getAttribute('data-trackid'));

                target.style.transform = 'translate(0px, 0px)';
                trackElement.style.transform = 'translate(0px, 0px)';
                target.setAttribute('data-y', 0);
                target.classList.remove("dragging")
                trackElement.classList.remove("dragging")
                let reorder = [];

                Array.from(document.getElementsByClassName("track-head")).forEach((element) => {reorder.push(element.getAttribute("data-trackid"))})

                store.commit('reorderTracks',reorder)
                store.commit('setTrackSelected',event.target.getAttribute('data-trackid'))
            }
        });
    })

    onBeforeUnmount(() => {
        interact('.addtrack-btn').unset();
    })

</script>

<style>
.track-headers-list{
    height: calc(100% - 68px);
}
</style>