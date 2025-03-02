// ==UserScript==1
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
    
    // 工具函数
    function argsify(data) {
        return typeof data === 'string' ? JSON.parse(data) : data;
    }
    
    function jsonify(data) {
        return JSON.stringify(data);
    }
    
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
            "name": "关于本站-公告",
            "ext": {
                "url": "https://www.czzyvideo.com/gonggao"
            }
        },
        {
            "name": "电影",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
            }
        },
        {
            "name": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "name": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/riju"
            }
        },
        {
            "name": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "name": "番剧",
            "ext": {
                "url": "https://www.czzyvideo.com/fanju"
            }
        },
        {
            "name": "电视剧",
            "ext": {
                "url": "https://www.czzyvideo.com/dsj"
            }
        },
        {
            "name": "国产剧",
            "ext": {
                "url": "https://www.czzyvideo.com/gcj"
            }
        },
        {
            "name": "剧场版",
            "ext": {
                "url": "https://www.czzyvideo.com/dongmanjuchangban"
            }
        },
        {
            "name": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/haiwaijuqita"
            }
        },
        {
            "name": "求片须知",
            "ext": {
                "url": "https://www.czzyvideo.com/wangzhanliuyan"
            }
        },
        {
            "name": "厂长资源备用地址：www.czzy.site 欢迎大家分享给身边朋友！为确保正常观看，请使用谷歌浏览器。",
            "ext": {
                "url": "https://www.czzy.site/"
            }
        },
        {
            "name": "Telegram 官方群：点此加入（需魔法）",
            "ext": {
                "url": "https://t.me/+jY1P9DyaMNozN2M1"
            }
        },
        {
            "name": "关于本站-公告",
            "ext": {
                "url": "https://www.czzyvideo.com/gonggao"
            }
        },
        {
            "name": "电影",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
            }
        },
        {
            "name": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "name": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/riju"
            }
        },
        {
            "name": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "name": "番剧",
            "ext": {
                "url": "https://www.czzyvideo.com/fanju"
            }
        },
        {
            "name": "电视剧",
            "ext": {
                "url": "https://www.czzyvideo.com/dsj"
            }
        },
        {
            "name": "国产剧",
            "ext": {
                "url": "https://www.czzyvideo.com/gcj"
            }
        },
        {
            "name": "剧场版",
            "ext": {
                "url": "https://www.czzyvideo.com/dongmanjuchangban"
            }
        },
        {
            "name": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/haiwaijuqita"
            }
        },
        {
            "name": "求片须知",
            "ext": {
                "url": "https://www.czzyvideo.com/wangzhanliuyan"
            }
        },
        {
            "name": "厂长资源备用地址：www.czzy.site 欢迎大家分享给身边朋友！为确保正常观看，请使用谷歌浏览器。",
            "ext": {
                "url": "https://www.czzy.site/"
            }
        },
        {
            "name": "Telegram 官方群：点此加入（需魔法）",
            "ext": {
                "url": "https://t.me/+jY1P9DyaMNozN2M1"
            }
        },
        {
            "name": "关于本站-公告",
            "ext": {
                "url": "https://www.czzyvideo.com/gonggao"
            }
        },
        {
            "name": "电影",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
            }
        },
        {
            "name": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "name": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/riju"
            }
        },
        {
            "name": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "name": "番剧",
            "ext": {
                "url": "https://www.czzyvideo.com/fanju"
            }
        },
        {
            "name": "电视剧",
            "ext": {
                "url": "https://www.czzyvideo.com/dsj"
            }
        },
        {
            "name": "国产剧",
            "ext": {
                "url": "https://www.czzyvideo.com/gcj"
            }
        },
        {
            "name": "剧场版",
            "ext": {
                "url": "https://www.czzyvideo.com/dongmanjuchangban"
            }
        },
        {
            "name": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/haiwaijuqita"
            }
        },
        {
            "name": "求片须知",
            "ext": {
                "url": "https://www.czzyvideo.com/wangzhanliuyan"
            }
        },
        {
            "name": "厂长资源备用地址：www.czzy.site 欢迎大家分享给身边朋友！为确保正常观看，请使用谷歌浏览器。",
            "ext": {
                "url": "https://www.czzy.site/"
            }
        },
        {
            "name": "Telegram 官方群：点此加入（需魔法）",
            "ext": {
                "url": "https://t.me/+jY1P9DyaMNozN2M1"
            }
        },
        {
            "name": "高分影视",
            "ext": {
                "url": "https://www.czzyvideo.com/gaofenyingshi"
            }
        },
        {
            "name": "华语电影",
            "ext": {
                "url": "https://www.czzyvideo.com/huayudianying"
            }
        },
        {
            "name": "欧美电影",
            "ext": {
                "url": "https://www.czzyvideo.com/oumeidianying"
            }
        },
        {
            "name": "韩国电影",
            "ext": {
                "url": "https://www.czzyvideo.com/hanguodianying"
            }
        },
        {
            "name": "日本电影",
            "ext": {
                "url": "https://www.czzyvideo.com/ribendianying"
            }
        },
        {
            "name": "印度电影",
            "ext": {
                "url": "https://www.czzyvideo.com/yindudianying"
            }
        },
        {
            "name": "俄罗斯电影",
            "ext": {
                "url": "https://www.czzyvideo.com/eluosidianying"
            }
        },
        {
            "name": "加拿大电影",
            "ext": {
                "url": "https://www.czzyvideo.com/jianadadianying"
            }
        },
        {
            "name": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "name": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "name": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/rj"
            }
        },
        {
            "name": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/hwj"
            }
        },
        {
            "name": "高分影视",
            "ext": {
                "url": "https://www.czzyvideo.com/gaofenyingshi"
            }
        },
        {
            "name": "华语电影",
            "ext": {
                "url": "https://www.czzyvideo.com/huayudianying"
            }
        },
        {
            "name": "欧美电影",
            "ext": {
                "url": "https://www.czzyvideo.com/oumeidianying"
            }
        },
        {
            "name": "韩国电影",
            "ext": {
                "url": "https://www.czzyvideo.com/hanguodianying"
            }
        },
        {
            "name": "日本电影",
            "ext": {
                "url": "https://www.czzyvideo.com/ribendianying"
            }
        },
        {
            "name": "印度电影",
            "ext": {
                "url": "https://www.czzyvideo.com/yindudianying"
            }
        },
        {
            "name": "俄罗斯电影",
            "ext": {
                "url": "https://www.czzyvideo.com/eluosidianying"
            }
        },
        {
            "name": "加拿大电影",
            "ext": {
                "url": "https://www.czzyvideo.com/jianadadianying"
            }
        },
        {
            "name": "美剧",
            "ext": {
                "url": "https://www.czzyvideo.com/meijutt"
            }
        },
        {
            "name": "韩剧",
            "ext": {
                "url": "https://www.czzyvideo.com/hanjutv"
            }
        },
        {
            "name": "日剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/rj"
            }
        },
        {
            "name": "海外剧",
            "ext": {
                "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/hwj"
            }
        }
    ]
};
        }
        
        async getConfig() {
            return jsonify(this.appConfig);
        }
        
        async getCards(ext) {
            try {
                ext = argsify(ext);
                const cards = [];
                
                const response = await $fetch.get(ext.url, {
                    headers: {
                        'User-Agent': this.UA
                    }
                });
                const soup = this.cheerio(response.data);
                
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
                
                return jsonify({
                    list: cards
                });
            } catch (e) {
                console.error('getCards error:', e);
                return jsonify({
                    list: []
                });
            }
        }
        
        async getTracks(ext) {
            try {
                ext = argsify(ext);
                const tracks = [];
                
                const response = await $fetch.get(ext.url, {
                    headers: {
                        'User-Agent': this.UA
                    }
                });
                const soup = this.cheerio(response.data);
                
                for (const element of soup.select('.navlist.hidden-md-and-down a')) {
                    const url = element.attr('href');
                    const name = element.text().trim();
                    
                    if (url && name) {
                        tracks.push({
                            name: name,
                            pan: '',
                            ext: {
                                url: url.startsWith('http') ? url : new URL(url, this.appConfig.site).href
                            }
                        });
                    }
                }
                
                return jsonify({
                    list: [{
                        title: '默认',
                        tracks: tracks
                    }]
                });
            } catch (e) {
                console.error('getTracks error:', e);
                return jsonify({
                    list: []
                });
            }
        }
        
        async getPlayinfo(ext) {
            try {
                ext = argsify(ext);
                let url = ext.url;
                
                const response = await $fetch.get(url, {
                    headers: {
                        'User-Agent': this.UA
                    }
                });
                const soup = this.cheerio(response.data);
                
                let playUrl = '';
                const element = soup.select_one('.module-player-box iframe');
                if (element) {
                    playUrl = element.attr('src');
                    if (playUrl && !playUrl.startsWith('http')) {
                        playUrl = new URL(playUrl, this.appConfig.site).href;
                    }
                }
                
                return jsonify({
                    urls: [playUrl],
                    headers: [{
                        'User-Agent': this.UA,
                        'Referer': url
                    }]
                });
            } catch (e) {
                console.error('getPlayinfo error:', e);
                return jsonify({
                    urls: [],
                    headers: []
                });
            }
        }
        
        async search(ext) {
            try {
                ext = argsify(ext);
                const cards = [];
                
                if (!ext.text) {
                    return jsonify({
                        list: cards
                    });
                }
                
                const searchConfig = {"enabled": true, "method": "GET", "url": "https://www.czzyvideo.com/daoyongjiekoshibushiy0ubing", "params": {"key": "q"}};
                if (!searchConfig.enabled) {
                    return jsonify({
                        list: cards
                    });
                }
                
                const searchUrl = searchConfig.url + '?' + new URLSearchParams({
                    [searchConfig.params.key]: ext.text,
                    page: ext.page || 1
                }).toString();
                
                const response = await $fetch.get(searchUrl, {
                    headers: {
                        'User-Agent': this.UA
                    }
                });
                const soup = this.cheerio(response.data);
                
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
                
                return jsonify({
                    list: cards
                });
            } catch (e) {
                console.error('search error:', e);
                return jsonify({
                    list: []
                });
            }
        }
    }
    
    window.JSEnvironment = JSEnvironment;
})();
