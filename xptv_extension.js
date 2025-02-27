
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
            name: '首页',
            ext: {
                id: 0,
                url: 'https://www.czzyvideo.com',
            },
        },
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
        $('.menu-item.menu-item-type-custom.menu-item-object-custom.current-menu-item.current_page_item.menu-item-33').each((_, element) => {
            const $el = $(element)
            const href = $el.find('a').attr('href')
            const title = $el.find('.jidi').text().trim()
            const cover = $el.find('img').attr('src')
            
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
        
        // 尝试查找播放列表
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
        
        // 尝试查找视频源
        let videoUrl = ''
        $('video source, iframe[src*="player"]').each((_, element) => {
            const src = $(element).attr('src')
            if (src) {
                videoUrl = src.startsWith('http') ? src : `${appConfig.site}${src}`
                return false
            }
        })
        
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
