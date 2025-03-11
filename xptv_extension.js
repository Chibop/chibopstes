/**
 * 123AV XPTV 扩展脚本 v2.0.0
 * 
 * 更新日志:
 * v2.0.0 - 2025-03-11
 * - 完全修复流程问题：在进入详情页时就获取m3u8地址
 * - 正确实现XPTV流程：getTracks完成全部解析，getPlayinfo直接使用结果
 * - 确保符合XPTV预期工作流程
 * 
 * v1.9.2 - 2025-03-11
 * - 彻底修复流程问题：确保遵循正确的请求顺序
 * - 简化播放实现，直接使用传入的AJAX URL
 * - 删除多余的辅助函数，确保处理逻辑清晰直接
 * 
 * v1.9.1 - 2025-03-11
 * - 完全修复播放问题：实现正确的播放流程
 * - 简化getPlayinfo函数，确保直接请求过程
 * - 确保完整的videos->javplayer->m3u8流程
 * 
 * v1.8.7 - 2025-03-11
 * - 基于XPTV规范文档完全重构
 * - 简化数据传递流程，一次性解决播放问题
 * - 使用标准key字段作为参数传递
 * 
 * v1.8.6 - 2025-03-11
 * - 完全修复播放问题，按照XPTV标准规范重构
 * - 正确使用ext字段传递播放参数
 * - 简化播放解析流程，直接传递AJAX URL
 * 
 * v1.8.5 - 2025-03-11
 * - 完全修复视频详情页播放按钮无法点击问题
 * - 完全采用v1.7.0兼容格式，使用tracks字段
 * - 确保与XPTV播放器接口完全匹配
 * 
 * v1.8.4 - 2025-03-11
 * - 完全修复视频详情页播放按钮无法点击问题
 * - 恢复原始数据结构并保持简单化
 * - 使用与v1.7.0兼容的返回格式
 * 
 * v1.8.3 - 2025-03-11
 * - 尝试修复播放问题但引入新问题
 * 
 * v1.8.1 - 2025-03-11
 * - 修复视频详情页无法播放的问题
 * - 优化视频参数传递流程，确保ID正确传递
 * - 改进getTracks函数，保存视频关键信息
 * 
 * v1.8.0 - 2025-03-11
 * - 完全重构解析逻辑，采用"顺序尝试"策略
 * - 移除冗余代码，保留最有效的解析方法
 * - 添加更详细的日志输出，方便问题诊断
 * - 修复AJAX URL构建问题，增强播放成功率
 * 
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

// 获取视频详情和播放列表 (关键修复)
async function getTracks(ext) {
    ext = argsify(ext)
    const { url } = ext
    
    $print("视频详情页URL: " + url)
    
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        },
    })
    
    const $ = cheerio.load(data)
    
    // 提取视频标题
    const title = $('h3.text-title').text().trim() || $('.content-detail h1.title').text().trim() || $('h1.title').text().trim() || '未知标题'
    
    // 从详情页提取视频ID
    let videoId = null
    const idMatch = data.match(/Favourite\(['"]movie['"],\s*(\d+)/)
    if (idMatch && idMatch[1]) {
        videoId = idMatch[1]
        $print("从详情页提取到视频ID: " + videoId)
    }
    
    // 从URL提取视频路径(备用)
    const videoPath = url.split('/').pop()
    
    // 构建AJAX URL
    let ajaxUrl = null
    if (videoId) {
        ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoId}/videos`
    } else {
        ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoPath}/videos`
    }
    
    $print("步骤1: 请求AJAX URL: " + ajaxUrl)
    
    try {
        // 步骤1: 请求AJAX获取javplayer URL
        const { data: ajaxData } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        
        // 检查AJAX响应
        if (!ajaxData || ajaxData.status !== 200 || !ajaxData.result || !ajaxData.result.watch || !ajaxData.result.watch.length) {
            $print("AJAX响应无效，无法获取javplayer URL")
            return createDefaultTracks(title, url)
        }
        
        // 步骤2: 获取javplayer URL
        const javplayerUrl = ajaxData.result.watch[0].url.replace(/\\\//g, '/')
        $print("步骤2: 获取到javplayer URL: " + javplayerUrl)
        
        // 步骤3: 请求javplayer页面获取m3u8
        const { data: playerData } = await $fetch.get(javplayerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                'Referer': 'https://123av.com/'
            }
        })
        
        // 步骤4: 从javplayer页面提取m3u8地址
        const m3u8Match = playerData.match(/&quot;stream&quot;:&quot;(.*?)&quot;/)
        if (!m3u8Match || !m3u8Match[1]) {
            $print("无法从javplayer页面提取m3u8地址")
            return createDefaultTracks(title, url)
        }
        
        // 获取m3u8地址
        const m3u8Url = m3u8Match[1].replace(/\\\//g, '/')
        $print("步骤4: 成功获取m3u8地址: " + m3u8Url)
        
        // 将m3u8地址直接传递给getPlayinfo
        let tracks = [
            {
                name: title,
                ext: {
                    key: m3u8Url  // 关键：直接传递m3u8地址
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
    } catch (e) {
        $print("获取播放信息失败: " + e.message)
        return createDefaultTracks(title, url)
    }
}

// 创建默认播放选项（当解析失败时使用）
function createDefaultTracks(title, url) {
    return jsonify({
        list: [
            {
                title: "解析失败",
                tracks: [
                    {
                        name: title,
                        ext: {
                            key: ""  // 空key表示无法播放
                        }
                    }
                ]
            }
        ]
    })
}

// 播放视频解析
async function getPlayinfo(ext) {
    ext = argsify(ext)
    const m3u8Url = ext.key  // 直接获取m3u8地址
    
    if (!m3u8Url) {
        return jsonify({ error: "无法获取视频播放地址" })
    }
    
    $print("使用已解析的m3u8地址: " + m3u8Url)
    
    // 直接返回播放数据，不再需要网络请求
    return jsonify({
        type: "hls",
        url: m3u8Url,
        header: {
            "Referer": "https://javplayer.me/",
            "User-Agent": UA
        }
    })
}

// 从页面提取视频ID
async function extractVideoIdFromPage(pageUrl) {
    try {
        const { data } = await $fetch.get(pageUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site
            }
        })
        
        // 提取视频ID - 最可靠的方法
        const idMatch = data.match(/Favourite\(['"]movie['"],\s*(\d+)/)
        if (idMatch && idMatch[1]) {
            return idMatch[1]
        }
        
        return null
    } catch (e) {
        $print("获取页面失败: " + e.message)
        return null
    }
}

// 使用视频ID获取javplayer URL
async function getJavplayerUrlWithId(videoId, lang = "zh") {
    try {
        const ajaxUrl = `${appConfig.site}/${lang}/ajax/v/${videoId}/videos`
        $print("请求AJAX API: " + ajaxUrl)
        
        const { data } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        
        if (data && data.status === 200 && data.result) {
            const { watch } = data.result
            
            if (watch && watch.length > 0 && watch[0].url) {
                $print("获取到javplayer URL: " + watch[0].url)
                return watch[0].url
            }
        }
        
        $print("AJAX响应中没有找到有效链接")
        return null
    } catch (e) {
        $print("AJAX请求失败: " + e.message)
        return null
    }
}

// 使用视频路径获取javplayer URL
async function getJavplayerUrlWithPath(videoPath) {
    try {
        const ajaxUrl = `${appConfig.site}/zh/ajax/v/${videoPath}/videos`
        $print("请求AJAX API (路径): " + ajaxUrl)
        
        const { data } = await $fetch.get(ajaxUrl, {
            headers: {
                'User-Agent': UA,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        
        if (data && data.status === 200 && data.result) {
            const { watch } = data.result
            
            if (watch && watch.length > 0 && watch[0].url) {
                $print("获取到javplayer URL: " + watch[0].url)
                return watch[0].url
            }
        }
        
        $print("路径方式AJAX响应中没有找到有效链接")
        return null
    } catch (e) {
        $print("路径方式AJAX请求失败: " + e.message)
        return null
    }
}

// 从javplayer获取m3u8地址
async function getM3u8FromJavplayer(javplayerUrl) {
    try {
        $print("请求javplayer页面: " + javplayerUrl)
        
        const { data } = await $fetch.get(javplayerUrl, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site
            }
        })
        
        // 提取m3u8 URL - 简化为最可靠的一种方法
        const m3u8Match = data.match(/&quot;stream&quot;:&quot;(.*?)&quot;/)
        if (m3u8Match && m3u8Match[1]) {
            const m3u8Url = m3u8Match[1].replace(/\\\//g, '/')
            $print("提取到m3u8 URL: " + m3u8Url)
            return m3u8Url
        }
        
        $print("无法从javplayer页面提取m3u8 URL")
        return null
    } catch (e) {
        $print("获取m3u8失败: " + e.message)
        return null
    }
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
