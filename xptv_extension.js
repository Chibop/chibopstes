/**
 * 123AV XPTV 扩展脚本
 * 基于czzy脚本风格重写
 */

const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '123AV',
    site: 'https://123av.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    // 直接定义标签，也可以后续改为从网站动态获取
    return [
        {
            name: '最近更新',
            ext: {
                url: `${appConfig.site}/zh/dm5`,
                page: 1
            },
        },
        {
            name: '热门视频',
            ext: {
                url: `${appConfig.site}/zh/dm2/trending`,
                page: 1
            },
        },
        {
            name: '今日热门',
            ext: {
                url: `${appConfig.site}/zh/dm2/today-hot`,
                page: 1
            },
        },
        {
            name: '已审查',
            ext: {
                url: `${appConfig.site}/zh/dm2/censored`,
                page: 1
            },
        },
        {
            name: '未审查',
            ext: {
                url: `${appConfig.site}/zh/dm3/uncensored`,
                page: 1
            },
        }
    ]
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    if (page > 1) {
        url += `?page=${page}`
    }

    $print("请求URL: " + url)

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        },
    })

    const $ = cheerio.load(data)

    $('.box-item').each((_, element) => {
        const title = $(element).find('.detail a').text().trim()
        const link = $(element).find('.detail a').attr('href')
        const image = $(element).find('.thumb img').attr('data-src') || $(element).find('.thumb img').attr('src')
        const remarks = $(element).find('.duration').text().trim()
        
        if (link && title) {
            cards.push({
                vod_id: link,
                vod_name: title,
                vod_pic: image,
                vod_remarks: remarks,
                ext: {
                    url: `${appConfig.site}${link}`
                },
            })
        }
    })

    $print("找到卡片数量: " + cards.length)
    
    // 处理分页
    const hasNext = $('.pagination .page-item:last-child').hasClass('disabled') === false
    
    return jsonify({
        list: cards,
        nextPage: hasNext ? page + 1 : null
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    const { url } = ext
    
    $print("获取播放列表URL: " + url)
    
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        },
    })
    
    const html = data
    const $ = cheerio.load(html)
    
    const title = $('h1.title').text().trim() || '默认标题'
    
    // 查找视频播放地址
    let videoUrl = ''
    
    try {
        // 尝试从页面脚本中提取视频URL
        const scriptContents = $('script')
        
        for (let i = 0; i < scriptContents.length; i++) {
            const scriptText = $(scriptContents[i]).html() || ''
            if (scriptText.includes('window.videos')) {
                const match = scriptText.match(/window\.videos\s*=\s*(\[.+?\])/s)
                if (match && match[1]) {
                    try {
                        const videos = JSON.parse(match[1])
                        if (videos && videos.length > 0 && videos[0].url) {
                            videoUrl = videos[0].url
                            $print("成功从脚本中提取视频URL: " + videoUrl)
                            break
                        }
                    } catch (e) {
                        $print("解析JSON出错: " + e.message)
                    }
                }
            }
        }
        
        // 如果没找到视频URL，尝试查找iframe
        if (!videoUrl) {
            const iframe = $('iframe')
            if (iframe.length > 0) {
                const iframeSrc = iframe.attr('src')
                if (iframeSrc) {
                    $print("找到iframe，URL: " + iframeSrc)
                    // 可以根据需要进一步处理iframe
                }
            }
        }
    } catch (e) {
        $print("提取视频URL出错: " + e.message)
    }
    
    let tracks = [{
        name: title,
        ext: {
            url: videoUrl || url
        }
    }]
    
    return jsonify({
        list: [
            {
                title: '默认线路',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    
    $print("获取播放信息URL: " + url)
    
    // 如果URL是123av网站的URL，需要再次解析获取实际视频URL
    if (url.includes('123av.com')) {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site
            },
        })
        
        const $ = cheerio.load(data)
        
        try {
            // 尝试从页面脚本中提取视频URL
            const scriptContents = $('script')
            
            for (let i = 0; i < scriptContents.length; i++) {
                const scriptText = $(scriptContents[i]).html() || ''
                if (scriptText.includes('window.videos')) {
                    const match = scriptText.match(/window\.videos\s*=\s*(\[.+?\])/s)
                    if (match && match[1]) {
                        try {
                            const videos = JSON.parse(match[1])
                            if (videos && videos.length > 0 && videos[0].url) {
                                url = videos[0].url
                                $print("成功从详情页提取视频URL: " + url)
                                break
                            }
                        } catch (e) {
                            $print("解析JSON出错: " + e.message)
                        }
                    }
                }
            }
            
            // 如果还没有找到视频URL，尝试从video标签获取
            if (url === ext.url) {
                const videoTag = $('video source')
                if (videoTag.length > 0) {
                    const src = videoTag.attr('src')
                    if (src) {
                        url = src
                        $print("从video标签获取URL: " + url)
                    }
                }
            }
        } catch (e) {
            $print("解析视频地址出错: " + e.message)
        }
    }
    
    return jsonify({ 
        urls: [url],
        headers: [{'User-Agent': UA, 'Referer': appConfig.site}]
    })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []
    const { wd, page = 1 } = ext
    
    // 构建搜索URL
    const searchUrl = `${appConfig.site}/zh/search?q=${encodeURIComponent(wd)}&page=${page}`
    $print("搜索URL: " + searchUrl)
    
    const { data } = await $fetch.get(searchUrl, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        },
    })
    
    const $ = cheerio.load(data)
    
    $('.box-item').each((_, element) => {
        const title = $(element).find('.detail a').text().trim()
        const link = $(element).find('.detail a').attr('href')
        const image = $(element).find('.thumb img').attr('data-src') || $(element).find('.thumb img').attr('src')
        const remarks = $(element).find('.duration').text().trim()
        
        if (link && title) {
            cards.push({
                vod_id: link,
                vod_name: title,
                vod_pic: image,
                vod_remarks: remarks,
                ext: {
                    url: `${appConfig.site}${link}`
                },
            })
        }
    })
    
    $print("搜索结果数量: " + cards.length)
    
    // 处理分页
    const hasNext = $('.pagination .page-item:last-child').hasClass('disabled') === false
    
    return jsonify({
        list: cards,
        nextPage: hasNext ? page + 1 : null
    })
} 
