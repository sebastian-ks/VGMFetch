/*Use this function if you wish to create a custom Tag*/
function createCustomTag(name,func){
  document.createElement(name)
  var tags = document.getElementsByTagName(name);
  for(var i=0;i<tags.length;i++){
    func(tags[i]);
  }
}

function songAttributes(tag){
  tag.setAttribute("data-trackNr");
  tag.setAttribute("data-url");
  tag.setAttribute("data-origin");
}

//Tags
createCustomTag("song",songAttributes);
