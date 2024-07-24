# VGMFetch
App for Managing my VGM Youtube Music Playlists.
Requires node >= 15

## Resolve 403 Status Error
<code>youtube-mp3-downloader</code> is deprecated because it uses a deprecated version of <code>ytdl-core</code> as of time of [this](https://github.com/fent/node-ytdl-core/issues/1295) issue. 

For a simple hack to fix this just set the <code>ytdl-core</code> version in the <code>package.json</code> of the <code>youtube-mp3-downloader</code> module to latest.
Also go to <code>YoutubeMp3Downloader.js</code> and replace 
```
const ytdl = require('ytdl-core');
```
with
```
const ytdl = require('@distube/ytdl-core');
```

Someone should probably open a PR on the YoutubeMp3Downloader github for this tho...