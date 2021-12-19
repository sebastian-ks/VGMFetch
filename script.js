/*--------------------------------------------
--- PLAYER SETUP------------
------------------------------------------------*/

// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
var currentPlaylist = "";
var currentSong= "";
function onYouTubeIframeAPIReady() {
  console.log("Iframe Ready");
  player = new YT.Player('player', {
    height: '360',
    width: '640',
    host: 'https://www.youtube-nocookie.com',
    videoId: '-5q2i9eeCdM',
    playerVars: {
      'rel': 0,
      'autohide': 1
    },
    events: {
      'onReady': onPlayerReady
      //'onStateChange': onPlayerStateChange
    }
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  console.log("Player Ready")
  //event.target.playVideo();
}

function playaudio(song){
  var url = song.getAttribute("data-url");
  var playlist = song.getAttribute("data-origin");
  var tracknr = song.getAttribute("data-tracknr");
  var state = player.getPlayerState();

  if(playlist != currentPlaylist){
    player.loadPlaylist({
      'list': playlist,
      'listType':'playlist',
      'index':tracknr,
      'startSeconds':0,
      'suggestedQuality':'default'
    })
    currentPlaylist = playlist;
    currentSong = url;
  }
  else{
    if(url != currentSong){
      player.playVideoAt(tracknr);
      currentSong = url;
    }
    else{
      if(state == 1){
        pauseaudio();
      }
      else{
        player.playVideo();
      }
    }
  }
}

function pauseaudio(){
  player.pauseVideo();
}



// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    setTimeout(stopVideo, 6000);
    done = true;
  }
}
function stopVideo() {
  player.stopVideo();
}

/*---------------------------------------------------------------
------------------ END PLAY SETUP-------
------------------------------------------------------------*/



class Credentials{
  constructor(URL,YT_API_KEY){
    this.URL = URL;
    this.YT_API_KEY = YT_API_KEY;
  }
}


function t(){
  document.getElementById("headline").innerHTML = "ERSETZT!";

  //document.write("YOOOO");
}

function albumview(){
  document.getElementById("library_all").style.display = "block";
  document.getElementById("library_playlists").style.display = "block";
  document.getElementById("library_albums").style.display = "block";
  document.getElementById("library_compilation").style.display = "block";
}

function search(){
  //Credentials for the Search; Configure this File if you want to apply filters to the search
  let search_cred = "YTcred.json";
  //----------------------------------
  getAPICredentials(document.getElementById("searchField").value, search_cred,getYTData);
}

function exposePlaylist(){
  let search_cred = "testing.json";
  getAPICredentials(document.getElementById("playlistExposer").innerHTML, search_cred,displayPlaylist);
}
/*-------------------------------------------------------------------------------------------------------------------
  The following 3 UNIQUE functions are executed one after another asynchronously by calling the next method via callback
-------------------------------------------------------------------------------------------------------------------*/

//Get the JSON file for the YT API Credentials from local server
function getAPICredentials(searchTerm, search_cred,callback){
  /* // WARNING:-------------------------------------------------------------------------
    - As of now this needs to be called everytime when interacting with Youtube API
    - Also this JSON is visible in the Browser-Cache, exposing the YT_API_KEY
    consider fixing these 2 Points
  ----------------------------------------------------------------------------------------*/

    //Object with credentials for API Connection
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        //if error, handle else callback function that handles HTTP Response
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(searchTerm,xmlHttp.responseText);
        //else
          //  alert(xmlHttp.statusText);
    }
    xmlHttp.open("GET",search_cred,true);
    xmlHttp.send(null);
}

function displayPlaylist(searchTerm,json){
  var playlist = JSON.parse(json);
  var cnt = 0;
  var text,url,p,song,playbtn;
  for(let i=0;i<playlist.items.length;i++){
    url = playlist.items[i].snippet.resourceId.videoId;
    //Add a Div for every song
    p = document.createElement("div");
    text = playlist.items[i].snippet.title;
    p.innerText = text;
    p.id = "songDiv"+i;

    //Add a playbutton to this div
    playbtn = document.createElement("button");
    playbtn.id = i;
    playbtn.innerText = "Play";
    playbtn.onclick = function(){
      var sng = this.parentNode.getElementsByTagName("song");
      playaudio(sng[0]);
    }

    //Add song property to this Div
    song = document.createElement("song");
    song.id = "song"+i;
    song.title = text;
    song.setAttribute("data-trackNr",playlist.items[i].snippet.position);
    song.setAttribute("data-url",url);
    song.setAttribute("data-origin",playlist.items[i].snippet.playlistId);

    p.appendChild(playbtn);
    p.appendChild(song);

    document.getElementById("resultplane").appendChild(p);
    cnt = cnt+1;
  }
  document.getElementById("resultplane").setAttribute("data-plsize",cnt);
}

//With Credentials access YT API
function getYTData(searchTerm,credJson,callback){
  var yt = JSON.parse(credJson);

  var type = "playlist";
  //these parameters need to be defined in the url of the GET Request
  //YT_API_KEY is in seperate private JSON

  var params = "part=snippet&q="+searchTerm+"&type="+type+"&key="+yt.YT_API_KEY;

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      //if error, handle else callback function that handles HTTP Response
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
          callback(xmlHttp.responseText);
      //else
        //  alert(xmlHttp.statusText);
  }
  xmlHttp.open("GET", yt.URL_SEARCH+"?"+params, true); // true for asynchronous
  xmlHttp.send(null);
}

function getYTPlaylistData(playlistId,credJson,callback){
  var yt = JSON.parse(credJson);
  //these parameters need to be defined in the url of the GET Request
  //YT_API_KEY is in seperate private JSON

  var params = "part=snippet&playlistId="+playlistId+"&key="+yt.YT_API_KEY;

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      //if error, handle else callback function that handles HTTP Response
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
          callback(xmlHttp.responseText);
      //else
        //  alert(xmlHttp.statusText);
  }
  xmlHttp.open("GET", yt.URL_PLAYLISTITEMS+"?"+params, true); // true for asynchronous
  xmlHttp.send(null);
}

//Do something with the data gotten through searching/YT API
function handleYTData(data){
  console.log(data);
}
