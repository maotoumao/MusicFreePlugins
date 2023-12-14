"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const cheerio_1 = require("cheerio");
const CryptoJS = require("crypto-js");
const searchRows = 20;
const host="http://tv.zanlagua.com/";
async function getTopLists() {
        
    const html = await axios_1.default.get(host+"gettoplist.php");
   const obj=html.data;
   return [eval('(' + obj + ')')];
    
}

async function getTopListDetail(topListItem) {
    const data = await axios_1.default.get(host+"gettoplistdetail.php?id="+topListItem.id);
    return eval('(' + data.data + ')');
}

async function getMediaSource(musicItem, quality) {
      
     return{
      url: musicItem.url,
     };
}

module.exports = {
  /** 鐢ㄦ潵璇存槑鎻掍欢淇℃伅鐨勫睘鎬� */
  platform: "鎴戠殑FM", // 鎻掍欢鍚�
  version: "1.0.9", // 鎻掍欢鐗堟湰鍙�
  hints: {
        importMusicSheet: [
            "鎴戠殑FM鐢靛彴锛岃嚜宸辨敹钘�",

        ],
    },
    primaryKey: ["id"],
    cacheControl: "no-cache",
    srcUrl: "http://tv.zanlagua.com/cj.js",
  /** 渚涚粰杞欢鍦ㄥ悎閫傜殑鏃舵満璋冪敤鐨勫嚱鏁� */

  getTopLists,
  getTopListDetail,
  getMediaSource,
};


// getTopListDetail({
//     "id": "45",
//     "title": "河北",
//     "coverImg": "https://p1.img.cctvpic.com/photoAlbum/photo/2023/12/08/PHOTuZMldPN9drRaCpb3f5Zu231208_1000x2000.jpg",
// },).then(console.log)

// getMediaSource({
//     platform: '我的FM',
//     id: '4454',
//     artist: '河北',
//     title: ' 滦平新闻频道',
//     album: '河北',
//     artwork: 'https://p1.img.cctvpic.com/photoAlbum/photo/2023/12/08/PHOTuZMldPN9drRaCpb3f5Zu231208_1000x2000.jpg',
//     url: 'rtmp://live.lpxrmtzx.com/live/wh?zhebd'
//   }).then(console.log)