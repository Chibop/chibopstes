
// 自动生成的XPTV扩展脚本

const cheerio = createCheerio()

// 设置User Agent
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'

// 应用配置
let appConfig = {
    ver: 1,
    title: '自动生成站点',
    site: 'https://www.czzyvideo.com',
    tabs: [
        {
                "name": "首页",
                "ext": {
                        "id": 0,
                        "url": "https://www.czzyvideo.com"
                }
        },
        {
                "name": "电影",
                "ext": {
                        "id": 1,
                        "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
                }
        },
        {
                "name": "美剧",
                "ext": {
                        "id": 2,
                        "url": "https://www.czzyvideo.com/meijutt"
                }
        },
        {
                "name": "日剧",
                "ext": {
                        "id": 3,
                        "url": "https://www.czzyvideo.com/riju"
                }
        },
        {
                "name": "韩剧",
                "ext": {
                        "id": 4,
                        "url": "https://www.czzyvideo.com/hanjutv"
                }
        },
        {
                "name": "番剧",
                "ext": {
                        "id": 5,
                        "url": "https://www.czzyvideo.com/fanju"
                }
        },
        {
                "name": "电视剧",
                "ext": {
                        "id": 6,
                        "url": "https://www.czzyvideo.com/dsj"
                }
        },
        {
                "name": "国产剧",
                "ext": {
                        "id": 7,
                        "url": "https://www.czzyvideo.com/gcj"
                }
        },
        {
                "name": "剧场版",
                "ext": {
                        "id": 8,
                        "url": "https://www.czzyvideo.com/dongmanjuchangban"
                }
        },
        {
                "name": "海外剧",
                "ext": {
                        "id": 9,
                        "url": "https://www.czzyvideo.com/haiwaijuqita"
                }
        },
        {
                "name": "电影",
                "ext": {
                        "id": 1,
                        "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/dyy"
                }
        },
        {
                "name": "美剧",
                "ext": {
                        "id": 2,
                        "url": "https://www.czzyvideo.com/meijutt"
                }
        },
        {
                "name": "日剧",
                "ext": {
                        "id": 3,
                        "url": "https://www.czzyvideo.com/riju"
                }
        },
        {
                "name": "韩剧",
                "ext": {
                        "id": 4,
                        "url": "https://www.czzyvideo.com/hanjutv"
                }
        },
        {
                "name": "番剧",
                "ext": {
                        "id": 5,
                        "url": "https://www.czzyvideo.com/fanju"
                }
        },
        {
                "name": "电视剧",
                "ext": {
                        "id": 6,
                        "url": "https://www.czzyvideo.com/dsj"
                }
        },
        {
                "name": "国产剧",
                "ext": {
                        "id": 7,
                        "url": "https://www.czzyvideo.com/gcj"
                }
        },
        {
                "name": "剧场版",
                "ext": {
                        "id": 8,
                        "url": "https://www.czzyvideo.com/dongmanjuchangban"
                }
        },
        {
                "name": "海外剧",
                "ext": {
                        "id": 9,
                        "url": "https://www.czzyvideo.com/haiwaijuqita"
                }
        },
        {
                "name": "高分影视",
                "ext": {
                        "id": 0,
                        "url": "https://www.czzyvideo.com/gaofenyingshi"
                }
        },
        {
                "name": "华语电影",
                "ext": {
                        "id": 1,
                        "url": "https://www.czzyvideo.com/huayudianying"
                }
        },
        {
                "name": "欧美电影",
                "ext": {
                        "id": 2,
                        "url": "https://www.czzyvideo.com/oumeidianying"
                }
        },
        {
                "name": "韩国电影",
                "ext": {
                        "id": 3,
                        "url": "https://www.czzyvideo.com/hanguodianying"
                }
        },
        {
                "name": "日本电影",
                "ext": {
                        "id": 4,
                        "url": "https://www.czzyvideo.com/ribendianying"
                }
        },
        {
                "name": "印度电影",
                "ext": {
                        "id": 5,
                        "url": "https://www.czzyvideo.com/yindudianying"
                }
        },
        {
                "name": "俄罗斯电影",
                "ext": {
                        "id": 6,
                        "url": "https://www.czzyvideo.com/eluosidianying"
                }
        },
        {
                "name": "加拿大电影",
                "ext": {
                        "id": 7,
                        "url": "https://www.czzyvideo.com/jianadadianying"
                }
        },
        {
                "name": "美剧",
                "ext": {
                        "id": 8,
                        "url": "https://www.czzyvideo.com/meijutt"
                }
        },
        {
                "name": "韩剧",
                "ext": {
                        "id": 9,
                        "url": "https://www.czzyvideo.com/hanjutv"
                }
        },
        {
                "name": "日剧",
                "ext": {
                        "id": 10,
                        "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/rj"
                }
        },
        {
                "name": "海外剧",
                "ext": {
                        "id": 11,
                        "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/hwj"
                }
        },
        {
                "name": "高分影视",
                "ext": {
                        "id": 0,
                        "url": "https://www.czzyvideo.com/gaofenyingshi"
                }
        },
        {
                "name": "华语电影",
                "ext": {
                        "id": 1,
                        "url": "https://www.czzyvideo.com/huayudianying"
                }
        },
        {
                "name": "欧美电影",
                "ext": {
                        "id": 2,
                        "url": "https://www.czzyvideo.com/oumeidianying"
                }
        },
        {
                "name": "韩国电影",
                "ext": {
                        "id": 3,
                        "url": "https://www.czzyvideo.com/hanguodianying"
                }
        },
        {
                "name": "日本电影",
                "ext": {
                        "id": 4,
                        "url": "https://www.czzyvideo.com/ribendianying"
                }
        },
        {
                "name": "印度电影",
                "ext": {
                        "id": 5,
                        "url": "https://www.czzyvideo.com/yindudianying"
                }
        },
        {
                "name": "俄罗斯电影",
                "ext": {
                        "id": 6,
                        "url": "https://www.czzyvideo.com/eluosidianying"
                }
        },
        {
                "name": "加拿大电影",
                "ext": {
                        "id": 7,
                        "url": "https://www.czzyvideo.com/jianadadianying"
                }
        },
        {
                "name": "美剧",
                "ext": {
                        "id": 8,
                        "url": "https://www.czzyvideo.com/meijutt"
                }
        },
        {
                "name": "韩剧",
                "ext": {
                        "id": 9,
                        "url": "https://www.czzyvideo.com/hanjutv"
                }
        },
        {
                "name": "日剧",
                "ext": {
                        "id": 10,
                        "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/rj"
                }
        },
        {
                "name": "海外剧",
                "ext": {
                        "id": 11,
                        "url": "https://www.czzyvideo.com/movie_bt/movie_bt_series/hwj"
                }
        }
],
}

