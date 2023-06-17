const { default: axios } = require("axios");
const fs = require("fs");
const YoutubeMp3Downloader = require("youtube-mp3-downloader");

var error_prompt = "Usage: \n\t node vgmfetch.js [-d <download-path>] [--get-unav] <full-playlist-url> <path-to-cred.json>";
//yt = global credentials Object for authorization when using Youtube API
var yt;
//yd = global downloader Object which can be called
var yd;
var yd_config = {
  "ffmpegPath": "/usr/bin/ffmpeg",        // FFmpeg binary location
                                          // Output file location (default: the home directory)
  "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
  "queueParallelism": 2,                  // Download parallelism (default: 1)
  "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
  "allowWebm": false                      // Enable download from WebM sources (default: false)
}

var should_download;
var download_dir;
var url;
var dir;
var videos = {};
var unav = [];
var get_unav = false;
var total_video_count = 0;


//Arguments
if(process.argv[2] == "--help"){
  console.log(error_prompt);
  process.exit(1);
}

if(process.argv.length < 4){
  console.log(error_prompt);
  process.exit(1);
}

if(process.argv[2] == "-d"){
  if(process.argv.length < 6){
    console.log(error_prompt);
    process.exit(1)
  }
  should_download = true;
  download_dir = process.argv[3];
  url = process.argv[4];
  yt = require(process.argv[5]);
  
}
else if(process.argv[2] == "--get-unav"){
  get_unav = true;
  should_download = false;
  url = process.argv[3];
  yt = require(process.argv[4]);
}
else{
  should_download = false;
  url = process.argv[2];
  yt = require(process.argv[3]);
}
//-----------------------------

create_or_access_space()
  .then((r) =>{
    dir = r;
    if(!should_download){
      get_items()
        .then(() =>{
          console.log("Fetching playlist done\n");
          if(!get_unav){
            check_state();
            console.log("Checkup done\n");
          }
          else{
            //get-unav flag
            console.log("Got "+write_unav_to_file()+" unavailable videos, see "+dir+"/unav.json");
          }
        })
    }
    else{
      console.log("Fetch was dismissed");
      console.log("Starting download to "+download_dir);
      download();
      //post_dl_checkup();
    }
  });
console.log("Done");
/*---------------------------
-------------functions--------
----------------------------*/
function create_or_access_space(){
  return get_title()
    .then((dir) =>{
      console.log("access: " +dir);
      if(!fs.existsSync("./spaceRegistry.json")){
        let new_json = {}
        new_json[url] = dir
        fs.writeFileSync("./spaceRegistry.json", JSON.stringify(new_json));
        fs.mkdirSync(dir);
      }
      else{
        let space_registry = require("./spaceRegistry.json");
        if(space_registry[url] == undefined){
          space_registry[url] = dir;
          fs.mkdirSync(dir);
          fs.writeFileSync("./spaceRegistry.json", JSON.stringify(space_registry));
        }
        //playlistID has a dir but title changed
        else if(space_registry[url] != dir){
          fs.renameSync(space_registry[url], dir);
        }
      }
      return dir;
    });
}

async function get_title(){
  let params = "part=snippet&id="+url+"&key="+yt.YT_API_KEY;
  let resource = yt.URL_PLAYLISTS+"?"+params;
  console.log("[API] "+resource);
  return axios.get(resource)
    .then((resp) =>{
      return sanitized(resp["data"]["items"][0]["snippet"]["title"]); //This is windows bs
    })
    .catch((error) =>{
      console.log("The supplied playlist was not found (make sure it is not private)");
      process.exit(2);
    });
}

function get_items(current_pagenr=0, page_token){
  var params;
  var max_res = 50;
  if(page_token == undefined){
    params = "part=snippet&playlistId="+url+"&maxResults="+max_res+"&key="+yt.YT_API_KEY;
  }
  else{
    params = "part=snippet&playlistId="+url+"&maxResults="+max_res+"&pageToken="+page_token+"&key="+yt.YT_API_KEY;
  }
  let resource = yt.URL_PLAYLISTITEMS+"?"+params;
  console.log("[API] "+resource);
  console.log("Fetching videos "+(current_pagenr*max_res+1) +"-"+((current_pagenr+1)*max_res)+"...");
  return axios.get(resource)
    .then((resp) =>{
      resp["data"]["items"].forEach(element => {
        let vid_title = element["snippet"]["title"];
        if(vid_title != "Private video" && vid_title != "Deleted video"){
          videos[element["snippet"]["resourceId"]["videoId"]] = sanitized(vid_title);
        }
        else{
          unav.push(element["snippet"]["resourceId"]["videoId"]);
        }  
      });

      let next_page_token = resp["data"]["nextPageToken"];
      //Fetch next page, if present
      if(next_page_token != undefined){
        return get_items(current_pagenr+1, next_page_token);
      }
    })
    .catch(function(){
      return;
    });
}

