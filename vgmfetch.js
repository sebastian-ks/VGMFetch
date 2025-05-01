const { default: axios } = require("axios");
const fs = require("fs");
const { parse } = require("path");
const exec = require("child_process").exec;

var error_prompt = "Usage: \n\t node vgmfetch.js [-d <download-path> <metadata-path>] [--get-unav] <full-playlist-url> <path-to-cred.json>";
//yt = global credentials Object for authorization when using Youtube API
var yt;

var should_download;
var download_dir;
var meta_dir;
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
  if(process.argv.length < 7){
    console.log(error_prompt);
    process.exit(1)
  }
  should_download = true;
  download_dir = process.argv[3];
  meta_dir = process.argv[4];
  url = process.argv[5];
  yt = require(process.argv[6]);
  
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
  let list = require("./"+dir+"/added.json");
  var done = 0;
  var metadata = parse_metadata();

  if(!max){
    console.log(list.length+" track(s) will be downloaded...\n");
    list.forEach((video) =>{
      //console.log("Downloading "+video);
      var dl = yt_dlp(video, metadata);
      dl.on('exit', () => {
        done++;
        if(done == list.length){
          post_dl_checkup();
        }
      });
    })
  }
  else{
    console.log(max+" track(s) will be downloaded...\n");
    for(let i=0;i<list.length;i=i+1){
      if(i < max){
        console.log("Downloading "+list[i]);
        var dl = yt_dlp(list[i], metadata);
        dl.on('exit', () => {
          done++;
          if(done == list.length){
            post_dl_checkup();
          }
        });
      }
      else{
        break;
      }
    }
  }
}

function yt_dlp(video, metadata){
  //TODO: you could just pass flags from this apps cli to yt-dlp, but prob will not change these
  var run = `yt-dlp -P ${download_dir} ${metadata} -x --audio-format flac --audio-quality 0 --embed-thumbnail https://www.youtube.com/watch?v=${video}`;
  //console.log(`[EXEC] ${run}`);
  console.log("Downloading "+video+" ...");

  return exec(run, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    //console.log(`${stdout}`);
    //console.error(`${stderr}`);
    console.log(video+" ...finished");
  });
}

function parse_metadata(){
  tags = require(meta_dir);
  yt_dlp_string = "--postprocessor-args \"ffmpeg:";
  Object.keys(tags).forEach((key) =>{
    tag = tags[key];
    if(!(typeof tag === 'string' || tag instanceof String)){
      /*Disclaimer: While this will technically work
       *ffmpeg will not set stringified json objects as metadata
       *probably because '{' '}' or ':' are illegal characters*/
      tag = json_sanitized(JSON.stringify(tag));
    }
    yt_dlp_string = yt_dlp_string + " -metadata "+key+"="+"'"+tag+"'";
  })

  return yt_dlp_string+"\"";
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
    title = pl_content[video_id]+" ["+video_id+"]"; //This is the filename format used by yt-dlp
    if(!mp3s.includes(title+".mp3") && !mp3s.includes(title+".flac")){
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

function json_sanitized(title){
  return title.replace(/["]/g, '');
}