////////////////////////////////////////////////////////////////////////////////////////////////////

// Flopper Raspberry Pi player

'use strict';

const spawn = require( 'child_process' );

var fs = require('fs');
var colors = require('colors');

var request = require('request');
////////////////////////////////////////////////////////////////////////////////////////////////////

// Serial


var cache_path = "/opt/flopper_rpi/cache/"

var SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;
try{
var serialport = new SerialPort("/dev/ttyUSB0", {
  baudRate: 115200
});

} catch(e){
  console.log("No Flopper Drive connected to /dev/ttyUSB0");
  process.exit();
}
serialport.on('open', function(){
  console.log('Serial Port Opened');
 
});


const parser = new Readline({delimiter: '\n'});
serialport.pipe(parser);

console.log('parser setup');

var current_uid = "";

 parser.on('data', function(data){

  var floppy_changed = 0;
  
    data = trim(data);

   // var cmd = data.substr(0, 3); 
   if(data.substr(0, 8)=="Tag URL:"){

      var floppy_url = data.substr(9);  
      // console.log("FLOPPY INSERTED!");
      floppy_changed = 1;

   }  else if(data.substr(0, 8)=="Tag UID:"){

      current_uid = trim(data.substr(9));   

   } else if(data.substr(0, 11)=="Touch: NEXT"){
      buttonPressed("next");
   } else if(data.substr(0, 11)=="Touch: PREV"){
      buttonPressed("prev");
   } else if(data.substr(0, 13)=="Touch: RANDOM"){
      buttonPressed("random");
   } else if(data.substr(0, 12)=="Touch: PAUSE"){
      buttonPressed("pause");
   } else if(data.substr(0,10 )=="Touch: REC"){
      buttonPressed("rec");
   } else if(data.substr(0, 11)=="Touch: LIKE"){
      buttonPressed("like");
   } else if(data.substr(0, 22)=="Potentiometer change: "){

        var new_vol = trim(data.substr(22));   
        changeVolume(new_vol);
        return false;
   } 
   

   else if(data.substr(0, 15)=="FLOPPY REMOVED!"){

       console.log("FLOPPY REMOVED!");
      // var floppy_id = 0;
      var floppy_url = "";
      floppy_changed = 1;
      current_uid = "";
      playlists = [];
      checkPlayer();


   } 

   

   if (floppy_changed == 1 && floppy_url != ""){


      console.log("New floppy URL: " + floppy_url);
      jump_to_track = 0;
      ParseUrl(floppy_url);
 
   }

   // DEBUG
    console.log('data received: ', data);

    });

function trim(str){

  str = str.replace(/^\s+|\s+$/g,'');
  return str;

}

function changeVolume(vol){

  console.log("Change volume: " + vol);


  const execSync = require('child_process').execSync;
  var code = execSync("amixer sset 'PCM' "+vol+"%");


}

var buttonAccept = {"prev":1,"next":1,"random":1,"rec":1,"like":1,"pause":1};

function buttonPressed(buttonId){


  if(buttonId=="prev" && buttonAccept.prev){

    console.log("Button pressed:" + buttonId);

    buttonAccept.prev = 0;
    setTimeout(function(){
      buttonAccept.prev = 1;
    },3000);


     if(playlists.length>1 && current_track-1 >= 0){
      jump_to_track = current_track-1;
      checkPlayer();
    }

  } else if(buttonId=="next" && buttonAccept.next){


    console.log("Button pressed:" + buttonId);


    buttonAccept.next = 0;
    setTimeout(function(){
      buttonAccept.next = 1;
    },3000);

    if(playlists.length>1 && current_track+1 <= playlists.length-1){
      jump_to_track = current_track+1;
      checkPlayer();
    }

  } else if(buttonId=="random" && buttonAccept.random){

   console.log("Button pressed:" + buttonId);


    buttonAccept.random = 0;
    setTimeout(function(){
      buttonAccept.random = 1;
    },3000);

    if(playlists.length>1){
      jump_to_track = Math.floor(Math.random() * (playlists.length-1));
      checkPlayer();
    }


  } else if(buttonId=="pause" && buttonAccept.pause){

    console.log("Button pressed:" + buttonId);

    buttonAccept.pause = 0;
    setTimeout(function(){
      buttonAccept.pause = 1;
    },3000);

    controlOmx("pause");


  } else if(buttonId=="rec" && buttonAccept.rec){

    console.log("Button pressed:" + buttonId);


    buttonAccept.rec = 0;
    setTimeout(function(){
      buttonAccept.rec = 1;
    },3000);

  } else if(buttonId=="like" && buttonAccept.like){

    console.log("Button pressed:" + buttonId);


    buttonAccept.like = 0;
    setTimeout(function(){
      buttonAccept.like = 1;
    },3000);


    play_soundfile("/opt/flopper_rpi/sounds/like.wav");

  } 


}

