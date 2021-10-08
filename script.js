function t(){
  document.getElementById("headline").innerHTML = "ERSETZT!";

  //document.write("YOOOO");
}

function albumview(){
  document.getElementById("albums_all").style.display = "block";
  document.getElementById("albums_playlists").style.display = "block";
  document.getElementById("albums_compilations").style.display = "block";
}

function search(){
  //Credentials for the Search; Configure this File if you want to apply filters to the search
  let search_cred = "YTcred.json";
  //----------------------------------
  getAPICredentials(document.getElementById("searchField").value, search_cred,getYTData);
}
/*-------------------------------------------------------------------------------------------------------------------
  The following 3 functions are executed one after another asynchronously by calling the next method via callback
-------------------------------------------------------------------------------------------------------------------*/
//Get the JSON file for the YT API Credentials from local server
function getAPICredentials(searchTerm, search_cred,callback){
    //Object with credentials for API Connection
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        //if error, handle else callback function that handles HTTP Response
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(searchTerm,xmlHttp.responseText,handleYTData);
        //else
          //  alert(xmlHttp.statusText);
    }
    xmlHttp.open("GET",search_cred,true);
    xmlHttp.send(null);
}

//With Credentials access YT API
function getYTData(searchTerm,credJson,callback){
  var yt = JSON.parse(credJson);

  //these parameters need to be defined in the url of the GET Request
  //YT_API_KEY is in seperate private JSON
  var params = yt.searchfor+searchTerm+"&key="+yt.YT_API_KEY;

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
      //if error, handle else callback function that handles HTTP Response
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
          callback(xmlHttp.responseText);
      //else
        //  alert(xmlHttp.statusText);
  }
  xmlHttp.open("GET", yt.URL+"?"+params, true); // true for asynchronous
  xmlHttp.send(null);
}

//Do something with the data gotten through searching/YT API
function handleYTData(data){
  console.log(data);
}
