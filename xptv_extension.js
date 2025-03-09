/**
 * 123AV XPTV 扩展脚本 v1.6.3
 * 
 * 更新日志:
 * v1.6.2 - 2025-03-11
 * - 修复空watch数组导致播放失败的问题
 * - 修复javplayer链接处理逻辑，正确访问播放源
 * - 增加更多备用解析策略
 * 
 * v1.6.1 - 2025-03-11
 * - 恢复动态获取分类功能
 * - 修复视频详情页播放按钮置灰无法点击的问题
 * - 优化播放解析流程
 * 
 * v1.6.0 - 2025-03-11
 * - 重新引入getCards函数，解决分类页面视频列表加载问题
 * - 改进URL构建逻辑，确保链接正确拼接
 * - 保留AJAX API和javplayer解析的改进
 */

const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '123AV',
    site: 'https://123av.com'
}

// 获取页面导航配置
async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

// 获取网站导航 - 恢复动态获取功能
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
        // 获取导航菜单
        $('#nav li a').each((_, element) => {
            const name = $(element).text().trim()
            const link = $(element).attr('href')
            
            if (link && name && !link.includes('javascript:') && !link.includes('#')) {
                let fullUrl = link.startsWith('http') ? link : 
                              link.startsWith('/zh/') ? `${appConfig.site}${link}` :
                              link.startsWith('/') ? `${appConfig.site}/zh${link}` :
                              `${appConfig.site}/zh/${link}`
                
                tabs.push({
                    name: name,
                    ext: {
                        url: fullUrl,
                        page: 1
                    }
                })
            }
        })
    } catch (e) {
        $print("动态提取导航失败: " + e.message)
    }
    
    // 如果动态提取失败，使用静态配置
    if (tabs.length < 3) {
        tabs = [
            { name: "最近更新", ext: { url: appConfig.site + "/zh/dm5", page: 1 } },
            { name: "热门视频", ext: { url: appConfig.site + "/zh/dm2/trending", page: 1 } },
            { name: "今日热门", ext: { url: appConfig.site + "/zh/dm2/today-hot", page: 1 } },
            { name: "已审查", ext: { url: appConfig.site + "/zh/dm2/censored", page: 1 } },
            { name: "未审查", ext: { url: appConfig.site + "/zh/dm3/uncensored", page: 1 } },
            { name: "按类别", ext: { url: appConfig.site + "/zh/categories", page: 1 } }
        ]
    }
    
    return tabs
}

// 视频列表获取 - 使用老版本的getCards函数
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

// 兼容性函数 - 将getCards暴露为getVideos，保持新版兼容性
async function getVideos(ext) {
    return await getCards(ext)
}

// 获取视频详情和播放列表
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
    
    const $ = cheerio.load(data)
    
    // 提取视频标题
    const title = $('.content-detail h1.title').text().trim() || $('h1.title').text().trim() || '未知标题'
    
    // 从URL提取视频路径
    const videoPath = url.split('/').slice(-1)[0]
    $print("视频路径: " + videoPath)
    
    // 尝试从页面提取videoId (优先级高于URL)
    let videoId = extractVideoId($, videoPath)
    $print("视频ID: " + videoId)
    
    // 从页面中提取iframe或直接的视频源(用作备用)
    let directVideoUrl = null
    try {
        // 检查是否有iframe
        const iframeSrc = $('iframe').attr('src')
        if (iframeSrc) {
            $print("找到iframe: " + iframeSrc)
            directVideoUrl = iframeSrc
        }
        
        // 检查video标签
        if (!directVideoUrl) {
            const videoSrc = $('video source').attr('src')
            if (videoSrc) {
                $print("找到video源: " + videoSrc)
                directVideoUrl = videoSrc
            }
        }
        
        // 检查脚本中的window.videos
        if (!directVideoUrl) {
            $('script').each((_, script) => {
                const scriptContent = $(script).html() || ''
                if (scriptContent.includes('window.videos')) {
                    const match = scriptContent.match(/window\.videos\s*=\s*(\[.+?\]);/s)
                    if (match && match[1]) {
                        try {
                            const videos = JSON.parse(match[1])
                            if (videos && videos.length > 0 && videos[0].url) {
                                directVideoUrl = videos[0].url
                                $print("从脚本提取到视频URL: " + directVideoUrl)
                            }
                        } catch (e) {
                            $print("解析videos数据出错: " + e.message)
                        }
                    }
                }
            })
        }
    } catch (e) {
        $print("提取备用视频地址出错: " + e.message)
    }
    
    // 构建播放列表
    let tracks = [
        {
            name: title,
            url: url,
            extra: {
                videoPath: videoPath,
                videoId: videoId,
                directUrl: directVideoUrl
            }
        }
    ]
    
    return jsonify({
        list: [
            {
                title: "默认线路",
                tracks: tracks
            }
        ]
    })
}

