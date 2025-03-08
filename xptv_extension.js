/**
 * 123AV XPTV 扩展脚本
 * 基于czzy脚本风格重写
 版本 123123123
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
 * 获取视频详情和播放列表
 */
async function getTracks(ext) {
    ext = argsify(ext)
    const { url } = ext
    
    $print("获取视频详情: " + url)
    
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        }
    })
    
    const $ = cheerio.load(data)
    
    // 获取视频标题
    const title = $('h1.title').text().trim() || $('h1').text().trim() || '未知标题'
    
    // 提取视频代码(code)
    const videoCode = url.split('/').pop()
    $print("视频代码: " + videoCode)
    
    // 尝试AJAX请求获取视频链接 - 对某些视频有效
    let javplayerUrl = null
    try {
        const ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoCode}/videos`
        $print("尝试AJAX请求: " + ajaxUrl)
        
        const { data: ajaxData } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': url,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json, text/plain, */*',
                'Priority': 'u=1, i'
            }
        })
        
        if (ajaxData && ajaxData.status === 200 && ajaxData.result) {
            if (ajaxData.result.watch && ajaxData.result.watch.length > 0) {
                javplayerUrl = ajaxData.result.watch[0].url
                $print("从AJAX获取javplayer链接: " + javplayerUrl)
            } else {
                $print("AJAX响应中没有watch链接")
            }
        }
    } catch (e) {
        $print("AJAX请求失败: " + e.message)
    }
    
    // 如果AJAX失败，尝试查找页面中的iframe
    if (!javplayerUrl) {
        $print("尝试从页面中查找iframe")
        const iframe = $('iframe')
        if (iframe.length > 0) {
            const iframeUrl = $(iframe).attr('src')
            if (iframeUrl) {
                let fullIframeUrl = iframeUrl
                if (!iframeUrl.startsWith('http')) {
                    fullIframeUrl = iframeUrl.startsWith('/') 
                        ? `${appConfig.site}${iframeUrl}`
                        : `${appConfig.site}/${iframeUrl}`
                }
                $print("找到iframe: " + fullIframeUrl)
                
                // 尝试获取iframe内容
                try {
                    const { data: iframeData } = await $fetch.get(fullIframeUrl, {
                        headers: {
                            'User-Agent': UA,
                            'Referer': url
                        }
                    })
                    
                    // 查找iframe中的javplayer.me链接
                    const javplayerMatch = iframeData.match(/src=["'](https?:\/\/javplayer\.me\/[^"']+)["']/i)
                    if (javplayerMatch && javplayerMatch[1]) {
                        javplayerUrl = javplayerMatch[1]
                        $print("从iframe获取javplayer链接: " + javplayerUrl)
                    }
                } catch (e) {
                    $print("处理iframe失败: " + e.message)
                }
            }
        }
    }
    
    // 如果前两种方法都失败，直接构造javplayer链接
    if (!javplayerUrl) {
        javplayerUrl = `https://javplayer.me/e/${videoCode}`
        $print("构造默认javplayer链接: " + javplayerUrl)
    }
    
    // 返回播放列表
    return jsonify({
        list: [{
            title: '默认',
            tracks: [{
                name: title,
                ext: {
                    url: javplayerUrl,
                    videoCode: videoCode,
                    referer: url,
                    title: title
                }
            }]
        }]
    })
}

/**
 * 获取播放信息
 */
async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const videoCode = ext.videoCode || url.split('/').pop()
    const referer = ext.referer || appConfig.site
    const title = ext.title || '未知标题'
    
    $print("解析视频播放信息: " + url)
    $print("视频代码: " + videoCode)
    $print("来源页面: " + referer)
    
    // 如果是javplayer.me链接，进行处理
    if (url.includes('javplayer.me')) {
        try {
            // 标准化javplayer URL格式
            if (url.includes('/e/')) {
                url = url.replace('/e/', '/v/')
                $print("转换javplayer URL格式: " + url)
            }
            
            // 获取javplayer页面 - 添加更多有效的请求头
            const { data: playerData } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer,
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Origin': 'https://123av.com',
                    'Priority': 'u=1, i',
                    'Sec-Fetch-Dest': 'iframe',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site'
                }
            })
            
            $print("获取javplayer页面成功")
            
            // 提取javplayer代码
            const playerCode = url.split('/').pop()
            
            // 方法1: 从HTML中查找m3u8链接
            const m3u8Match = playerData.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
            if (m3u8Match && m3u8Match[1]) {
                url = m3u8Match[1]
                $print("从HTML找到m3u8: " + url)
            } else {
                // 方法2: 直接构造流媒体URL
                url = `https://stream.javplayer.me/stream/${playerCode}.m3u8`
                $print("构造m3u8 URL: " + url)
            }
        } catch (e) {
            $print("处理javplayer失败: " + e.message)
            
            // 如果处理失败，尝试直接构造URL
            const playerCode = url.split('/').pop()
            url = `https://stream.javplayer.me/stream/${playerCode}.m3u8`
            $print("错误处理中构造备用URL: " + url)
        }
    } else if (!url.includes('.m3u8') && !url.includes('.mp4')) {
        // 如果不是媒体URL，直接构造
        url = `https://stream.javplayer.me/stream/${videoCode}.m3u8`
        $print("构造媒体URL: " + url)
    }
    
    // 返回最终URL和请求头 - 使用代理非常重要
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': 'https://javplayer.me/',
            'Origin': 'https://javplayer.me',
            'Accept': '*/*',
            'Range': 'bytes=0-',
            'Connection': 'keep-alive'
        }],
        useProxy: true, // 启用代理很关键
        title: title
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
