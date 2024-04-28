<template>
    <div 
        aria-label="Esporta progetto" data-balloon-pos="up-right" data-balloon-blunt data-balloon-nofocus 
        class="export-btn cursor-pointer esportas rounded-full bg-[#1e2025] text-xl text-[#8d94a5] w-9 h-9 transition duration-200 hover:bg-[#2f323c] hover:text-white flex items-center justify-center"
    >
        <i className="bi-save2"></i>
    </div>
</template>

<script setup>
    //import {useStore} from 'vuex'
    import {onMounted} from 'vue'
    import interact from 'interactjs'
    //const store = useStore();

    //const toDecibels = (linearValue) => 20 * Math.log10(linearValue);
            

    onMounted(() => {
        interact('.export-btn').on('tap', function (event) {
            event.preventDefault();

            //esportazione progetto

            /*onClick={() => {
            

            let playing = Events.events.map(event => {
              const track = Mixer.getTrack(event.audiotrack.trackid);
              return {
                ...event,
                volume: track.getVolume() // Aggiungi il volume corrente dalla traccia
              };
            });

            let buffers = {};
            let pieceLength = 0;
            let trackMixed = {};

            for (let i2 = 0; i2 < playing.length; i2++) {
              trackMixed[i2] = false;
              buffers[i2] = [];
            }

            openExportModal();
            setExportedTracks(0);

            let exported = 0;

            const handleRender = async () => {
              for (let i = 0; i < playing.length; i++) {
                  
                  if(playing[i].audiotrack.type.toLowerCase() == "audio"){  
                    const buffer = await Tone.Buffer.fromUrl(playing[i].currentfile);
                    
                    if (pieceLength < playing[i].time + playing[i].length){
                      pieceLength = playing[i].time + playing[i].length;
                    }
                    buffers[i] = [{
                      buffer: buffer,
                      time : playing[i].time,
                      length : playing[i].length
                    }];
                    trackMixed[i] = true;
                    exported++;
                    
                    setExportedTracks(parseInt((exported/playing.length) * 100));
                    
                    mixDown()
                  }else if(playing[i].audiotrack.type.toLowerCase() == "instrument"){
                    const myPianoroll = new PianoRollClip(
                      playing[i].audiotrack,
                      playing[i].eventid,
                      playing[i].time,
                      playing[i].length
                    );                           
                    const Soundfont = require('soundfont-player');
              
                    
                    // AudioContext
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    // Carica il SoundFont
                    Soundfont.instrument(
                      audioContext, 
                      './soundfont/'+playing[i].instrument.instrumentName+'-mp3.js', 
                      { 
                        //soundfont: "FluidR3_GM", 
                        gain:0
                      }
                    ).then((piano) => {
                      let buf = piano.schedule(audioContext.currentTime, myPianoroll.soundFontScheduler, audioContext.destination);
                      
                      for(let b=0;b<buf.length;b++){
                        let toneBuffer = new ToneAudioBuffer();
                        let buff = buf[b];
                        let channelData = buff.source.buffer.getChannelData(1);
                        toneBuffer.fromArray(channelData);

                        var bb = buffers[i];
                        bb.push({
                          buffer : toneBuffer,
                          time : myPianoroll.soundFontScheduler[b].time,
                          length : myPianoroll.soundFontScheduler[b].duration,
                        });
                        
                        if (pieceLength < (playing[i].time + (playing[i].length)/8)){
                          pieceLength = (playing[i].time + (playing[i].length)/8);
                        }
                      }
                      trackMixed[i] = true;
                      exported++;
                      setExportedTracks(parseInt((exported/playing.length) * 100));
                      mixDown();
                    },
                    (err) => {console.log(err)});
                  }else if(playing[i].audiotrack.type.toLowerCase() == "percussion"){
                      const myPianoroll = new DrumsRollClip(
                        playing[i].audiotrack,
                        playing[i].eventid,
                        playing[i].time,
                        playing[i].length
                      );
                    
                      const Soundfont = require('soundfont-player');
                      let midiBase64 = myPianoroll.exportMIDIBase64(playing[i].scheduler);
                      
                      // AudioContext
                      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                      
                      // Carica il SoundFont
                      Soundfont.instrument(
                        audioContext, 
                        './soundfont/'+playing[i].instrument.instrumentName+'-mp3.js', 
                        { 
                          //soundfont: "FluidR3_GM", 
                          gain:0
                        }
                      ).then((piano) => {
                        let buf = piano.schedule(audioContext.currentTime, myPianoroll.soundFontScheduler, audioContext.destination);
                        
                        for(let b=0;b<buf.length;b++){
                          let toneBuffer = new ToneAudioBuffer();
                          let buff = buf[b];
                          console.log(buff);
                          let channelData = buff.source.buffer.getChannelData(0);
                          toneBuffer.fromArray(channelData);
  
                          var bb = buffers[i];
                          bb.push({
                            buffer : toneBuffer,
                            time : myPianoroll.soundFontScheduler[b].time,
                            length : myPianoroll.soundFontScheduler[b].duration,
                          });
                          
                          if (pieceLength < (playing[i].time + (playing[i].length)/8)){
                            pieceLength = (playing[i].time + (playing[i].length)/8);
                          }
                        }
                        trackMixed[i] = true;
                        exported++;
                        setExportedTracks(parseInt((exported/playing.length) * 100));
                        mixDown();
                      },
                      (err) => {console.log(err)});
                    }
                  }
                  
                  
                  
                //},5000)
              }
              handleRender();

              const mixDown = () => {
                var go = true;
                for(let t in trackMixed){
                  
                  if(trackMixed[t] === false){
                    go = false;
                  }
                }
                //console.log(buffers);
                if(go){
                  Tone.Offline(() => {
                      for (let i = 0; i < playing.length; i++) {

                        for(let y = 0; y<buffers[i].length; y++){
                          let sample = new Tone.Player().toDestination();
                          sample.buffer = buffers[i][y].buffer;
                          sample.volume.value = playing[i].volume; // Imposta il volume sul player
                          
                          //console.log(sample.buffer,buffers[i][y]);

                          sample.start(buffers[i][y].time,0,buffers[i][y].length);
                        }
                      }
                    }, pieceLength).then(
                      (buffer) => {
                        const blob = bufferToWave(buffer, buffer.length);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = props.proj_name + ".wav";
                        a.click();
                        closeExportModal();
                      }
                    );
                  }
              }
              
              // Convert an AudioBuffer to a Blob using WAVE representation
              function bufferToWave(abuffer, len) {
                let numOfChan = abuffer.numberOfChannels,
                    length = len * numOfChan * 2 + 44,
                    buffer = new ArrayBuffer(length),
                    view = new DataView(buffer),
                    channels = [], i, sample,
                    offset = 0,
                    pos = 0;

                // write WAVE header
                setUint32(0x46464952);                         // "RIFF"
                setUint32(length - 8);                         // file length - 8
                setUint32(0x45564157);                         // "WAVE"

                setUint32(0x20746d66);                         // "fmt " chunk
                setUint32(16);                                 // length = 16
                setUint16(1);                                  // PCM (uncompressed)
                setUint16(numOfChan);
                setUint32(abuffer.sampleRate);
                setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
                setUint16(numOfChan * 2);                      // block-align
                setUint16(16);                                 // 16-bit (hardcoded in this demo)

                setUint32(0x61746164);                         // "data" - chunk
                setUint32(length - pos - 4);                   // chunk length

                // write interleaved data
                for(i = 0; i < abuffer.numberOfChannels; i++)
                  channels.push(abuffer.getChannelData(i));

                while(pos < length) {
                  for(i = 0; i < numOfChan; i++) {             // interleave channels
                    sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
                    sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
                    view.setInt16(pos, sample, true);          // write 16-bit sample
                    pos += 2;
                  }
                  offset++                                     // next source sample
                }

                // create Blob
                return new Blob([buffer], {type: "audio/wav"});

                function setUint16(data) {
                  view.setUint16(pos, data, true);
                  pos += 2;
                }

                function setUint32(data) {
                  view.setUint32(pos, data, true);
                  pos += 4;
                }
              }*/

        })
    }) 
</script>