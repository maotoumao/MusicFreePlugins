import axios from "axios";

const pageSize = 20;

function formatMusicItem(it){
    return {
        id: it.photo.id,
        title: it.photo.caption,
        artist: it.author.name,
        artwork: it.photo.coverUrl || it.photo.photoUrl,
        manifest: it.photo.manifest
    }
}

async function searchMusic(query, page) {
  const body = {
    query: `fragment photoContent on PhotoEntity {
        __typename
        id
        duration
        caption
        originCaption
        likeCount
        viewCount
        commentCount
        realLikeCount
        coverUrl
        photoUrl
        photoH265Url
        manifest
        manifestH265
        videoResource
        coverUrls {
          url
          __typename
        }
        timestamp
        expTag
        animatedCoverUrl
        distance
        videoRatio
        liked
        stereoType
        profileUserTopPhoto
        musicBlocked
      }
      
      fragment recoPhotoFragment on recoPhotoEntity {
        __typename
        id
        duration
        caption
        originCaption
        likeCount
        viewCount
        commentCount
        realLikeCount
        coverUrl
        photoUrl
        photoH265Url
        manifest
        manifestH265
        videoResource
        coverUrls {
          url
          __typename
        }
        timestamp
        expTag
        animatedCoverUrl
        distance
        videoRatio
        liked
        stereoType
        profileUserTopPhoto
        musicBlocked
      }
      
      fragment feedContent on Feed {
        type
        author {
          id
          name
          headerUrl
          following
          headerUrls {
            url
            __typename
          }
          __typename
        }
        photo {
          ...photoContent
          ...recoPhotoFragment
          __typename
        }
        canAddComment
        llsid
        status
        currentPcursor
        tags {
          type
          name
          __typename
        }
        __typename
      }
      
      query visionSearchPhoto($keyword: String, $pcursor: String, $searchSessionId: String, $page: String, $webPageArea: String) {
        visionSearchPhoto(keyword: $keyword, pcursor: $pcursor, searchSessionId: $searchSessionId, page: $page, webPageArea: $webPageArea) {
          result
          llsid
          webPageArea
          feeds {
            ...feedContent
            __typename
          }
          searchSessionId
          pcursor
          aladdinBanner {
            imgUrl
            link
            __typename
          }
          __typename
        }
      }`,
    variables: {
      keyword: query,
      page: "search",
      pcursor: `${page - 1}`,
    },
  };
  const result = (await axios.post("https://www.kuaishou.com/graphql", body)).data.data.visionSearchPhoto;
  return {
    isEnd: !result?.pcursor || result?.pcursor === 'no_more',
    data: result?.feeds?.map?.(formatMusicItem) 
  }
}


module.exports = {
  platform: "快手",
  version: "0.0.1",
  author: '猫头猫',
  srcUrl:
    "https://gitee.com/maotoumao/MusicFreePlugins/raw/v0.1/dist/kuaishou/index.js",
  cacheControl: "no-cache",
  supportedSearchType: ["music"],
  async search(query, page, type) {
    if (type === "music") {
      return await searchMusic(query, page);
    }
  },
  async getMediaSource(musicItem, quality: IMusic.IQualityKey) {
    if(!musicItem.manifest) {
        return;
    }
    const adaptationSet = musicItem.manifest.adaptationSet;
    const representation = adaptationSet[0].representation;
    return {
        url: representation[0].url
    };

  },
};


// searchMusic('夜曲', 1).then(e => console.log(e.data[1].manifest.adaptationSet[0].representation));