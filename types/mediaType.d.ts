/** 音乐 */
declare namespace IMusic {
  interface IMusicItem {
    /** 插件名 */
    platform?: string;
    /** 唯一id */
    id: string | number;
    /** 作者 */
    artist: string;
    /** 标题 */
    title: string;
    /** 时长(s) */
    duration: number;
    /** 专辑名 */
    album: string;
    /** 专辑封面图 */
    artwork: string;
    /** 默认音源 */
    url?: string;
    /** 歌词URL */
    lrc?: string;
    /** 歌词 */
    rawLrc?: string;
    /** 音质信息 */
    qualities?: IMusic.IQuality;
    // TODO: 在这里补充完整类型
    [k: string | number]: any;
  }
}

/** 专辑 */
declare namespace IAlbum {
  interface IAlbumItem {
    /** 插件名 */
    platform?: string;
    /** 唯一id */
    id: string | number;
    /** 作者 */
    artist: string;
    /** 标题 */
    title: string;
    /** 专辑封面图 */
    artwork: string;
    /** 日期YYYY-MM-DD */
    date: string;
    /** 描述文本 */
    description?: string;
    // TODO: 在这里补充完整类型
    [k: string | number]: any;
  }

  interface IAlbumInfoResult {
    isEnd?: boolean;
    albumItem?: Partial<IAlbum.IAlbumItem>;
    musicList?: IMusic.IMusicItem[];
  }
}

/** 作者 */
declare namespace IArtist {
  interface IArtistItem {
    /** 插件名 */
    platform?: string;
    /** 唯一id */
    id: string | number;
    /** 姓名 */
    name: string;
    /** 粉丝数 */
    fans?: number;
    /** 简介 */
    description?: string;
    /** 头像 */
    avatar?: string;
    /** 作品数目 */
    worksNum?: number;
    // TODO: 在这里补充完整类型
    [k: string | number]: any;
  }
}
