type WithMusicList<T> = T & {
  musicList?: IMusic.IMusicItem[];
};

declare namespace ICommon {
  export type SupportMediaType = "music" | "album" | "artist" | 'sheet';
  export type SupportMediaItemBase = {
    music: Partial<IMusic.IMusicItem>;
    album: Partial<IAlbum.IAlbumItem>;
    artist: Partial<IArtist.IArtistItem>;
    sheet: Partial<IMusicSheet.IMusicSheetItem>;

  };
  export type IMediaBase = {
    id: string;
    platform: string;
    [k: string]: any;
  };
}

declare namespace IMusic {
  type IQualityKey = "low" | "standard" | "high" | "super";
  type IQuality = Record<
    IQualityKey,
    {
      url?: string;
      size?: string | number;
    }
  >;
}

declare namespace ILyric {
  interface ILyricSource {
    lrc?: string;
    rawLrc?: string;
  }
}

declare namespace IMusicSheet {
  interface IMusicSheetItem {
    /** 封面图 */
    coverImg?: string;
    /** 标题 */
    title: string;
    /** 歌单id */
    id: string;
    /** 描述 */
    description: string;
    [k: string]: any;
  }

  interface IMusicTopListGroupItem {
    /** 分组标题 */
    title?: string;
    /** 数据 */
    data: Array<IMusicSheetItem>;
  }
}

declare namespace IPlugin {
  type ICacheControl = "cache" | "no-cache" | "no-store";
  interface ISearchResult<T extends ICommon.SupportMediaType> {
    isEnd?: boolean;
    data: ICommon.SupportMediaItemBase[T][];
  }
  type ISearchFunc = <T extends ICommon.SupportMediaType>(
    query: string,
    page: number,
    type: T
  ) => Promise<ISearchResult<T>>;

  interface ISearchResult<T extends ICommon.SupportMediaType> {
    isEnd?: boolean;
    data: ICommon.SupportMediaItemBase[T][];
  }

  interface IMediaSourceResult {
    headers?: Record<string, string>;
    /** 兜底播放 */
    url?: string;
    /** UA */
    userAgent?: string;
    /** 音质 */
    quality?: IMusic.IQualityKey;
  }

  interface IUserVariable {
    /** 变量键名 */
    key: string;
    /** 变量名 */
    name?: string;
}


  interface IPluginDefine {
    /** 插件名 */
    platform: string;
    /** 匹配的版本号 */
    appVersion?: string;
    /** 插件版本 */
    version?: string;
    /** 远程更新的url */
    srcUrl?: string;
    /** 主键，会被存储到mediameta中 */
    primaryKey?: string[];
    /** 默认搜索类型 */
    defaultSearchType?: ICommon.SupportMediaType;
    /** 插件缓存控制 */
    cacheControl?: ICacheControl;
    /** 用户自定义输入 */
    userVariables?: IUserVariable[];
    /** 搜索 */
    search?: ISearchFunc;
    /** 获取根据音乐信息获取url */
    getMediaSource?: (
      musicItem: IMusic.IMusicItem,
      quality: IMusic.IQualityKey
    ) => Promise<IMediaSourceResult | null>;
    /** 根据主键去查询歌曲信息 */
    getMusicInfo?: (
      musicBase: ICommon.IMediaBase
    ) => Promise<Partial<IMusic.IMusicItem> | null>;
    /** 获取歌词 */
    getLyric?: (
      musicItem: IMusic.IMusicItem
    ) => Promise<ILyric.ILyricSource | null>;
    /** 获取专辑信息，里面的歌曲分页 */
    getAlbumInfo?: (
      albumItem: IAlbum.IAlbumItem,
      page: number
    ) => Promise<IAlbum.IAlbumInfoResult | null>;
    /** 获取作品，有分页 */
    getArtistWorks?: <T extends Exclude<ICommon.SupportMediaType, "artist">>(
      artistItem: IArtist.IArtistItem,
      page: number,
      type: T
    ) => Promise<ISearchResult<T>>;
    /** 导入歌单 */
    importMusicSheet?: (urlLike: string) => Promise<IMusic.IMusicItem[] | null>;
    /** 导入单曲 */
    importMusicItem?: (urlLike: string) => Promise<IMusic.IMusicItem | null>;
    /** 获取榜单 */
    getTopLists?: () => Promise<IMusicSheet.IMusicTopListGroupItem[]>;
    /** 获取榜单详情 */
    getTopListDetail?: (
      topListItem: IMusicSheet.IMusicSheetItem
    ) => Promise<WithMusicList<IMusicSheet.IMusicSheetItem>>;
  }
}
