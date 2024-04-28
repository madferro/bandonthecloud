import { createApp } from 'vue'
import App from './App.vue'
import store from './components/store/store'
import 'balloon-css'
import './index.css'
import PrimeVue from 'primevue/config'
import 'primevue/resources/themes/aura-light-green/theme.css'


//emitter per realizzare un eventbus per comunicare fra i vari componenti se ce ne fosse bisogno
var Emitter = require('tiny-emitter');
window.emitter = new Emitter();

document.addEventListener('dragover', function(event) {
    event.preventDefault();  // Previene altri comportamenti di drag and drop
}, false);

document.addEventListener('drop', function(event) {
    event.preventDefault();  // Previene il drop di file
}, false);

const app = createApp(App)
app.use(store)
app.use(PrimeVue)
app.mount('#app')