////////////////////////////////////////////////////////////////////////////////////////////////////

var Sound = require('aplay');

var MMPlayer = require('mplayer'); 
var mplayer = new MMPlayer();

// Import the module.
// var omx = require('node-omxplayer');
// var players = [];

// players[0] = omx();
// players[1] = omx();


// Control video/audio playback.
//player.pause();
// player.volUp();
//player.quit();



////////////////////////////////////////////////////////////////////////////////////////////////////

// files and downloading

var sanitize = require("sanitize-filename");

function play_soundfile(file){

  console.log("PLAY " + file);

  mplayer.openFile(file);

}

////////////////////////////////////////////////////////////////////////////////////////////////////

var current_track = 0;
var next_track = 0;
var jump_to_track = -1;
var current_player = 0;

var playlists = [];

function controlOmx(cmd, params = ""){

  if(cmd=="status"){

    request.post({url:'http://localhost:4321/index.php/index', form: {action:'dbus',command:'status'}}, function(err,httpResponse,body){ PlayerStatus(body) })
    
  } else if(cmd == "stop"){

    request.post({url:'http://localhost:4321/index.php/index', form: {action:'shortcut',shortcut:'q'}}, function(err,httpResponse,body){ console.log("OMX Player stop!"); console.log(body) })
    
  } else if(cmd == "pause"){

    request.post({url:'http://localhost:4321/index.php/index', form: {action:'shortcut',shortcut:'p'}}, function(err,httpResponse,body){ console.log("OMX Player pause!"); })
    
  } else if(cmd == "play"){

    request.post({url:'http://localhost:4321/index.php/index', form: {action:'shortcut',shortcut:'start',path:params}}, function(err,httpResponse,body){ console.log("OMX Player play: "); console.log(body) })


  }

}

function PlayerStatus(status){

  status = JSON.parse(status);

  if(typeof status != "undefined"){
     if(typeof status.status != "undefined"){
       if(typeof status.status.status != "undefined"){
        console.log(status.status.status);
       }
      }
  }
    setTimeout(function(){ controlOmx("status"); }, 2000);

}

 controlOmx("status");

function checkPlayer(){

  

  console.log("CHECK PLAYER".yellow);
  console.log("Current track: " + current_track);
  console.log("Jump to track: " + jump_to_track);
  console.log("Current playlist".yellow);
  console.log("Playlist length: " + playlists.length);

  // no media, stop playing
  if(playlists.length==0){

     console.log("Omxplayer stop!");
       controlOmx("stop");

     // players[0].newSource("/opt/flopper_rpi/sounds/silence.wav");
     // players[1].newSource("/opt/flopper_rpi/sounds/silence.wav");
     // current_player[0].quit();
     // current_player[1].quit();
    

  } else if(jump_to_track>=0){

    if(typeof playlists[jump_to_track] === "undefined"){
      console.log("Omxplayer no track found!");
      jump_to_track = -1;
    } else {
      console.log("Omxplayer jump to  track:" + jump_to_track);
      console.log(playlists[jump_to_track]);

  
      controlOmx("play",playlists[jump_to_track]);


      current_track = jump_to_track;
      jump_to_track = -1;
    }

  }

  // if(next_track != current_track && playlists.length>0 || (next_track==0 && current_track==0) ){

  //   player.newSource(playlists[next_track]);
  //   player.play();
  //   current_track = next_track;

  // }


} // checkPlayer


