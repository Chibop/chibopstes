/**
 * 123AV XPTV 扩展脚本 v1.7.0
 * 
 * 更新日志:
 * v1.7.0 - 2025-03-11
 * - 添加多语言路径支持，当中文页面解析失败时尝试英文页面
 * - 增强视频ID提取功能，添加多种提取方式
 * - 修复AJAX请求URL构建问题，使用正确的视频ID参数
 * - 添加m3u8解析备用方案，提高播放成功率
 * 
 * v1.6.2 - 2025-03-11
 * - 修复空watch数组导致播放失败的问题
 * - 修复javplayer链接处理逻辑，正确访问播放源
 * - 增加更多备用解析策略
 *
 * v1.6.1 - 2025-03-11
 * - 恢复动态获取分类功能
 * - 修复视频详情页播放按钮置灰无法点击的问题
 * - 优化播放解析流程
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
    
    $print("开始解析媒体地址: " + url)
    $print("视频路径: " + videoPath)
    
    try {
        // 1. 首先尝试从中文版页面获取
        let videoId = await getVideoId(url, videoPath)
        let javplayerUrl = null
        
        if (videoId) {
            $print("使用中文版页面提取到视频ID: " + videoId)
            javplayerUrl = await getJavplayerUrl(videoId, videoPath)
        }
        
        // 2. 如果中文版失败，尝试英文版页面
        if (!javplayerUrl) {
            $print("中文版解析失败，尝试英文版页面")
            // 构建英文版URL
            const enUrl = `${appConfig.site}/en/dm3/v/${videoPath}`
            const enVideoId = await getVideoId(enUrl, videoPath)
            
            if (enVideoId) {
                $print("使用英文版页面提取到视频ID: " + enVideoId)
                javplayerUrl = await getJavplayerUrl(enVideoId, videoPath, 'en')
            }
        }
        
        // 3. 如果仍然失败，尝试视频路径作为ID
        if (!javplayerUrl) {
            $print("尝试使用视频路径作为ID")
            javplayerUrl = await getJavplayerUrl(videoPath, videoPath)
        }
        
        // 4. 获取m3u8地址
        if (javplayerUrl) {
            $print("成功获取到javplayer URL: " + javplayerUrl)
            const m3u8Url = await getM3u8FromJavplayer(javplayerUrl)
            
            if (m3u8Url) {
                return jsonify({
                    type: "hls",
                    url: m3u8Url,
                    header: {
                        "Referer": "https://javplayer.me/"
                    }
                })
            }
        }
        
        return jsonify({
            error: "无法解析视频地址"
        })
    } catch (e) {
        $print("解析视频地址出错: " + e.message)
        return jsonify({
            error: "解析失败: " + e.message
        })
    }
}

// 从页面获取视频ID - 增强版
async function getVideoId(url, videoPath) {
    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site
            }
        })
        
        $print("获取视频页面: " + url)
        const $ = cheerio.load(data)
        
        // 方法1: 从Favourite元素提取
        const $fav = $('[v-scope*="Favourite"]')
        if ($fav.length > 0) {
            const vScope = $fav.attr('v-scope')
            if (vScope) {
                const idMatch = vScope.match(/Favourite\(['"]movie['"],\s*(\d+)/)
                if (idMatch && idMatch[1]) {
                    $print("从Favourite元素提取ID: " + idMatch[1])
                    return idMatch[1]
                }
            }
            
            // 从data-args提取
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
        
        // 方法2: 从data-id属性提取
        const $dataId = $('[data-id]')
        if ($dataId.length > 0) {
            const id = $dataId.attr('data-id')
            $print("从data-id提取ID: " + id)
            return id
        }
        
        // 方法3: 从script标签提取
        const scriptContent = $('script:contains("movie_id")').text()
        const scriptMatch = scriptContent.match(/movie_id\s*[:=]\s*['"]?(\d+)['"]?/)
        if (scriptMatch && scriptMatch[1]) {
            $print("从script提取ID: " + scriptMatch[1])
            return scriptMatch[1]
        }
        
        // 方法4: 从HTML中查找任何数字ID链接 (常见于英文版页面)
        const htmlContent = data.toString()
        const numLinkMatch = htmlContent.match(/href="[^"]*?\/(\d+)\/videos"/)
        if (numLinkMatch && numLinkMatch[1]) {
            $print("从数字链接提取ID: " + numLinkMatch[1])
            return numLinkMatch[1]
        }
        
        // 方法5: 从ajax链接提取
        const ajaxMatch = htmlContent.match(/ajax\/v\/(\d+)\/videos/)
        if (ajaxMatch && ajaxMatch[1]) {
            $print("从ajax链接提取ID: " + ajaxMatch[1])
            return ajaxMatch[1]
        }
        
        // 方法6: 尝试从meta标签提取
        const metaContent = $('meta[property="og:url"]').attr('content')
        if (metaContent) {
            const metaMatch = metaContent.match(/\/(\d+)$/)
            if (metaMatch && metaMatch[1]) {
                $print("从meta标签提取ID: " + metaMatch[1])
                return metaMatch[1]
            }
        }
        
        $print("无法提取到视频ID")
        return null
    } catch (e) {
        $print("获取视频ID失败: " + e.message)
        return null
    }
}

// 从AJAX API获取javplayer URL
async function getJavplayerUrl(videoId, videoPath, lang = 'zh') {
    try {
        // 正确使用视频ID构建AJAX URL
        const ajaxUrl = `${appConfig.site}/${lang}/ajax/v/${videoId}/videos`
        $print("请求AJAX API: " + ajaxUrl)
        
        const { data: responseData } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': `${appConfig.site}/${lang}/v/${videoPath}`,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        
        if (responseData && responseData.status === 200 && responseData.result) {
            const { watch } = responseData.result
            
            // 检查watch数组是否存在且非空
            if (watch && watch.length > 0) {
                const firstSource = watch[0]
                if (firstSource && firstSource.url) {
                    return firstSource.url
                }
            }
            $print("AJAX响应中没有找到有效的watch数组")
        } else {
            $print("AJAX响应无效或状态码非200")
        }
        
        return null
    } catch (e) {
        $print("获取javplayer URL失败: " + e.message)
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
        const quotMatch = data.match(/&quot;stream&quot;:&quot;(.*?)&quot;/)
        if (quotMatch && quotMatch[1]) {
            const m3u8Url = quotMatch[1].replace(/\\\//g, '/')
            $print("从&quot;实体中提取到stream URL: " + m3u8Url)
            return m3u8Url
        }
        
        // 方法2: 匹配普通JSON格式(如果HTML实体已被解析)
        const jsonMatch = data.match(/"stream"\s*:\s*"(.*?)"/)
        if (jsonMatch && jsonMatch[1]) {
            const m3u8Url = jsonMatch[1].replace(/\\\//g, '/')
            $print("从JSON格式提取到stream URL: " + m3u8Url)
            return m3u8Url
        }
        
        // 方法3: 直接查找任何m3u8地址
        const urlMatch = data.match(/https:\/\/[^"'\s]+\.m3u8/)
        if (urlMatch) {
            $print("直接找到m3u8 URL: " + urlMatch[0])
            return urlMatch[0]
        }
        
        // 方法4: 尝试根据视频编码构造m3u8地址
        const videoCode = javplayerUrl.split('/').pop().toLowerCase()
        if (videoCode) {
            const domains = ['s210.skyearth4.xyz', 's205.skyearth12.xyz', 's209.skyearth7.xyz', 's204.skyearth4.xyz', 's304.skyearth12.xyz']
            
            for (const domain of domains) {
                const patterns = [
                    `https://${domain}/vod1/${videoCode.substring(0, 1)}/${videoCode.substring(1, 3)}/${videoCode}_5c49e63b2f1fd71a94834ca146ad5672/720/v.m3u8`,
                    `https://${domain}/vod1/${videoCode.substring(0, 2).toLowerCase()}/${videoCode.substring(2, 4).toLowerCase()}/${videoCode}_5c49e63b2f1fd71a94834ca146ad5672/720/v.m3u8`,
                ]
                
                for (const pattern of patterns) {
                    try {
                        $print("尝试构造m3u8 URL: " + pattern)
                        const {status} = await $fetch.head(pattern, {
                            headers: {
                                'User-Agent': UA,
                                'Referer': 'https://javplayer.me/'
                            }
                        })
                        
                        if (status === 200) {
                            $print("构造的m3u8 URL有效")
                            return pattern
                        }
                    } catch (e) {
                        // 继续尝试下一个模式
                    }
                }
            }
        }
        
        $print("未能从页面提取到m3u8地址")
        $print("页面内容片段: " + data.substring(0, 200) + "...")
        return null
    } catch (e) {
        $print("解析javplayer页面失败: " + e.message)
        return null
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
