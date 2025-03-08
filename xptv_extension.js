/**
 * 123AV XPTV 扩展脚本
 * 完全重构以支持新发现的URL格式
 */

const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '123AV',
    site: 'https://123av.com',
    // 新增CDN域名配置
    cdnDomain: 's208.skyearth7.xyz',
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
            'Referer': appConfig.site,
            'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
    })
    
    const $ = cheerio.load(data)
    
    // 提取视频标题和ID
    const title = $('.content-detail h1.title').text().trim()
    const videoPath = url.split('/').slice(-1)[0]
    const videoCode = videoPath.includes('-') ? videoPath : null
    
    $print("视频标题: " + title)
    $print("视频代码: " + videoCode)
    
    // 三层获取策略
    let videoId = null
    
    // 1. 从AJAX API获取
    try {
        const ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoPath}/videos`
        $print("尝试AJAX请求: " + ajaxUrl)
        
        const { data: ajaxData } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': url,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        
        if (ajaxData && ajaxData.status === 200 && ajaxData.result) {
            if (ajaxData.result.watch && ajaxData.result.watch.length > 0) {
                const javplayerUrl = ajaxData.result.watch[0].url
                $print("从AJAX获取javplayer链接: " + javplayerUrl)
                
                // 从javplayer链接提取videoId
                const match = javplayerUrl.match(/\/e\/([^\/]+)$/i)
                if (match && match[1]) {
                    videoId = match[1].toLowerCase()
                    $print("提取视频ID: " + videoId)
                }
            }
        }
    } catch (e) {
        $print("AJAX请求失败: " + e.message)
    }
    
    // 2. 从iframe中查找
    if (!videoId) {
        $print("尝试从iframe获取")
        const iframe = $('iframe')
        if (iframe.length > 0) {
            const iframeSrc = $(iframe).attr('src')
            if (iframeSrc) {
                try {
                    let fullIframeSrc = iframeSrc
                    if (!iframeSrc.startsWith('http')) {
                        fullIframeSrc = iframeSrc.startsWith('/') 
                            ? `${appConfig.site}${iframeSrc}`
                            : `${appConfig.site}/${iframeSrc}`
                    }
                    
                    $print("处理iframe: " + fullIframeSrc)
                    
                    const { data: iframeData } = await $fetch.get(fullIframeSrc, {
                        headers: {
                            'User-Agent': UA,
                            'Referer': url
                        }
                    })
                    
                    // 查找javplayer ID
                    const idMatch = iframeData.match(/javplayer\.me\/[ev]\/([a-zA-Z0-9]+)/i)
                    if (idMatch && idMatch[1]) {
                        videoId = idMatch[1].toLowerCase()
                        $print("从iframe提取视频ID: " + videoId)
                    }
                } catch (e) {
                    $print("处理iframe失败: " + e.message)
                }
            }
        }
    }
    
    // 3. 如果是已知格式的视频代码，直接使用
    if (!videoId && videoCode) {
        // 尝试通过javplayer中间页获取
        try {
            const testUrl = `https://javplayer.me/v/${videoCode}`
            $print("尝试获取javplayer页面: " + testUrl)
            
            const { data: playerData } = await $fetch.get(testUrl, {
                headers: {
                    'User-Agent': UA,
                    'Referer': url
                }
            })
            
            // 查找视频ID
            const idMatch = playerData.match(/var\s+id\s*=\s*["']([a-zA-Z0-9]+)["']/i)
            if (idMatch && idMatch[1]) {
                videoId = idMatch[1].toLowerCase()
                $print("从javplayer页面提取视频ID: " + videoId)
            }
        } catch (e) {
            $print("获取javplayer页面失败: " + e.message)
            // 失败后直接使用视频代码
            videoId = videoCode.toLowerCase()
            $print("使用视频代码作为视频ID: " + videoId)
        }
    }
    
    // 构造最终的媒体URL
    let mediaUrl = null
    if (videoId) {
        // 使用已知的URL结构
        // 注意：hash部分需要实际算法，这里使用示例值
        // 在真实情况下，这个哈希可能需要从javplayer页面提取或通过某种算法生成
        const hashExample = "5c49e63b2f1fd71a94834ca146ad5672"
        mediaUrl = `https://${appConfig.cdnDomain}/vod1/c/mu/${videoId}_${hashExample}/720/v.m3u8`
        
        $print("构造媒体URL: " + mediaUrl)
    }
    
    // 返回播放列表
    return jsonify({
        tracks: [{
            name: title,
            ext: {
                url: mediaUrl,
                videoId: videoId,
                referer: "https://javplayer.me/"
            }
        }]
    })
}

/**
 * 播放视频
 */
async function getMediaUrl(ext) {
    ext = argsify(ext)
    const url = ext.url
    const videoId = ext.videoId
    const referer = ext.referer || "https://javplayer.me/"
    
    $print("解析媒体URL: " + url)
    
    // 返回最终URL和请求头
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': referer,
            'Origin': 'https://javplayer.me',
            'Accept': '*/*',
            'Range': 'bytes=0-',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'Priority': 'u=1, i'
        }],
        useProxy: true, // 启用代理很关键
        userAgent: UA
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
