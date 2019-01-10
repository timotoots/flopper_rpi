// Import the module.
const OMXPlayer = require('node-omxplayer-raspberry-pi-cast');


// Create an instance of the player with the source, looping it and without showing an on screen display
const player = new OMXPlayer({ source: 'http://icecast.err.ee:80/vikerraadio.mp3', loop: false, noOsd: true });

// Control video/audio playback.
player.play((err) => { console.log(err); });
player.increaseVolume((err) => { console.log(err); });
player.getVolume((err, vol) => { if (err) console.log(err); else console.log(vol); });
// player.quit();