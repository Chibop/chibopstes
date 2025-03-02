// ==UserScript==
// @name         XPTV扩展 - 厂长资源 – 厂长影视官网 | 超清视频站
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动生成的XPTV扩展脚本
// @author       XPTV
// @match        https://www.czzyvideo.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    class JSEnvironment {
        constructor() {
            this.cheerio = createCheerio();
            this.UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
            this.appConfig = {
    "ver": 1,
    "title": "厂长资源 – 厂长影视官网 | 超清视频站",
    "site": "https://www.czzyvideo.com",
    "tabs": [
        {
            "title": "关于本站-公告",
            "ext": {
                "url": "https://www.czzyvideo.com/gonggao"
            }
        },
        {
            "title": "电影",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
            }
        },
        {
            "title": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "title": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/riju"
            }
        },
        {
            "title": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "title": "番剧",
            "ext": {
                "url": "https://www.czzyvideo.com/fanju"
            }
        },
        {
            "title": "电视剧",
            "ext": {
                "url": "https://www.czzyvideo.com/dsj"
            }
        },
        {
            "title": "国产剧",
            "ext": {
                "url": "https://www.czzyvideo.com/gcj"
            }
        },
        {
            "title": "剧场版",
            "ext": {
                "url": "https://www.czzyvideo.com/dongmanjuchangban"
            }
        },
        {
            "title": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/haiwaijuqita"
            }
        },
        {
            "title": "求片须知",
            "ext": {
                "url": "https://www.czzyvideo.com/wangzhanliuyan"
            }
        },
        {
            "title": "厂长资源备用地址：www.czzy.site 欢迎大家分享给身边朋友！为确保正常观看，请使用谷歌浏览器。",
            "ext": {
                "url": "https://www.czzy.site/"
            }
        },
        {
            "title": "Telegram 官方群：点此加入（需魔法）",
            "ext": {
                "url": "https://t.me/+jY1P9DyaMNozN2M1"
            }
        },
        {
            "title": "关于本站-公告",
            "ext": {
                "url": "https://www.czzyvideo.com/gonggao"
            }
        },
        {
            "title": "电影",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
            }
        },
        {
            "title": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "title": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/riju"
            }
        },
        {
            "title": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "title": "番剧",
            "ext": {
                "url": "https://www.czzyvideo.com/fanju"
            }
        },
        {
            "title": "电视剧",
            "ext": {
                "url": "https://www.czzyvideo.com/dsj"
            }
        },
        {
            "title": "国产剧",
            "ext": {
                "url": "https://www.czzyvideo.com/gcj"
            }
        },
        {
            "title": "剧场版",
            "ext": {
                "url": "https://www.czzyvideo.com/dongmanjuchangban"
            }
        },
        {
            "title": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/haiwaijuqita"
            }
        },
        {
            "title": "求片须知",
            "ext": {
                "url": "https://www.czzyvideo.com/wangzhanliuyan"
            }
        },
        {
            "title": "厂长资源备用地址：www.czzy.site 欢迎大家分享给身边朋友！为确保正常观看，请使用谷歌浏览器。",
            "ext": {
                "url": "https://www.czzy.site/"
            }
        },
        {
            "title": "Telegram 官方群：点此加入（需魔法）",
            "ext": {
                "url": "https://t.me/+jY1P9DyaMNozN2M1"
            }
        },
        {
            "title": "关于本站-公告",
            "ext": {
                "url": "https://www.czzyvideo.com/gonggao"
            }
        },
        {
            "title": "电影",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
            }
        },
        {
            "title": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "title": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/riju"
            }
        },
        {
            "title": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "title": "番剧",
            "ext": {
                "url": "https://www.czzyvideo.com/fanju"
            }
        },
        {
            "title": "电视剧",
            "ext": {
                "url": "https://www.czzyvideo.com/dsj"
            }
        },
        {
            "title": "国产剧",
            "ext": {
                "url": "https://www.czzyvideo.com/gcj"
            }
        },
        {
            "title": "剧场版",
            "ext": {
                "url": "https://www.czzyvideo.com/dongmanjuchangban"
            }
        },
        {
            "title": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/haiwaijuqita"
            }
        },
        {
            "title": "求片须知",
            "ext": {
                "url": "https://www.czzyvideo.com/wangzhanliuyan"
            }
        },
        {
            "title": "厂长资源备用地址：www.czzy.site 欢迎大家分享给身边朋友！为确保正常观看，请使用谷歌浏览器。",
            "ext": {
                "url": "https://www.czzy.site/"
            }
        },
        {
            "title": "Telegram 官方群：点此加入（需魔法）",
            "ext": {
                "url": "https://t.me/+jY1P9DyaMNozN2M1"
            }
        },
        {
            "title": "高分影视",
            "ext": {
                "url": "https://www.czzyvideo.com/gaofenyingshi"
            }
        },
        {
            "title": "华语电影",
            "ext": {
                "url": "https://www.czzyvideo.com/huayudianying"
            }
        },
        {
            "title": "欧美电影",
            "ext": {
                "url": "https://www.czzyvideo.com/oumeidianying"
            }
        },
        {
            "title": "韩国电影",
            "ext": {
                "url": "https://www.czzyvideo.com/hanguodianying"
            }
        },
        {
            "title": "日本电影",
            "ext": {
                "url": "https://www.czzyvideo.com/ribendianying"
            }
        },
        {
            "title": "印度电影",
            "ext": {
                "url": "https://www.czzyvideo.com/yindudianying"
            }
        },
        {
            "title": "俄罗斯电影",
            "ext": {
                "url": "https://www.czzyvideo.com/eluosidianying"
            }
        },
        {
            "title": "加拿大电影",
            "ext": {
                "url": "https://www.czzyvideo.com/jianadadianying"
            }
        },
        {
            "title": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "title": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "title": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/rj"
            }
        },
        {
            "title": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/hwj"
            }
        },
        {
            "title": "高分影视",
            "ext": {
                "url": "https://www.czzyvideo.com/gaofenyingshi"
            }
        },
        {
            "title": "华语电影",
            "ext": {
                "url": "https://www.czzyvideo.com/huayudianying"
            }
        },
        {
            "title": "欧美电影",
            "ext": {
                "url": "https://www.czzyvideo.com/oumeidianying"
            }
        },
        {
            "title": "韩国电影",
            "ext": {
                "url": "https://www.czzyvideo.com/hanguodianying"
            }
        },
        {
            "title": "日本电影",
            "ext": {
                "url": "https://www.czzyvideo.com/ribendianying"
            }
        },
        {
            "title": "印度电影",
            "ext": {
                "url": "https://www.czzyvideo.com/yindudianying"
            }
        },
        {
            "title": "俄罗斯电影",
            "ext": {
                "url": "https://www.czzyvideo.com/eluosidianying"
            }
        },
        {
            "title": "加拿大电影",
            "ext": {
                "url": "https://www.czzyvideo.com/jianadadianying"
            }
        },
        {
            "title": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "title": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "title": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/rj"
            }
        },
        {
            "title": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/hwj"
            }
        }
    ]
};
        }
        
        async getConfig() {
            return JSON.stringify(this.appConfig);
        }
        
        async getCards(ext) {
            try {
                const extData = JSON.parse(ext);
                const cards = [];
                
                const response = await fetch(extData.url, {
                    headers: {
                        'User-Agent': this.UA
                    }
                });
                const html = await response.text();
                const soup = this.cheerio(html);
                
                for (const element of soup.select('.bt_img li')) {
                    const href = element.select_one('.bt_img li a')?.attr('href');
                    const title = element.select_one('.title')?.text().trim();
                    const img = element.select_one('img[data-src]');
                    const cover = img?.attr('data-src') || img?.attr('data-original') || img?.attr('src');
                    
                    if (href && title) {
                        cards.push({
                            vod_id: href,
                            vod_name: title,
                            vod_pic: cover,
                            vod_remarks: '',
                            ext: {
                                url: href.startsWith('http') ? href : new URL(href, this.appConfig.site).href
                            }
                        });
                    }
                }
                
                return JSON.stringify({
                    list: cards
                });
            } catch (e) {
                console.error('getCards error:', e);
                return JSON.stringify({
                    list: []
                });
            }
        }
    }
    
    window.JSEnvironment = JSEnvironment;
})();