// 获取配置信息
async function getConfig() {
    return JSON.stringify(appConfig)
}

// 获取视频卡片列表
async function getCards(ext) {
    try {
        ext = JSON.parse(ext)
        let cards = []
        
        const {data} = await axios.get(ext.url, {
            headers: {
                'User-Agent': UA,
            },
        })
        
        const $ = cheerio.load(data)
        $('.bt_img li').each((_, element) => {
            const $el = $(element)
            const href = $el.find('.bt_img li a').attr('href')
            const title = $el.find('.bt_img li h3.dytit').text().trim()
            const cover = $el.find('img[data-src]').attr('data-src') || $el.find('img[data-src]').attr('data-original') || $el.find('img[data-src]').attr('src')
            
            if (href && title) {
                cards.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: '',
                    ext: {
                        url: href.startsWith('http') ? href : `${appConfig.site}${href}`,
                    },
                })
            }
        })

        return JSON.stringify({
            list: cards,
        })
    } catch (error) {
        console.log('getCards error:', error)
        return JSON.stringify({
            list: [],
        })
    }
}

// 获取视频播放列表
async function getTracks(ext) {
    try {
        ext = JSON.parse(ext)
        let tracks = []
        
        const {data} = await axios.get(ext.url, {
            headers: {
                'User-Agent': UA,
            },
        })
        
        const $ = cheerio.load(data)
        
        $('a[href*="play"], a[href*="video"]').each((_, element) => {
            const $el = $(element)
            const url = $el.attr('href')
            const name = $el.text().trim()
            
            if (url && name) {
                tracks.push({
                    name: name,
                    pan: '',
                    ext: {
                        url: url.startsWith('http') ? url : `${appConfig.site}${url}`,
                    },
                })
            }
        })

        return JSON.stringify({
            list: [{
                title: '默认分组',
                tracks,
            }],
        })
    } catch (error) {
        console.log('getTracks error:', error)
        return JSON.stringify({
            list: [],
        })
    }
}

// 获取播放信息
async function getPlayinfo(ext) {
    try {
        ext = JSON.parse(ext)
        
        const {data} = await axios.get(ext.url, {
            headers: {
                'User-Agent': UA,
            },
        })
        
        const $ = cheerio.load(data)
        
        let videoUrl = ''
        $('iframe, video source').each((_, element) => {
            const src = $(element).attr('src')
            if (src) {
                videoUrl = src.startsWith('http') ? src : `${appConfig.site}${src}`
                return false
            }
        })
        
        // 如果没有找到直接的视频源，尝试获取iframe内容
        if (!videoUrl && $('iframe').length > 0) {
            const jsurl = $('iframe').attr('src')
            if (jsurl) {
                try {
                    const jsres = await axios.get(jsurl.startsWith('http') ? jsurl : `${appConfig.site}${jsurl}`, {
                        headers: {
                            'User-Agent': UA,
                            'Referer': ext.url
                        },
                    })
                    
                    const $2 = cheerio.load(jsres.data)
                    const videoSrc = $2('video source').attr('src') || $2('iframe').attr('src')
                    if (videoSrc) {
                        videoUrl = videoSrc.startsWith('http') ? videoSrc : `${jsurl.split('/').slice(0, 3).join('/')}${videoSrc}`
                    }
                } catch (err) {
                    console.log('获取iframe内容失败:', err)
                }
            }
        }
        
        return JSON.stringify({
            url: videoUrl,
        })
    } catch (error) {
        console.log('getPlayinfo error:', error)
        return JSON.stringify({
            url: '',
        })
    }
}