function ParseUrl(url, playlist_start = 1, playlist_end=2){

    url = trim(url);

    // var url_type = url.indexOf("file://");


    if(url=="https://vikerraadio.err.ee/"){
       url = "http://icecast.err.ee/vikerraadio.mp3.m3u";
    } else if(url=="http://www.radiorethink.com/tuner/?stationCode=wfmugtd&stream=hi"){
      url  = "http://stream0.wfmu.org/drummer";
    } else if(url == "http://www.radiorethink.com/tuner/?stationCode=wfmu&stream=hi"){
      url = "http://stream0.wfmu.org/freeform-high.aac";
             url = "https://www.youtube.com/playlist?list=PLTkaXIuco-GPASgIwr00ALMth7UrjwD0i";
       url = "https://soundcloud.com/tantsusaabas/tracks";
    }
    

    if(typeof url === "undefined" || url==""){
      return false;
    }

    // Local youtube-dl
    // var cmd = 'echo "'+ current_uid + '" && echo "'+ url +'" && echo "'+ playlist_start  +'" && echo "'+ playlist_end  +'"   && youtube-dl -g --quiet --no-warnings --ignore-errors -f best ';
    // cmd = cmd + '--playlist-start '+ playlist_start +' --playlist-end ' + playlist_end;
    // cmd = cmd + ' "' + url + '"' ;


    var cmd = 'echo "'+ current_uid + '" && echo "'+ url +'" && echo "'+ playlist_start  + '" && echo "'+ playlist_end  + '" && wget -q -O - "http://play.flopper.net/youtubedl.php?cmd=urls&playlist_start=' + playlist_start + '&playlist_end=' + playlist_end + '&url= ' + url + '"';



    console.log("Youtube download started:");
    console.log(cmd.green);

    const exec = require('child_process').exec;


      exec(cmd,{maxBuffer:200*1024*1000},function(error,stdout,stderr){ 

              var str =  "Youtube download ended:";
              console.log(str.green);
              stdout = trim(stdout);
              // console.log(stdout.blue);

              var media_urls = stdout.split("\n");

              var uid = media_urls.shift();
              var url = media_urls.shift();
              var playlist_start = media_urls.shift();
              var playlist_end = media_urls.shift();

              if(uid==current_uid){
                
                console.log(parseInt(playlist_start));

                // URL still relavent to floppy
                if(media_urls.length>1){
                    ParseUrl(url,parseInt(playlist_start)+2,parseInt(playlist_end)+2); // trigger again
                }
               
               

                // remove first elements (the uid, flag, url)

                playlists = playlists.concat(media_urls);
                console.log(media_urls);
                checkPlayer();
      
              }
          

              // try{
              //     var out = JSON.parse(stdout)
              //     res.json(out);
              // } catch(e){
              //   console.log(e);
              // }
            });



}

////////////////////////////////////////////////////////////////////////////////////////////////////

function play_url_with_caching(url){

  var dirname = sanitize(url);

  if (!fs.existsSync(cache_path + dirname)) {

      fs.mkdirSync(cache_path + dirname);

  }

  var cache_file = dirname+"/" + dirname + ".m4a";

  if (fs.existsSync(cache_path + cache_file)) {

    console.log("Cache found, lets play the sound! " + cache_file);
    play_soundfile(cache_path + cache_file);
    

  } else {
   

    console.log("No cache found, lets download! " + url);

    var cmd = 'cd '+ cache_path + dirname + '/ && youtube-dl -f 140 -o - "' + url + '" > ' + dirname + ".m4a" ;
    console.log(cmd);

    const execSync = require('child_process').execSync;
    var code = execSync(cmd);
    console.log(code);

    var full_filename = cache_path + dirname+'/' + dirname + ".m4a";
    console.log(full_filename);

    play_soundfile(full_filename);


  }


} // function

////////////////////////////////////////////////////////////////////////////////////////////////////



function shutdown_now(){
	console.log("shutdown now");
	// var sd = spawn( 'shutdown', [ 'now' ] );

}





