# VGMFetch
App for managing Youtube Music Playlists. Checks video deltas and downloads them.

Requires node >= 15 (maybe higher) and [yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation#with-pip) installation

## Usage
Type
```
	node vgmfetch --help
```

Usually you first fetch the deltas like
```
	node vgmfetch <playlist-url> ./credentials.json 
```
- **\<playlist-url>** will just be the list parameter, so just the **id** in the full url after "**...&list=...**"
- You also need to put a valid youtube api key in the [credentials.json](credentials.json)

Then the deltas will be recorded and you can download them like
```
	node vgmfetch -d <download-path> <metadata-path> <playlist-url> ./credentials.json 
```

Metadata files describe in json what data is put as the standard mp3-type metadata for all files you download. There is no pattern matching on the basis of the downloaded video data or anything yet

The default metadata that will be set if not specified otherwise in a metadata file is always
- **title**: The title of the youtube video
- **album**: The folder name of the directory at the end of the **\<download-path>** arg
