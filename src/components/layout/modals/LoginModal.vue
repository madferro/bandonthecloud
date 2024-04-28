<template>
    <div class="fixed top-0 left-0 w-screen h-screen bg-[rgba(36,38,45,0.95)] flex items-center justify-center z-[999]">
        <div class="relative bg-[#1a1d21] w-1/2 rounded-lg shadow-xl shadow-[rgba(0,0,0,0.4)] p-4">
            <form @submit.prevent="doLogin" class="flex flex-col w-full">
                <input
                    class="appearence-none bg-gray-100 shadow-lg rounded flex-grow p-2 mb-2"
                    v-model=userInfos.username
                    placeholder="la tua email"
                    type="email"
                    required
                />

                <input
                    class="appearence-none bg-gray-100 shadow-lg rounded flex-grow p-2 mb-2"
                    v-model=userInfos.password
                    placeholder="la tua password"
                    type="password"
                    required
                />

                <button type="submit" class="flex items-center disabled:opacity-50 rounded p-2 shadow-md shadow-green-500/0 hover:shadow-green-500/40 bg-gradient-to-br from-green-500 to-green-600 text-gray-100 text-sm hover:no-underline hover:from-green-400 hover:to-green-500 hover:text-white transition-all duration-200 hover:no-underline">
                    <i class="bi-lock-fill text-sm pr-1"/>
                    <span>Login</span>
                </button>
            </form>
        </div>
    </div>
</template>
<script setup>
    import {ref} from 'vue'
    import {useStore} from 'vuex'
    import {performBackendRequest} from '../../../utils/utils'

    const store = useStore()

    let userInfos = ref({
        username : '',
        password : ''
    })

    const doLogin = () => {
        performBackendRequest({
                action : 'login',
                userInfos : userInfos.value
            },
            'post',
            (response) => {
                console.log(response)
                if(response.data.cookies && response.data.cookies.length > 0){
                    response.data.cookies.forEach((cookie) => {
                        let cookieSplitted = cookie.split('=')
                        if(cookieSplitted[0] == 'PHPSESSID' && document.cookie.indexOf(cookieSplitted[0]) < 0){
                            document.cookie = cookie
                        }
                    })
                }


                store.commit('setUser', response.data.data)
                store.commit('setProjectFromDb')



            }
        );
    }
</script>