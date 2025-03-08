/**
 * 123AV XPTV 扩展脚本
 * 基于czzy脚本风格重写
 版本 2
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

/**
 * 优化javplayer.me播放链接处理
 */
async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const videoCode = ext.videoCode
    const referer = ext.referer || appConfig.site
    const isJavPlayer = ext.isJavPlayer || url.includes('javplayer.me')
    
    $print("获取播放信息URL: " + url)
    
    // 处理javplayer.me的URL
    if (isJavPlayer) {
        $print("处理javplayer链接: " + url)
        
        // 转换javplayer URL格式 - 从/e/到/v/格式
        // 例如从 https://javplayer.me/e/8J5DLZOK 转换为 https://javplayer.me/v/8J5DLZOK
        if (url.includes('/e/')) {
            url = url.replace('/e/', '/v/')
            $print("转换为javplayer /v/ 格式: " + url)
        }
        
        try {
            // 发送请求到javplayer获取视频数据
            const { data: playerData } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer,
                    'sec-ch-ua': '"Google Chrome";v="118", "Chromium";v="118"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                }
            })
            
            const $player = cheerio.load(playerData)
            let videoUrl = ''
            
            // 方法1: 查找直接的m3u8链接
            // 通常javplayer会在HTML中包含m3u8链接
            const rawHtml = playerData.toString()
            const m3u8Matches = rawHtml.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/ig)
            if (m3u8Matches && m3u8Matches.length > 0) {
                // 提取引号内的URL
                const cleanUrl = m3u8Matches[0].replace(/['"]/g, '')
                videoUrl = cleanUrl
                $print("从HTML中提取m3u8链接: " + videoUrl)
            }
            
            // 方法2: 查找video源
            if (!videoUrl) {
                const videoSrc = $player('video source').attr('src')
                if (videoSrc) {
                    videoUrl = videoSrc
                    $print("从video标签获取源: " + videoUrl)
                }
            }
            
            // 方法3: 查找初始化变量
            if (!videoUrl) {
                // 查找类似 var video = {url:"https://..."}; 的模式
                const videoVarMatch = rawHtml.match(/var\s+video\s*=\s*(\{[^}]+\})/i)
                if (videoVarMatch && videoVarMatch[1]) {
                    try {
                        // 尝试解析JSON对象
                        const videoObj = JSON.parse(videoVarMatch[1].replace(/'/g, '"'))
                        if (videoObj && videoObj.url) {
                            videoUrl = videoObj.url
                            $print("从video变量获取URL: " + videoUrl)
                        }
                    } catch (e) {
                        $print("解析video变量失败: " + e.message)
                    }
                }
            }
            
            // 方法4: 从Rapidgator链接提取
            if (!videoUrl) {
                // 截图显示有Rapidgator链接，可能与实际视频相关
                const rapidgatorMatch = rawHtml.match(/"(https:\/\/rapidgator\.net\/file\/[^"]+)"/i)
                if (rapidgatorMatch && rapidgatorMatch[1]) {
                    // 尝试从Rapidgator链接推导出视频URL
                    const rapidUrl = rapidgatorMatch[1]
                    $print("找到Rapidgator链接: " + rapidUrl)
                    
                    // 有些网站会将Rapidgator文件ID转换为视频URL
                    const fileId = rapidUrl.split('/').pop()
                    if (fileId) {
                        // 尝试构造可能的视频URL
                        const possibleUrls = [
                            `https://stream.javplayer.me/stream/${fileId}.m3u8`,
                            `https://cdn.javplayer.me/stream/${fileId}.m3u8`,
                            `https://javplayer.me/stream/${fileId}.m3u8`
                        ]
                        
                        // 依次尝试可能的URL
                        for (const possibleUrl of possibleUrls) {
                            try {
                                $print("尝试推导的URL: " + possibleUrl)
                                const { data: testData } = await $fetch.get(possibleUrl, {
                                    headers: { 'User-Agent': UA, 'Referer': url }
                                })
                                
                                // 检查是否是有效的m3u8内容
                                if (typeof testData === 'string' && 
                                    (testData.includes('#EXTM3U') || testData.startsWith('http'))) {
                                    videoUrl = possibleUrl
                                    $print("找到有效的m3u8地址: " + videoUrl)
                                    break
                                }
                            } catch (e) {
                                // 继续尝试下一个
                            }
                        }
                    }
                }
            }
            
            if (videoUrl) {
                url = videoUrl
            }
        } catch (e) {
            $print("处理javplayer出错: " + e.message)
        }
    }
    
    // 如果URL仍然是javplayer链接但无法提取实际视频，尝试再次请求原始API
    if (url.includes('javplayer.me') && videoCode) {
        $print("尝试再次请求原始API获取直接URL")
        const ajaxUrl = `${appConfig.site}/zh/api/v/${videoCode}/play`
        try {
            const { data: apiData } = await $fetch.get(ajaxUrl, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            
            if (apiData && apiData.url) {
                url = apiData.url
                $print("获取到直接播放URL: " + url)
            }
        } catch (e) {
            $print("API请求失败: " + e.message)
        }
    }
    
    // 确保最终URL是正确的格式
    if (!url || url === ext.url || url.includes('javplayer.me/e/') || url.includes('javplayer.me/v/')) {
        $print("警告: 未能获取到有效的播放URL，使用默认URL")
        // 最后尝试直接构造可能的m3u8地址
        if (url.includes('javplayer.me')) {
            const playerCode = url.split('/').pop()
            url = `https://stream.javplayer.me/stream/${playerCode}.m3u8`
            $print("构造直接m3u8地址: " + url)
        }
    }
    
    $print("最终返回播放URL: " + url)
    
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': url.includes('javplayer.me') ? 'https://javplayer.me/' : referer,
            'Origin': url.includes('javplayer.me') ? 'https://javplayer.me' : appConfig.site,
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
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
