var assert = require('assert');
var sut = require('../vgmfetch');

describe('testing vgmfetch.js', () =>{

    it('parses metadata and downloads', () => {
        sut.meta_dir = "./test/test_metadata.json";

        metadata = sut.parse_metadata();
        assert.equal(metadata, " --parse-metadata comment:Song Info:{Title:123,Composer:123} --parse-metadata genre:test");

        sut.download_dir = "./test/";
        sut.yt_dlp("vGJBYmQx2vU", metadata);
    });

});