function write_new_videos_to_file(){
  let newadd = fs.createWriteStream("./"+dir+"/added.json");
  let new_count = 0;
  let sep = "";
  newadd.write("[\n");
  Object.keys(videos).forEach((key) =>{
    newadd.write(sep + "\""+key+"\"");
    new_count = new_count +1;
    if(!sep){
      sep = ",\n";
    }
  })
  newadd.write("\n]");
  newadd.end();
  return new_count;
}

function write_videos_to_file(){
  let ids = fs.createWriteStream("./"+dir+"/fetched.json");
  let sep = "";
  ids.write("[\n");
  Object.keys(videos).forEach((key) =>{
    ids.write(sep + "\""+key+"\"");
    total_video_count = total_video_count +1;
    if(!sep){
      sep = ",\n";
    }
  })
  ids.write("\n]");
  ids.end();

  //Write content
  fs.writeFileSync("./"+dir+"/fetched_content.json", JSON.stringify(videos));
}

function write_unav_to_file(){
  let newadd = fs.createWriteStream("./"+dir+"/unav.json");
  let new_count = 0;
  let sep = "";
  newadd.write("[\n");
  unav.forEach((key) =>{
    newadd.write(sep + "\""+key+"\"");
    new_count = new_count +1;
    if(!sep){
      sep = ",\n";
    }
  })
  newadd.write("\n]");
  newadd.end();
  return new_count;
}

function check_state(){

  console.log("Checking your playlist...");
  var lost_writer = fs.createWriteStream("./"+dir+"/lost.json");
  var count_lost = 0;
  var count_new;

  if(!fs.existsSync("./"+dir+"/fetched.json")){
    write_videos_to_file();
  }
  else{
    //compare
    var prev_fetch = require("./"+dir+"/fetched.json")
    var prev_fetch_content = require("./"+dir+"/fetched_content.json")
    write_videos_to_file();
    var checked_id;
    
    for(let i=0;i<prev_fetch.length;i= i+1){
      checked_id = prev_fetch[i];
      if(videos[checked_id] != undefined){
        //Video is still in playlist (since last check)
        delete videos[checked_id];
      }
      else{
        //Video was lost
        count_lost = count_lost + 1;
        lost_writer.write(prev_fetch_content[checked_id]+"\n");
      }
    }
  }
  lost_writer.end();
  count_new = write_new_videos_to_file();

  console.log("[STAT] "+total_video_count+" total");
  console.log("[STAT] "+count_new+" new added");
  console.log("[STAT] "+count_lost+" were lost since last check (see lost.json)");
}

function download(max=null){
  //Downloader config
  yd_config["outputPath"] = download_dir;
  yd = new YoutubeMp3Downloader(yd_config);

  let list = require("./"+dir+"/added.json");
  var last_id = list.slice(-1);

  yd.on("error", function(error){console.log(error)});
  /*yd.on("progress", function(progress){
    process.stdout.write("Progress: " + Math.round(progress["progress"]["percentage"])+"%\r");
  })*/
  yd.on("finished", function(err,data){
    console.log(data["title"]+ " ...finished\n");
    if(data["videoId"] == last_id){
      post_dl_checkup();
    }
  }) 
  //-----

  

  if(!max){
    console.log(list.length+" track(s) will be downloaded...\n");
    list.forEach((video) =>{
      //console.log("Downloading "+video);
      yd.download(video);
    })
  }
  else{
    console.log(max+" track(s) will be downloaded...\n");
    for(let i=0;i<list.length;i=i+1){
      if(i < max){
        console.log("Downloading "+list[i]);
        yd.download(list[i]);
      }
      else{
        break;
      }
    }
  }
}

function post_dl_checkup(){
  console.log("Running post-download checkup...\n");
  var pl_content = require("./"+dir+"/fetched_content.json");
  var added = require("./"+dir+"/added.json");
  var mp3s = fs.readdirSync(download_dir);
  //console.log(mp3s[0]);
  var title;
  var cnt = 0;

  //file for error_ids:
  var error_ids = fs.createWriteStream("./"+dir+"/errors.json");
  var sep = "";
  error_ids.write("[\n");

  added.forEach((video_id) =>{
    title = pl_content[video_id]+".mp3";
    if(!mp3s.includes(title)){
      cnt = cnt +1;
      console.log("- "+title+ " ...missing (videoID: "+video_id+")\n");
      error_ids.write(sep + "\""+video_id+"\"");
      if(!sep){
        sep = ",\n";
      }
    } 
  })
  error_ids.write("\n]");
  error_ids.end();

  console.log(cnt+" Tracks were not downloaded correctly or are unavailable due to copyright takedown, Run download again by adding their videoIDs to the respective added.json file or check avalability of videos");
  console.log("\nFaulty video_ids have been written to "+dir+"/errors.json");
}

function sanitized(title){
  return title.replace(/[/\\?%*:|"<>]/g, '');
}