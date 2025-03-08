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
            let fullUrl = ''
            if (link.startsWith('http')) {
                fullUrl = link
            } else if (link.startsWith('/zh/')) {
                fullUrl = `${appConfig.site}${link}`
            } else if (link.startsWith('/')) {
                fullUrl = `${appConfig.site}/zh${link}`
            } else {
                fullUrl = `${appConfig.site}/zh/${link}`
            }
            
            cards.push({
                vod_id: link,
                vod_name: title,
                vod_pic: image,
                vod_remarks: remarks,
                ext: {
                    url: fullUrl
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
        }
    })
    
    const $ = cheerio.load(data)
    const title = $('h1.title').text().trim() || '默认标题'
    
    // 提取视频代码(code)
    const urlParts = url.split('/')
    const videoCode = urlParts[urlParts.length - 1]
    $print("视频代码: " + videoCode)
    
    // 使用正确的AJAX接口获取视频信息
    const ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoCode}/videos`
    $print("请求AJAX URL: " + ajaxUrl)
    
    let videoUrl = ''
    try {
        const { data: ajaxData } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': url,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        
        $print("获取到AJAX数据: " + JSON.stringify(ajaxData))
        
        // 从AJAX响应中提取视频URL
        if (ajaxData && ajaxData.status === 200 && ajaxData.result && ajaxData.result.watch && ajaxData.result.watch.length > 0) {
            videoUrl = ajaxData.result.watch[0].url
            $print("从AJAX获取到视频URL: " + videoUrl)
        }
    } catch (e) {
        $print("AJAX请求失败: " + e.message)
        // 如果AJAX请求失败，尝试其他方法
    }
    
    // 返回播放信息
    return jsonify({
        list: [{
            title: '默认',
            tracks: [{
                name: title,
                ext: {
                    url: videoUrl || url,
                    videoCode: videoCode,
                    referer: url,
                    isJavPlayer: videoUrl.includes('javplayer.me')
                }
            }]
        }]
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const videoCode = ext.videoCode
    const referer = ext.referer || appConfig.site
    const isJavPlayer = ext.isJavPlayer
    
    $print("获取播放信息URL: " + url)
    
    // 处理javplayer.me的URL
    if (isJavPlayer && url.includes('javplayer.me')) {
        $print("处理javplayer链接")
        
        try {
            // 获取javplayer页面内容
            const { data: playerData } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer
                }
            })
            
            const $player = cheerio.load(playerData)
            
            // 查找直接的视频URL
            const videoSrc = $player('video source').attr('src')
            if (videoSrc) {
                url = videoSrc
                $print("从javplayer获取到video源: " + url)
            } else {
                // 从脚本中提取
                const scripts = $player('script')
                for (let i = 0; i < scripts.length; i++) {
                    const script = $player(scripts[i]).html() || ''
                    
                    // 尝试多种模式查找URL
                    const patterns = [
                        /source\s*=\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /src\s*=\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /file\s*:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i
                    ]
                    
                    for (const pattern of patterns) {
                        const match = script.match(pattern)
                        if (match && match[1]) {
                            url = match[1]
                            $print("从javplayer脚本中提取URL: " + url)
                            break
                        }
                    }
                    
                    if (url !== ext.url) break // 如果已找到新URL则跳出循环
                }
            }
        } catch (e) {
            $print("处理javplayer出错: " + e.message)
        }
    }
    
    // 如果仍然没有找到视频URL，尝试再次请求AJAX接口
    if (url === ext.url && videoCode) {
        const ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoCode}/videos`
        try {
            const { data: ajaxData } = await $fetch.get(ajaxUrl, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            
            if (ajaxData && ajaxData.status === 200 && ajaxData.result && ajaxData.result.watch && ajaxData.result.watch.length > 0) {
                url = ajaxData.result.watch[0].url
                $print("再次从AJAX获取视频URL: " + url)
                
                // 递归处理javplayer URL
                if (url.includes('javplayer.me')) {
                    return getPlayinfo({
                        ...ext,
                        url: url,
                        isJavPlayer: true
                    })
                }
            }
        } catch (e) {
            $print("再次请求AJAX失败: " + e.message)
        }
    }
    
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': referer,
            'Origin': appConfig.site,
            'Range': 'bytes=0-'
        }]
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
            let fullUrl = ''
            if (link.startsWith('http')) {
                fullUrl = link
            } else if (link.startsWith('/zh/')) {
                fullUrl = `${appConfig.site}${link}`
            } else if (link.startsWith('/')) {
                fullUrl = `${appConfig.site}/zh${link}`
            } else {
                fullUrl = `${appConfig.site}/zh/${link}`
            }
            
            cards.push({
                vod_id: link,
                vod_name: title,
                vod_pic: image,
                vod_remarks: remarks,
                ext: {
                    url: fullUrl
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
