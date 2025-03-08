/**
 * 123AV XPTV 扩展脚本
 * 基于czzy脚本风格重写
 测试 11111
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

/**
 * 根据网站DOM结构精确获取导航标签
 */
async function getTabs() {
    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        }
    })
    
    $print("获取首页导航标签")
    
    const $ = cheerio.load(data)
    let tabs = []
    
    try {
        // 根据截图，导航菜单在id为"nav"的ul元素中
        $('#nav li a').each((_, element) => {
            const name = $(element).text().trim()
            const link = $(element).attr('href')
            
            // 过滤掉JavaScript链接和无效链接
            if (link && name && !link.includes('javascript:') && !link.includes('#')) {
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
                
                tabs.push({
                    name: name,
                    ext: {
                        url: fullUrl,
                        page: 1
                    }
                })
            }
        })
        
        $print(`从#nav找到${tabs.length}个标签`)
        
        // 如果没找到足够的标签，尝试另一个选择器 - 根据截图显示可能有has-child show类
        if (tabs.length < 3) {
            $('.has-child.show li a').each((_, element) => {
                const name = $(element).text().trim()
                const link = $(element).attr('href')
                
                if (link && name && !link.includes('javascript:') && !link.includes('#') && 
                    !tabs.some(tab => tab.name === name)) {
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
                    
                    tabs.push({
                        name: name,
                        ext: {
                            url: fullUrl,
                            page: 1
                        }
                    })
                }
            })
            
            $print(`从.has-child.show找到${tabs.length}个标签`)
        }
    } catch (e) {
        $print("动态提取导航失败: " + e.message)
    }
    
    // 如果仍然没有足够的标签，尝试根据DOM截图中显示的具体链接
    if (tabs.length < 3) {
        $print("尝试根据截图中显示的具体导航项获取")
        
        // 根据截图中显示的具体a标签
        const menuLinks = [
            { name: "审查", url: "/dm2/censored" },
            { name: "最近更新", url: "/dm2/recent-update" },
            { name: "新发布", url: "/dm2/new-release" },
            { name: "未审查", url: "/dm3/uncensored" },
            { name: "泄露未审查", url: "/dm2/uncensored-leaked" },
            { name: "VR", url: "/dm2/vr" },
            { name: "热门女演员", url: "/actresses?sort=most_viewed_today" },
            { name: "热门", url: "/dm2/trending" },
            { name: "今天最多观看", url: "/dm2/today-hot" },
            { name: "本周最多观看", url: "/dm2/weekly-hot" },
            { name: "本月最多观看", url: "/dm2/monthly-hot" }
        ]
        
        for (const item of menuLinks) {
            if (!tabs.some(tab => tab.name === item.name)) {
                tabs.push({
                    name: item.name,
                    ext: {
                        url: `${appConfig.site}/zh${item.url}`,
                        page: 1
                    }
                })
            }
        }
    }
    
    // 仍然保留默认标签作为最后的备用
    if (tabs.length < 3) {
        $print("使用默认标签")
        tabs = [
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
    
    $print(`最终获取到${tabs.length}个标签`)
    return tabs
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

/**
 * 多阶段视频地址提取方案
 */
async function getTracks(ext) {
    ext = argsify(ext)
    const { url } = ext
    
    $print("获取视频页面: " + url)
    
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        }
    })
    
    const $ = cheerio.load(data)
    const title = $('h1.title').text().trim() || '默认标题'
    
    // 提取视频代码(code)
    const videoCode = url.split('/').pop()
    $print("视频代码: " + videoCode)
    
    let videoUrl = null
    
    // 阶段1: 尝试查找iframe
    const iframeUrl = $('iframe').attr('src')
    if (iframeUrl) {
        let fullIframeUrl = iframeUrl
        if (!iframeUrl.startsWith('http')) {
            fullIframeUrl = iframeUrl.startsWith('/') 
                ? `${appConfig.site}${iframeUrl}`
                : `${appConfig.site}/${iframeUrl}`
        }
        
        $print("找到iframe: " + fullIframeUrl)
        
        // 获取iframe内容
        try {
            const { data: iframeData } = await $fetch.get(fullIframeUrl, {
                headers: {
                    'User-Agent': UA,
                    'Referer': url
                }
            })
            
            const $iframe = cheerio.load(iframeData)
            
            // 查找iframe中的视频播放器
            // 1. 检查是否包含javplayer.me链接
            const javplayerMatch = iframeData.match(/src=["'](https?:\/\/javplayer\.me\/[^"']+)["']/i)
            if (javplayerMatch && javplayerMatch[1]) {
                videoUrl = javplayerMatch[1]
                $print("在iframe中找到javplayer链接: " + videoUrl)
            }
            
            // 2. 检查iframe中的video标签
            if (!videoUrl) {
                const videoSrc = $iframe('video source').attr('src')
                if (videoSrc) {
                    videoUrl = videoSrc
                    $print("在iframe中找到video源: " + videoUrl)
                }
            }
        } catch (e) {
            $print("处理iframe失败: " + e.message)
        }
    }
    
    // 阶段2: 尝试从页面脚本中提取视频信息
    if (!videoUrl) {
        // 查找页面中的所有脚本
        $('script').each((_, script) => {
            const scriptContent = $(script).html() || ''
            
            // 查找window.videos初始化
            const videosMatch = scriptContent.match(/window\.videos\s*=\s*(\[.*?\]);/s)
            if (videosMatch && videosMatch[1]) {
                try {
                    const videos = JSON.parse(videosMatch[1])
                    if (videos && videos.length > 0 && videos[0].url) {
                        videoUrl = videos[0].url
                        $print("从window.videos找到URL: " + videoUrl)
                    }
                } catch (e) {
                    $print("解析window.videos失败: " + e.message)
                }
            }
            
            // 查找其他可能的视频变量
            if (!videoUrl) {
                const urlMatch = scriptContent.match(/videoUrl\s*=\s*["']([^"']+)["']/i)
                if (urlMatch && urlMatch[1]) {
                    videoUrl = urlMatch[1]
                    $print("从videoUrl变量找到URL: " + videoUrl)
                }
            }
        })
    }
    
    // 阶段3: 尝试在HTML中直接查找m3u8链接
    if (!videoUrl) {
        const m3u8Match = data.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
        if (m3u8Match && m3u8Match[1]) {
            videoUrl = m3u8Match[1]
            $print("直接从HTML中找到m3u8链接: " + videoUrl)
        }
    }
    
    // 返回结果
    return jsonify({
        list: [{
            title: '默认',
            tracks: [{
                name: title,
                ext: {
                    url: videoUrl || url,
                    videoCode: videoCode,
                    referer: url
                }
            }]
        }]
    })
}

