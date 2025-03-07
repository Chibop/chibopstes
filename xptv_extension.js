/**
 * 123AV XPTV 扩展脚本1112
 * 基于czzy脚本风格重写 111
 1231231
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
    
    // 提取视频代码(code)，通常为URL最后部分，如orecs-278
    const urlParts = url.split('/')
    const videoCode = urlParts[urlParts.length - 1]
    $print("视频代码: " + videoCode)
    
    // 在页面中查找包含videos数据的脚本
    let videoUrl = ''
    let videoData = null
    
    try {
        // 方法1: 查找windows.videos定义
        const scripts = $('script')
        for (let i = 0; i < scripts.length; i++) {
            const scriptContent = $(scripts[i]).html() || ''
            
            // 查找window.videos
            if (scriptContent.includes('window.videos')) {
                const match = scriptContent.match(/window\.videos\s*=\s*(\[.*?\]);/s)
                if (match && match[1]) {
                    try {
                        const videos = JSON.parse(match[1])
                        if (videos && videos.length > 0) {
                            videoData = videos[0]
                            videoUrl = videos[0].url
                            $print("从window.videos找到视频URL: " + videoUrl)
                            break
                        }
                    } catch (e) {
                        $print("解析videos失败: " + e.message)
                    }
                }
            }
        }
        
        // 方法2: 如果没找到videos，尝试提取videojs的source
        if (!videoUrl) {
            const videoPlayerContainer = $('#player-container')
            if (videoPlayerContainer.length > 0) {
                const videoElement = videoPlayerContainer.find('video')
                if (videoElement.length > 0) {
                    const sourceElement = videoElement.find('source')
                    if (sourceElement.length > 0) {
                        videoUrl = sourceElement.attr('src')
                        $print("从video标签获取URL: " + videoUrl)
                    }
                }
            }
        }
        
        // 方法3: 查找iframe
        if (!videoUrl) {
            const iframe = $('iframe')
            if (iframe.length > 0) {
                const iframeSrc = iframe.attr('src')
                if (iframeSrc) {
                    $print("找到iframe: " + iframeSrc)
                    videoUrl = iframeSrc // 将在getPlayinfo中处理iframe
                }
            }
        }
        
    } catch (e) {
        $print("提取视频信息错误: " + e.message)
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
                    referer: url
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
    
    $print("获取播放信息URL: " + url)
    
    // 如果URL为空或是原网页URL，尝试构建API地址
    if (!url || url.includes('/zh/v/')) {
        // 123AV网站可能的API格式
        const apiUrls = [
            `${appConfig.site}/zh/api/source/${videoCode}`,
            `${appConfig.site}/zh/api/video/${videoCode}`,
            `${appConfig.site}/zh/stream/${videoCode}`,
            `${appConfig.site}/zh/player/${videoCode}`
        ]
        
        for (const apiUrl of apiUrls) {
            $print("尝试API: " + apiUrl)
            try {
                const { data: apiData } = await $fetch.get(apiUrl, {
                    headers: {
                        'User-Agent': UA,
                        'Referer': referer,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                
                // 处理API响应
                if (typeof apiData === 'string') {
                    // 如果返回是直接的URL
                    if (apiData.trim().startsWith('http')) {
                        url = apiData.trim()
                        $print("API直接返回URL: " + url)
                        break
                    }
                    
                    // 尝试解析JSON
                    try {
                        const json = JSON.parse(apiData)
                        if (json && json.data && json.data.file) {
                            url = json.data.file
                            $print("从API获取视频文件: " + url)
                            break
                        } else if (json && json.data && json.data.url) {
                            url = json.data.url
                            $print("从API获取视频URL: " + url)
                            break
                        } else if (json && json.url) {
                            url = json.url
                            $print("从API JSON获取URL: " + url)
                            break
                        } else if (json && json.source) {
                            url = json.source
                            $print("从API JSON获取source: " + url)
                            break
                        }
                    } catch (e) {
                        $print("解析API JSON失败: " + e.message)
                    }
                } else if (apiData) {
                    // 如果返回已经是对象
                    if (apiData.data && apiData.data.file) {
                        url = apiData.data.file
                        break
                    } else if (apiData.data && apiData.data.url) {
                        url = apiData.data.url
                        break
                    } else if (apiData.url) {
                        url = apiData.url
                        break
                    }
                }
            } catch (e) {
                $print("API请求失败: " + e.message)
            }
        }
    }
    
    // 如果URL是iframe，处理iframe
    if (url && (url.includes('/iframe/') || url.includes('/player/'))) {
        try {
            const { data: iframeData } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': referer
                }
            })
            
            const $iframe = cheerio.load(iframeData)
            
            // 查找iframe中的video标签
            const video = $iframe('video')
            if (video.length > 0) {
                const source = video.find('source')
                if (source.length > 0) {
                    const src = source.attr('src')
                    if (src) {
                        url = src
                        $print("从iframe视频标签获取源: " + url)
                    }
                }
            }
            
            // 如果没找到，查找脚本
            if (url.includes('/iframe/') || url.includes('/player/')) {
                const scripts = $iframe('script')
                let foundUrl = false
                
                for (let i = 0; i < scripts.length && !foundUrl; i++) {
                    const script = $iframe(scripts[i]).html() || ''
                    
                    // 查找常见的视频URL模式
                    const patterns = [
                        /source\s*:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /url\s*:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /file\s*:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /src\s*:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /"(https?:\/\/[^"]+\.m3u8[^"]*)"/i,
                        /"(https?:\/\/[^"]+\.mp4[^"]*)"/i
                    ]
                    
                    for (const pattern of patterns) {
                        const match = script.match(pattern)
                        if (match && match[1]) {
                            url = match[1]
                            $print("从iframe脚本提取URL: " + url)
                            foundUrl = true
                            break
                        }
                    }
                    
                    // 查找JSON对象
                    if (!foundUrl && script.includes('{') && script.includes('}')) {
                        try {
                            const jsonMatches = script.match(/(\{.*?\})/g)
                            if (jsonMatches) {
                                for (const jsonStr of jsonMatches) {
                                    try {
                                        const json = JSON.parse(jsonStr)
                                        if (json.url) {
                                            url = json.url
                                            $print("从JSON对象获取URL: " + url)
                                            foundUrl = true
                                            break
                                        } else if (json.file) {
                                            url = json.file
                                            $print("从JSON对象获取file: " + url)
                                            foundUrl = true
                                            break
                                        } else if (json.source) {
                                            url = json.source
                                            $print("从JSON对象获取source: " + url)
                                            foundUrl = true
                                            break
                                        }
                                    } catch (e) {
                                        // 继续尝试下一个可能的JSON
                                    }
                                }
                            }
                        } catch (e) {
                            // 继续尝试
                        }
                    }
                }
            }
        } catch (e) {
            $print("处理iframe出错: " + e.message)
        }
    }
    
    // 如果URL仍然是页面或iframe URL，尝试最后的m3u8格式
    if (url && (url.includes('/zh/v/') || url.includes('/iframe/') || url.includes('/player/'))) {
        // 尝试构造可能的m3u8直接地址
        const m3u8Url = `${appConfig.site}/zh/stream/${videoCode}.m3u8`
        $print("尝试直接m3u8地址: " + m3u8Url)
        
        try {
            const { data: m3u8Data } = await $fetch.get(m3u8Url, {
                headers: {
                    'User-Agent': UA, 
                    'Referer': referer
                }
            })
            
            if (typeof m3u8Data === 'string' && 
                (m3u8Data.includes('#EXTM3U') || m3u8Data.startsWith('http'))) {
                url = m3u8Url
                $print("找到有效的m3u8地址")
            }
        } catch (e) {
            $print("m3u8地址尝试失败")
        }
    }
    
    // 如果最终找不到有效的URL，使用原URL
    if (!url) {
        url = ext.url || referer
        $print("未找到视频URL，使用原URL: " + url)
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