// 播放视频（获取最终播放地址）
async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url
    const videoPath = ext.extra?.videoPath || url.split('/').pop()
    const videoId = ext.extra?.videoId || videoPath
    const directUrl = ext.extra?.directUrl
    
    $print("开始解析媒体地址: " + url)
    $print("视频路径: " + videoPath)
    $print("视频ID: " + videoId)
    if (directUrl) $print("备用视频URL: " + directUrl)
    
    // 步骤1: 尝试使用AJAX API获取javplayer链接
    let javplayerUrl = await getJavplayerUrl(videoId, videoPath)
    
    // 如果AJAX API返回空结果，但有备用URL，直接使用备用URL
    if (!javplayerUrl && directUrl) {
        $print("使用页面中提取的备用视频URL")
        
        // 检查是否是javplayer链接
        if (directUrl.includes('javplayer.me')) {
            javplayerUrl = directUrl
            $print("备用URL是javplayer链接: " + javplayerUrl)
        } else if (directUrl.includes('.m3u8')) {
            // 如果是直接的m3u8链接，直接返回
            $print("备用URL是直接的m3u8链接: " + directUrl)
            return jsonify({ 
                urls: [directUrl],
                headers: [{
                    'User-Agent': UA, 
                    'Referer': url,
                    'Origin': appConfig.site
                }]
            })
        }
    }
    
    if (!javplayerUrl) {
        $print("无法获取有效的播放源链接，解析失败")
        return jsonify({})
    }
    
    $print("获取到javplayer链接: " + javplayerUrl)
    
    // 步骤2: 从javplayer页面获取最终m3u8 URL
    const m3u8Url = await getM3u8FromJavplayer(javplayerUrl)
    
    if (!m3u8Url) {
        $print("无法从javplayer获取m3u8链接，解析失败")
        return jsonify({})
    }
    
    $print("最终媒体URL: " + m3u8Url)
    
    // 返回最终URL和请求头
    return jsonify({ 
        urls: [m3u8Url],
        headers: [{
            'User-Agent': UA, 
            'Referer': 'https://javplayer.me/',
            'Origin': 'https://javplayer.me',
            'Accept': '*/*',
            'Range': 'bytes=0-'
        }],
        useProxy: true
    })
}

// 从AJAX API获取javplayer链接
async function getJavplayerUrl(videoId, videoPath) {
    try {
        // 构建AJAX URL
        const ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoPath}/videos`
        $print("发送AJAX请求: " + ajaxUrl)
        
        const { data } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': `${appConfig.site}/zh/v/${videoPath}`,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        
        $print("AJAX响应: " + JSON.stringify(data).substring(0, 100) + "...")
        
        // 检查是否有watch数组且不为空
        if (data && data.status === 200 && data.result && data.result.watch && data.result.watch.length > 0) {
            return data.result.watch[0].url
        }
        
        $print("AJAX响应中没有找到watch数组或为空")
        return null
    } catch (e) {
        $print("AJAX请求失败: " + e.message)
        return null
    }
}

// 从javplayer获取m3u8 URL - 更精确的提取方法
async function getM3u8FromJavplayer(javplayerUrl) {
    try {
        $print("请求javplayer页面: " + javplayerUrl)
        
        const { data } = await $fetch.get(javplayerUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': 'https://123av.com/'
            }
        })
        
        // 方法1: 精确匹配&quot;stream&quot;格式(处理HTML实体)
        const quotMatch = data.match(/&quot;stream&quot;:&quot;(.*?)&quot;/);
        if (quotMatch && quotMatch[1]) {
            const m3u8Url = quotMatch[1].replace(/\\\//g, '/');
            $print("从&quot;实体中提取到stream URL: " + m3u8Url);
            return m3u8Url;
        }
        
        // 方法2: 匹配普通JSON格式(如果HTML实体已被解析)
        const jsonMatch = data.match(/"stream"\s*:\s*"(.*?)"/);
        if (jsonMatch && jsonMatch[1]) {
            const m3u8Url = jsonMatch[1].replace(/\\\//g, '/');
            $print("从JSON格式提取到stream URL: " + m3u8Url);
            return m3u8Url;
        }
        
        // 方法3: 直接查找任何m3u8地址
        const urlMatch = data.match(/https:\/\/[^"'\s]+\.m3u8/);
        if (urlMatch) {
            $print("直接找到m3u8 URL: " + urlMatch[0]);
            return urlMatch[0];
        }
        
        $print("未能从页面提取到m3u8地址");
        $print("页面内容片段: " + data.substring(0, 200) + "...");
        return null;
    } catch (e) {
        $print("解析javplayer页面失败: " + e.message);
        return null;
    }
}

// 从页面提取videoId
function extractVideoId($, fallbackId) {
    // 尝试从Favourite元素提取
    const $fav = $('.favourite')
    if ($fav.length > 0) {
        const vScope = $fav.attr('v-scope')
        if (vScope) {
            const idMatch = vScope.match(/Favourite\(['"]movie['"],\s*(\d+)/)
            if (idMatch && idMatch[1]) {
                $print("从Favourite元素提取ID: " + idMatch[1])
                return idMatch[1]
            }
        }
        
        // 尝试从data-args提取
        const dataArgs = $fav.attr('data-args')
        if (dataArgs) {
            try {
                const args = JSON.parse(dataArgs)
                if (args && args[1]) {
                    $print("从data-args提取ID: " + args[1])
                    return args[1]
                }
            } catch (e) {
                // 继续尝试其他方法
            }
        }
    }
    
    // 从data-id属性提取
    const $dataId = $('[data-id]')
    if ($dataId.length > 0) {
        const id = $dataId.attr('data-id')
        $print("从data-id提取ID: " + id)
        return id
    }
    
    // 从script标签提取
    const scriptContent = $('script:contains("movie_id")').text()
    const scriptMatch = scriptContent.match(/movie_id\s*[:=]\s*['"]?(\d+)['"]?/)
    if (scriptMatch && scriptMatch[1]) {
        $print("从script提取ID: " + scriptMatch[1])
        return scriptMatch[1]
    }
    
    $print("未找到ID，使用备用: " + fallbackId)
    return fallbackId
}

// 搜索功能
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