/**
 * 改进的视频解析函数
 */
async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const videoCode = ext.videoCode
    const referer = ext.referer || appConfig.site
    
    $print("解析视频URL: " + url)
    
    // 如果是javplayer.me链接，进行特殊处理
    if (url.includes('javplayer.me')) {
        try {
            // 获取javplayer页面
            const { data: playerData } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer,
                    'Accept': 'text/html,application/xhtml+xml,application/xml'
                }
            })
            
            $print("获取到javplayer页面，长度: " + playerData.length)
            
            // 提取javplayer代码
            const playerCode = url.split('/').pop()
            let streamUrl = null
            
            // 方法1: 直接从HTML中查找m3u8链接
            const m3u8Match = playerData.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
            if (m3u8Match && m3u8Match[1]) {
                streamUrl = m3u8Match[1]
                $print("从javplayer HTML找到m3u8: " + streamUrl)
            }
            
            // 方法2: 从video标签提取src
            if (!streamUrl) {
                const $player = cheerio.load(playerData)
                const videoSrc = $player('video source').attr('src')
                if (videoSrc) {
                    streamUrl = videoSrc
                    $print("从javplayer video标签找到源: " + streamUrl)
                }
            }
            
            // 方法3: 根据playerCode直接构造流媒体URL
            if (!streamUrl) {
                // 尝试不同的格式组合
                const possibleUrls = [
                    `https://stream.javplayer.me/stream/${playerCode}.m3u8`,
                    `https://stream.javplayer.me/hls/${playerCode}.m3u8`,
                    `https://cdn.javplayer.me/stream/${playerCode}.m3u8`
                ]
                
                for (const testUrl of possibleUrls) {
                    try {
                        $print("尝试构造的URL: " + testUrl)
                        const { data: testData } = await $fetch.get(testUrl, {
                            headers: {
                                'User-Agent': UA,
                                'Referer': url
                            }
                        })
                        
                        if (typeof testData === 'string' && testData.includes('#EXTM3U')) {
                            streamUrl = testUrl
                            $print("构造的URL可用: " + streamUrl)
                            break
                        }
                    } catch (e) {
                        // 继续尝试下一个
                    }
                }
            }
            
            // 如果找到了流媒体URL，使用它
            if (streamUrl) {
                url = streamUrl
            }
        } catch (e) {
            $print("处理javplayer失败: " + e.message)
        }
    }
    
    // 最终检查URL是否是m3u8格式，不是则尝试添加后缀
    if (url && !url.includes('.m3u8') && !url.includes('.mp4')) {
        // 如果URL是javplayer但不是直接视频格式，尝试构造
        if (url.includes('javplayer.me')) {
            const playerCode = url.split('/').pop()
            url = `https://stream.javplayer.me/stream/${playerCode}.m3u8`
            $print("最终构造m3u8 URL: " + url)
        }
    }
    
    // 返回最终URL和请求头
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': url.includes('javplayer.me') ? url : referer,
            'Origin': url.includes('javplayer.me') ? 'https://javplayer.me' : appConfig.site,
            'Accept': '*/*',
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
