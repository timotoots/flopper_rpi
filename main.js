////////////////////////////////////////////////////////////////////////////////////////////////////

// Flopper Raspberry Pi player

'use strict';

const spawn = require( 'child_process' );

var fs = require('fs');
var colors = require('colors');


////////////////////////////////////////////////////////////////////////////////////////////////////

// Serial


var cache_path = "/opt/flopper_rpi/cache/"

var SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

var serialport = new SerialPort("/dev/ttyUSB0", {
  baudRate: 115200
});

serialport.on('open', function(){
  console.log('Serial Port Opened');
 
});


const parser = new Readline({delimiter: '\n'});
serialport.pipe(parser);

console.log('parser setup');

var current_uid = "";

 parser.on('data', function(data){

  var floppy_changed = 0;
  
   // var cmd = data.substr(0, 3); 
   if(data.substr(0, 8)=="Tag URL:"){

      var floppy_url = data.substr(9);  
      // console.log("FLOPPY INSERTED!");
      floppy_changed = 1;

   }  else if(data.substr(0, 8)=="Tag UID:"){

      current_uid = trim(data.substr(9));   

   } else if(data.substr(0, 20)=="Button pressed: NEXT"){
      buttonPressed("next");
   } else if(data.substr(0, 20)=="Button pressed: PREV"){
      buttonPressed("prev");
   } else if(data.substr(0, 20)=="Button pressed: RANDOM"){
      buttonPressed("random");
   } else if(data.substr(0, 20)=="Button pressed: PAUSE"){
      buttonPressed("random");
   } else if(data.substr(0, 20)=="Button pressed: REC"){
      buttonPressed("rec");
   } else if(data.substr(0, 20)=="Button pressed: LIKE"){
      buttonPressed("like");
   } else if(data.substr(0, 20)=="Volume changed:"){

        var new_vol = trim(data.substr(15));   
        changeVolume(new_vol);
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

  console.log("Change volume" + vol);


}

function buttonPressed(buttonId){

  console.log("Button pressed:" + buttonId);

  if(buttonId=="prev"){

    if(playlists.length>1 && current_track-1 < 0){
      current_track--;
      checkPlayer();
    }

  } else if(buttonId=="next"){

    if(playlists.length>1 && current_track+1 <= playlists.length-1){
      current_track++;
      checkPlayer();
    }

  } else if(buttonId=="random"){

    if(playlists.length>1){
      current_track = Math.floor(Math.random() * playlists.length);
      checkPlayer();
    }


  } else if(buttonId=="pause"){


  } else if(buttonId=="rec"){

  } else if(buttonId=="like"){
    play_soundfile("/opt/flopper_rpi/sounds/like.mp3");

  } 


}

////////////////////////////////////////////////////////////////////////////////////////////////////

var Sound = require('aplay');

var MPlayer = require('mplayer'); 
var player = new MPlayer();

////////////////////////////////////////////////////////////////////////////////////////////////////

// files and downloading

var sanitize = require("sanitize-filename");

function play_soundfile(file){

  console.log("PLAY " + file);

  player.openFile(file);

}

////////////////////////////////////////////////////////////////////////////////////////////////////

var current_track = 0;


var playlists = [];

function checkPlayer(){

  console.log("CURRENT PLAYLIST".yellow);
  console.log(playlists);

}


function ParseUrl(url, playlist_start = 1, playlist_end=2){

    url = trim(url);

    // var url_type = url.indexOf("file://");


    if(url=="https://vikerraadio.err.ee/"){
       url = "http://icecast.err.ee/vikerraadio.mp3.m3u";
       url = "https://www.youtube.com/playlist?list=PLTkaXIuco-GPASgIwr00ALMth7UrjwD0i";
       url = "https://soundcloud.com/tantsusaabas/tracks";
    }

    if(typeof url === "undefined" || url==""){
      return false;
    }

    var cmd = 'echo "'+ current_uid + '" && echo "'+ url +'" && echo "'+ playlist_start  +'" && echo "'+ playlist_end  +'"   && youtube-dl -g --quiet --no-warnings --ignore-errors -f best ';
   
    cmd = cmd + '--playlist-start '+ playlist_start +' --playlist-end ' + playlist_end;
 
    
    cmd = cmd + ' "' + url + '"' ;

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





