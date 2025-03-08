/**
 * 123AV XPTV 扩展脚本 v1.5.2
 * 
 * 更新日志:
 * v1.5.2 - 2025-03
 * - 修复视频列表无法显示的问题
 * - 回退到简化版的视频列表解析逻辑
 * - 保留AJAX API视频解析的改进
 * 
 * v1.5.1 - 2025-03-10
 * - 修复视频列表无法显示的问题（未成功）
 * - 增强选择器兼容性，适应网站最新结构
 * - 增加视频列表提取日志，方便调试
 * 
 * v1.5.0 - 2025-03-10
 * - 基于AJAX API完全重构，大幅简化解析逻辑
 * - 采用更可靠的直接API调用方式获取javplayer链接
 * - 优化videoId提取，支持页面元素和代码中的ID识别
 * - 改进错误处理和日志输出
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

// 获取网站导航
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
            { name: "最新视频", ext: { url: appConfig.site + "/zh/movies/new-release", page: 1 } },
            { name: "最热视频", ext: { url: appConfig.site + "/zh/movies/most-watched", page: 1 } },
            { name: "按类别", ext: { url: appConfig.site + "/zh/categories", page: 1 } }
        ]
    }
    
    return tabs
}

// 浏览视频列表 - 回退到简化版本
async function getVideos(ext) {
    ext = argsify(ext)
    const { url, page = 1 } = ext
    
    $print(`获取视频列表页面: ${url}, 第${page}页`)
    
    // 构建分页URL
    let pageUrl = url
    if (page > 1) {
        pageUrl = url.includes('?') ? `${url}&page=${page}` : `${url}?page=${page}`
    }
    
    const { data } = await $fetch.get(pageUrl, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        }
    })
    
    const $ = cheerio.load(data)
    
    // 视频列表
    let videos = []
    
    // 提取视频元素 - 使用简单选择器
    $('.box-item').each((_, element) => {
        try {
            const $box = $(element)
            
            // 获取链接和标题
            const $link = $box.find('.detail a')
            if ($link.length === 0) return
            
            const href = $link.attr('href')
            const title = $link.text().trim()
            
            // 获取封面图
            const $img = $box.find('img')
            const pic = $img.attr('data-src') || $img.attr('src') || ''
            
            // 从链接中提取视频路径
            let videoPath = ''
            if (href) {
                const pathMatch = href.match(/\/v\/([^\/\?]+)/)
                if (pathMatch && pathMatch[1]) {
                    videoPath = pathMatch[1]
                }
            }
            
            // 确保href为完整URL
            const fullHref = href.startsWith('http') ? href :
                             href.startsWith('/') ? `${appConfig.site}${href}` :
                             `${appConfig.site}/zh/${href}`
            
            videos.push({
                title: title,
                url: fullHref,
                pic: pic,
                extra: {
                    videoPath: videoPath
                }
            })
        } catch (e) {
            // 忽略单个视频的错误
        }
    })
    
    $print(`共找到${videos.length}个视频`)
    
    // 如果上面的选择器没有找到视频，尝试使用另一种选择器
    if (videos.length === 0) {
        $('.movie-card').each((_, element) => {
            try {
                const $card = $(element)
                
                // 获取链接和标题
                const $link = $card.find('a').first()
                if (!$link.length) return
                
                const href = $link.attr('href')
                if (!href) return
                
                const title = $link.attr('title') || $card.find('h3').text().trim() || '未知标题'
                
                // 获取封面图
                const $img = $card.find('img')
                const pic = $img.attr('data-src') || $img.attr('src') || ''
                
                // 从链接中提取视频路径
                let videoPath = ''
                if (href) {
                    const pathMatch = href.match(/\/v\/([^\/\?]+)/)
                    if (pathMatch && pathMatch[1]) {
                        videoPath = pathMatch[1]
                    }
                }
                
                // 确保href为完整URL
                const fullHref = href.startsWith('http') ? href :
                                 href.startsWith('/') ? `${appConfig.site}${href}` :
                                 `${appConfig.site}/zh/${href}`
                
                videos.push({
                    title: title,
                    url: fullHref,
                    pic: pic,
                    extra: {
                        videoPath: videoPath
                    }
                })
            } catch (e) {
                // 忽略单个视频的错误
            }
        })
        
        $print(`使用备用选择器找到${videos.length}个视频`)
    }
    
    // 获取分页信息
    let total = 1
    const paginationText = $('.pagination').text()
    const totalMatch = paginationText.match(/共(\d+)页/)
    if (totalMatch && totalMatch[1]) {
        total = parseInt(totalMatch[1])
    }
    
    $print(`总页数: ${total}`)
    
    return jsonify({
        list: videos,
        page: parseInt(page),
        pageCount: total,
        hasMore: page < total
    })
}

// 获取视频详情和播放列表
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
    
    // 提取视频标题和ID
    const title = $('.content-detail h1.title').text().trim() || $('h1.title').text().trim() || '未知标题'
    
    // 从URL提取视频路径
    const videoPath = url.split('/').slice(-1)[0]
    $print("视频路径: " + videoPath)
    
    // 尝试从页面提取videoId (优先级高于URL)
    let videoId = extractVideoId($, videoPath)
    $print("视频ID: " + videoId)
    
    // 构建播放列表
    let tracks = [
        {
            name: "线路1",
            list: [
                {
                    name: title,
                    url: videoId || videoPath,
                    extra: {
                        videoPath: videoPath
                    }
                }
            ]
        }
    ]
    
    return jsonify({
        title: title,
        tracks: tracks
    })
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
                return idMatch[1]
            }
        }
    }
    
    // 从data-id属性提取
    const $dataId = $('[data-id]')
    if ($dataId.length > 0) {
        return $dataId.attr('data-id')
    }
    
    // 从script标签提取
    const scriptContent = $('script:contains("movie_id")').text()
    const scriptMatch = scriptContent.match(/movie_id\s*[:=]\s*['"]?(\d+)['"]?/)
    if (scriptMatch && scriptMatch[1]) {
        return scriptMatch[1]
    }
    
    return fallbackId
}

// 播放视频（获取最终播放地址）
async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url
    const videoPath = ext.extra?.videoPath || url
    
    $print("开始解析媒体地址: " + url)
    
    // Step 1: 尝试使用AJAX API获取javplayer链接
    let javplayerUrl = await getJavplayerUrl(url, videoPath)
    
    if (!javplayerUrl) {
        $print("无法获取javplayer链接，解析失败")
        return jsonify({})
    }
    
    $print("获取到javplayer链接: " + javplayerUrl)
    
    // Step 2: 从javplayer页面获取最终m3u8 URL
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
            'Range': 'bytes=0-',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'Priority': 'u=1, i'
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
        
        // 检查是否有watch数组
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

// 从javplayer获取m3u8 URL
async function getM3u8FromJavplayer(javplayerUrl) {
    try {
        $print("请求javplayer页面: " + javplayerUrl)
        
        // 将/e/替换为/v/（如果需要）
        const playerUrl = javplayerUrl.replace('/e/', '/v/')
        
        const { data } = await $fetch.get(playerUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site
            }
        })
        
        $print("javplayer页面大小: " + data.length)
        
        // 从页面中提取m3u8地址
        const m3u8Match = data.match(/source\s+src="(https:\/\/[^"]+\.m3u8[^"]*)/i)
        if (m3u8Match && m3u8Match[1]) {
            return m3u8Match[1]
        }
        
        // 如果没有直接找到，尝试从vkey或其他变量中构建
        const playerCode = playerUrl.split('/').pop()
        const vkeyMatch = data.match(/vkey\s*=\s*['"]([^'"]+)['"]/i)
        
        if (vkeyMatch && vkeyMatch[1]) {
            const vkey = vkeyMatch[1]
            $print("找到vkey: " + vkey)
            
            // 检查是否是 videoId_hash 格式
            if (vkey.includes('_')) {
                // 尝试不同的CDN域名和路径组合
                const domains = [
                    's210.skyearth9.xyz',
                    's209.skyearth9.xyz',
                    's208.skyearth9.xyz',
                    's208.skyearth7.xyz'
                ]
                
                for (const domain of domains) {
                    const m3u8Url = `https://${domain}/vod1/a/bl/${vkey}/720/v.m3u8`
                    $print("尝试构造URL: " + m3u8Url)
                    
                    try {
                        const { code } = await $fetch.head(m3u8Url, {
                            headers: {
                                'User-Agent': UA,
                                'Referer': 'https://javplayer.me/'
                            }
                        })
                        
                        if (code === 200) {
                            $print("构造的URL可访问")
                            return m3u8Url
                        }
                    } catch (e) {
                        // 继续尝试下一个域名
                    }
                }
            }
        }
        
        $print("无法从javplayer页面提取m3u8链接")
        return null
    } catch (e) {
        $print("请求javplayer页面失败: " + e.message)
        return null
    }
} 
