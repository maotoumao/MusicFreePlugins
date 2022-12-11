function migu(packages) {
  const { axios, cheerio } = packages;

  const searchRows = 20;

  async function searchBase(query, page, type) {
    const headers = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Host': 'm.music.migu.cn',
      'Referer': `https://m.music.migu.cn/v3/search?keyword=${encodeURIComponent(query)}`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68',
      'X-Requested-With': 'XMLHttpRequest'
    };
    const params = {
      keyword: query,
      type,
      pgc: page,
      rows: searchRows
    }
    const data = await axios.get('https://m.music.migu.cn/migu/remoting/scr_search_tag', { headers, params });
    return data.data;
  }

  function musicCanPlayFilter(_) {
    return _.mp3 || _.listenUrl || _.lisQq || _.lisCr;
  }

  async function searchMusic(query, page) {
    const data = await searchBase(query, page, 2);
    const musics = data.musics.filter(musicCanPlayFilter).map(_ => ({
      id: _.id,
      artwork: _.cover,
      title: _.songName,
      artist: _.artist,
      album: _.albumName,
      url: musicCanPlayFilter(_),
      copyrightId: _.copyrightId,
      singerId: _.singerId,
    }))
    return {
      isEnd: (+data.pageNo) * searchRows >= data.pgt,
      data: musics
    };
  }

  async function searchAlbum(query, page) {
    const data = await searchBase(query, page, 4);
    const albums = data.albums.map(_ => ({
      id: _.id,
      artwork: _.albumPicM,
      title: _.title,
      date: _.publishDate,
      artist: (_.singer || []).map(s => s.name).join(','),
      singer: _.singer,
      fullSongTotal: _.fullSongTotal
    }));
    return {
      isEnd: (+data.pageNo) * searchRows >= data.pgt,
      data: albums
    }
  }

  async function searchArtist(query, page) {
    const data = await searchBase(query, page, 1);
    const artists = data.artists.map(result => ({
      name: result.title,
      id: result.id,
      avatar: result.artistPicM,
      worksNum: result.songNum
    }));
    return {
      isEnd: (+data.pageNo) * searchRows >= data.pgt,
      data: artists,
    }
  }

  async function getArtistAlbumWorks(artistItem, page) {
    const headers = {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'connection': 'keep-alive',
      'host': 'music.migu.cn',
      'referer': 'http://music.migu.cn',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
      'Cache-Control': 'max-age=0',
    };
    const html = (await axios.get(`https://music.migu.cn/v3/music/artist/${artistItem.id}/album?page=${page}`, {
      headers
    })).data;
    const $ = cheerio.load(html);
    const rawAlbums = $('div.artist-album-list').find('li');
    const albums = [];
    for (let i = 0; i < rawAlbums.length; ++i) {
      const al = $(rawAlbums[i]);
      const artwork = al.find('.thumb-img').attr('data-original');
      albums.push({
        id: al.find('.album-play').attr('data-id'),
        title: al.find('.album-name').text(),
        artwork: artwork.startsWith('//') ? `https:${artwork}` : artwork,
        date: '',
        artist: artistItem.name
      })
    }

    return {
      isEnd: $('.pagination-next').hasClass('disabled'),
      data: albums
    }
  }

  async function getArtistWorks(artistItem, page, type) {
    if (type === 'music') {
      const headers = {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Host': 'm.music.migu.cn',
        'Referer': `https://m.music.migu.cn/migu/l/?s=149&p=163&c=5123&j=l&id=${artistItem.id}`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68',
        'X-Requested-With': 'XMLHttpRequest'
      };
      //  https://m.music.migu.cn/migu/remoting/cms_artist_detail_tag
      const musicList = (await axios.get('https://m.music.migu.cn/migu/remoting/cms_artist_song_list_tag', {
        headers,
        params: {
          artistId: artistItem.id,
          pageSize: 20,
          pageNo: page - 1
        }
      })).data || {};

      return {
        data: musicList.result.results.filter(musicCanPlayFilter).map(_ => ({
          id: _.songId,
          artwork: _.picM,
          title: _.songName,
          artist: (_.singerName || []).join(', '),
          album: _.albumName,
          url: musicCanPlayFilter(_),
          rawLrc: _.lyricLrc,
          copyrightId: _.copyrightId,
          singerId: _.singerId,
        }))
      }
    } else if (type === 'album') {
      return getArtistAlbumWorks(artistItem, page);
    }
  }

  async function getLyric(musicItem) {
    const headers = {
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Host': 'm.music.migu.cn',
      'Referer': `https://m.music.migu.cn/migu/l/?s=149&p=163&c=5200&j=l&id=${musicItem.copyrightId}`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const result = (await axios.get('https://m.music.migu.cn/migu/remoting/cms_detail_tag', {
      headers,
      params: {
        cpid: musicItem.copyrightId
      }
    })).data;
    return {
      rawLrc: result.data.lyricLrc
    }
  }

  async function importMusicSheet(urlLike) {
    let id;
    if (!id) {
      id = (urlLike.match(/https?:\/\/music\.migu\.cn\/v3\/my\/playlist\/([0-9]+)/) || [])[1];
    }
    if (!id) {
      id = (urlLike.match(/https?:\/\/h5\.nf\.migu\.cn\/app\/v4\/p\/share\/playlist\/index.html\?.*id=([0-9]+)/) || [])[1];
    }
    if (!id) {
      return;
    }

    const headers = {
      host: 'm.music.migu.cn',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://m.music.migu.cn'
    }
    
    const res = (await (axios.get(`https://m.music.migu.cn/migu/remoting/query_playlist_by_id_tag?onLine=1&queryChannel=0&createUserId=migu&contentCountMin=5&playListId=${id}`, {
      headers
    }))).data;
    
    const contentCount = parseInt(res.rsp.playList[0].contentCount);
    const cids = [];

    let pageNo = 1;
    while ((pageNo-1) * 20 < contentCount) {
      const listPage = (await axios.get(`https://music.migu.cn/v3/music/playlist/${id}?page=${pageNo}`)).data;

      const $ = cheerio.load(listPage);

      $('.row.J_CopySong').each((i, v) => cids.push($(v).attr('data-cid')));

      pageNo += 1;
    }
    if(cids.length === 0) {
      return;
    }
    const songs = (await axios({
      url: `https://music.migu.cn/v3/api/music/audioPlayer/songs?type=1&copyrightId=${cids.join(',')}`,
      headers: {
        referer: 'http://m.music.migu.cn/v3'
      },
      xsrfCookieName: 'XSRF-TOKEN',
      withCredentials: true,
    })).data;

    return songs.items.filter(_ => _.vipFlag === 0).map(_ => ({
      id: _.songId,
      artwork: _.cover,
      title: _.songName,
      artist: (_.singers || []).map(_ => _.artistName).join(', '),
      album: ((_.albums || [])[0] || {}).albumName,
      copyrightId: _.copyrightId,
      singerId: ((_.singers || [])[0] || {}).artistId,
    }))

  }

  return {
    platform: '咪咕',
    version: '0.0.3',
    appVersion: ">0.0.1-alpha.10",
    primaryKey: ['id', 'copyrightId'],
    cacheControl: 'no-store',
    srcUrl: 'https://gitee.com/maotoumao/MusicFreePlugins/raw/master/migu.js',
    async getMediaSource(musicItem, quality) { 
      if(quality === 'standard' && musicItem.url) {
        return {
          url: musicItem.url
        }
      };
      let toneFlag = 'HQ';
      if(quality === 'super') {
        toneFlag = 'ZQ';
      } else if(quality === 'high') {
        toneFlag = 'SQ';
      } else if(quality === 'low') {
        toneFlag = 'PQ';
      }
      const resource = (await axios({
        url: `https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?netType=01&resourceType=E&songId=${musicItem.copyrightId}&toneFlag=${toneFlag}`,
        headers: {
          referer: 'http://m.music.migu.cn/v3',
          uid: 123,
          channel: '0146741'
        }
      })).data.data;

      return {
        artwork: musicItem.artwork || ((resource.songItem.albumImgs[0] || {}).img),
        url: resource.url
      };
    },

    async search(query, page, type) {
      if (type === 'music') {
        return await searchMusic(query, page);
      }
      if (type === 'album') {
        return await searchAlbum(query, page);
      }
      if (type === 'artist') {
        return await searchArtist(query, page);
      }

    },

    async getAlbumInfo(albumItem) {
      const headers = {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'Connection': 'keep-alive',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Host': 'm.music.migu.cn',
        'Referer': `https://m.music.migu.cn/migu/l/?record=record&id=${albumItem.id}`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Mobile Safari/537.36 Edg/89.0.774.68',
        'X-Requested-With': 'XMLHttpRequest'
      };
      const musicList = (await axios.get('https://m.music.migu.cn/migu/remoting/cms_album_song_list_tag', {
        headers,
        params: {
          albumId: albumItem.id,
          pageSize: 30
        }
      })).data || {};
      const albumDesc = (await axios.get('https://m.music.migu.cn/migu/remoting/cms_album_detail_tag', {
        headers,
        params: {
          albumId: albumItem.id
        }
      })).data || {}; // 有个trackcount

      return {
        ...albumItem,
        description: albumDesc.albumIntro,
        musicList: musicList.result.results.filter(musicCanPlayFilter).map(_ => ({
          id: _.songId,
          artwork: _.picM,
          title: _.songName,
          artist: (_.singerName || []).join(', '),
          album: albumItem.title,
          url: musicCanPlayFilter(_),
          rawLrc: _.lyricLrc,
          copyrightId: _.copyrightId,
          singerId: _.singerId,
        }))
      }
    },
    getArtistWorks: getArtistWorks,
    getLyric: getLyric,
    importMusicSheet

  };
}