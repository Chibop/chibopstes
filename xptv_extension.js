/**
 * 123AV XPTV 扩展脚本
 * 基于czzy脚本风格重写 1111123213213123123
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
                    url: link.startsWith('http') ? link : 
                         link.startsWith('/') ? `${appConfig.site}${link}` : 
                         `${appConfig.site}/${link}`
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
            'Referer': appConfig.site,
            'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
    })
    
    const $ = cheerio.load(data)
    const title = $('h1.title').text().trim() || '默认标题'
    let videoId = url.split('/').pop()
    
    // 提取页面中的关键数据
    let directVideoUrl = ''
    
    // 123av特有的数据提取 - 提取window.page变量
    let pageData = null
    try {
        const scriptText = $('script:contains("window.page")').html()
        if (scriptText) {
            const match = scriptText.match(/window\.page\s*=\s*({.+?});/s)
            if (match && match[1]) {
                pageData = JSON.parse(match[1])
                $print("成功提取page数据")
            }
        }
    } catch (e) {
        $print("提取page数据出错: " + e.message)
    }
    
    // 根据页面数据构造视频API
    if (pageData && pageData.id) {
        const videoApiUrl = `${appConfig.site}/zh/api/source/${pageData.id}`
        $print("尝试从API获取视频: " + videoApiUrl)
        
        try {
            const { data: apiResponse } = await $fetch.get(videoApiUrl, {
                headers: {
                    'User-Agent': UA,
                    'Referer': url,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            
            // 尝试解析API响应
            if (typeof apiResponse === 'string') {
                try {
                    const json = JSON.parse(apiResponse)
                    if (json && json.data && json.data.url) {
                        directVideoUrl = json.data.url
                        $print("从API获取到视频URL: " + directVideoUrl)
                    }
                } catch (e) {
                    $print("解析API响应失败: " + e.message)
                }
            } else if (apiResponse && apiResponse.data && apiResponse.data.url) {
                directVideoUrl = apiResponse.data.url
                $print("从API获取到视频URL: " + directVideoUrl)
            }
        } catch (e) {
            $print("API请求失败: " + e.message)
        }
    }
    
    // 如果API获取失败，尝试从iframe获取
    if (!directVideoUrl) {
        const iframe = $('iframe')
        if (iframe.length > 0) {
            const iframeSrc = iframe.attr('src')
            if (iframeSrc) {
                $print("找到iframe: " + iframeSrc)
                // 将iframe URL作为视频URL传递给getPlayinfo进一步处理
                directVideoUrl = iframeSrc
            }
        }
    }
    
    // 确保有视频ID
    if (!videoId && pageData && pageData.id) {
        videoId = pageData.id
    }
    
    return jsonify({
        list: [{
            title: '默认线路',
            tracks: [{
                name: title,
                ext: {
                    url: directVideoUrl || url,
                    videoId: videoId,
                    pageData: pageData ? JSON.stringify(pageData) : ''
                }
            }]
        }]
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const videoId = ext.videoId
    const pageDataStr = ext.pageData
    let pageData = null
    
    if (pageDataStr) {
        try {
            pageData = JSON.parse(pageDataStr)
        } catch (e) {
            $print("解析pageData失败")
        }
    }
    
    $print("获取播放信息URL: " + url)
    
    // 如果URL是iframe地址，直接请求iframe内容
    if (url.includes('/iframe/') || url.includes('/player/')) {
        try {
            const { data: iframeData } = await $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': appConfig.site,
                    'sec-fetch-dest': 'iframe'
                }
            })
            
            const $iframe = cheerio.load(iframeData)
            
            // 从iframe中查找直接的video标签
            const videoSrc = $iframe('video source').attr('src')
            if (videoSrc) {
                $print("从iframe中找到video源: " + videoSrc)
                url = videoSrc
            } else {
                // 从iframe的script中提取视频地址
                const scripts = $iframe('script')
                let scriptContent = ''
                
                // 查找包含视频URL的脚本
                for (let i = 0; i < scripts.length; i++) {
                    const script = $iframe(scripts[i]).html() || ''
                    if (script.includes('"url":') || script.includes('source:') || script.includes('var url')) {
                        scriptContent = script
                        break
                    }
                }
                
                if (scriptContent) {
                    // 常见的URL提取模式
                    const urlPatterns = [
                        /['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/i,
                        /['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i,
                        /url:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /source:\s*['"](https?:\/\/[^'"]+)['"]/i,
                        /var\s+url\s*=\s*['"](https?:\/\/[^'"]+)['"]/i
                    ]
                    
                    for (const pattern of urlPatterns) {
                        const match = scriptContent.match(pattern)
                        if (match && match[1]) {
                            $print("从脚本中匹配到视频URL: " + match[1])
                            url = match[1]
                            break
                        }
                    }
                }
            }
        } catch (e) {
            $print("处理iframe出错: " + e.message)
        }
    }
    // 如果URL是123av网站的普通页面URL，尝试使用API
    else if (url.includes('123av.com') && videoId) {
        // 尝试已知的API格式获取视频URL
        const apiFormats = [
            `${appConfig.site}/zh/api/source/${videoId}`,
            `${appConfig.site}/zh/api/video/${videoId}`,
            `${appConfig.site}/zh/stream/${videoId}`
        ]
        
        for (const apiUrl of apiFormats) {
            $print("尝试API地址: " + apiUrl)
            try {
                const { data: apiResponse } = await $fetch.get(apiUrl, {
                    headers: {
                        'User-Agent': UA,
                        'Referer': url,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                
                if (typeof apiResponse === 'string') {
                    if (apiResponse.startsWith('http')) {
                        url = apiResponse.trim()
                        $print("直接获取到视频URL: " + url)
                        break
                    }
                    
                    try {
                        const json = JSON.parse(apiResponse)
                        if (json && json.data && json.data.url) {
                            url = json.data.url
                            $print("从API JSON解析到视频URL: " + url)
                            break
                        } else if (json && json.url) {
                            url = json.url
                            $print("从API JSON解析到视频URL: " + url)
                            break
                        }
                    } catch (e) {
                        // JSON解析失败，继续尝试下一个API
                    }
                } else if (apiResponse && (apiResponse.data?.url || apiResponse.url)) {
                    url = apiResponse.data?.url || apiResponse.url
                    $print("从API响应获取到视频URL: " + url)
                    break
                }
            } catch (e) {
                // API请求失败，继续尝试下一个
            }
        }
    }
    
    // 最后确保URL是直接可播放的格式
    if (url && !url.match(/\.(m3u8|mp4|flv|ts)(\?|$)/i) && !url.includes('123av.com')) {
        $print("视频URL可能不是直接播放格式，尝试添加.m3u8后缀")
        // 有些网站需要在URL后添加.m3u8才能正常播放
        url = url.trim() + '.m3u8'
    }
    
    $print("最终视频URL: " + url)
    
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': appConfig.site,
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
            cards.push({
                vod_id: link,
                vod_name: title,
                vod_pic: image,
                vod_remarks: remarks,
                ext: {
                    url: link.startsWith('http') ? link : 
                         link.startsWith('/') ? `${appConfig.site}${link}` : 
                         `${appConfig.site}/${link}`
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
