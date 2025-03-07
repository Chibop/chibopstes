/**
 * 123AV XPTV 扩展脚本
 * 基于czzy脚本风格重写
 1.1.1
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
                    url: `${appConfig.site}${link}`
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
    let tracks = []
    const { url } = ext
    
    $print("获取播放列表URL: " + url)
    
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        },
    })
    
    const $ = cheerio.load(data)
    
    const title = $('h1.title').text().trim() || '默认标题'
    
    // 查找视频播放地址
    let videoUrl = ''
    let videoId = ''
    
    try {
        // 提取视频ID，通常在URL中
        const urlParts = url.split('/')
        videoId = urlParts[urlParts.length - 1]
        $print("视频ID: " + videoId)
        
        // 方法1: 尝试从页面脚本中提取window.videos变量
        const scriptContents = $('script')
        for (let i = 0; i < scriptContents.length; i++) {
            const scriptText = $(scriptContents[i]).html() || ''
            if (scriptText.includes('window.videos')) {
                const match = scriptText.match(/window\.videos\s*=\s*(\[.+?\])/s)
                if (match && match[1]) {
                    try {
                        const videos = JSON.parse(match[1])
                        if (videos && videos.length > 0 && videos[0].url) {
                            videoUrl = videos[0].url
                            $print("成功从window.videos提取视频URL: " + videoUrl)
                            break
                        }
                    } catch (e) {
                        $print("解析JSON出错: " + e.message)
                    }
                }
            }
        }
        
        // 方法2: 查找iframe
        if (!videoUrl) {
            const iframe = $('iframe')
            if (iframe.length > 0) {
                const iframeSrc = iframe.attr('src')
                if (iframeSrc) {
                    $print("找到iframe，URL: " + iframeSrc)
                    
                    // 获取iframe内容
                    const { data: iframeData } = await $fetch.get(iframeSrc, {
                        headers: {
                            'User-Agent': UA,
                            'Referer': url,
                            'sec-fetch-dest': 'iframe',
                            'sec-fetch-mode': 'navigate'
                        },
                    })
                    
                    const $iframe = cheerio.load(iframeData)
                    
                    // 查找iframe中的video标签
                    const videoTag = $iframe('video source')
                    if (videoTag.length > 0) {
                        const src = videoTag.attr('src')
                        if (src) {
                            videoUrl = src
                            $print("从iframe的video标签获取URL: " + videoUrl)
                        }
                    }
                    
                    // 查找iframe中的脚本
                    if (!videoUrl) {
                        const scripts = $iframe('script')
                        for (let i = 0; i < scripts.length; i++) {
                            const script = $iframe(scripts[i]).html() || ''
                            
                            // 类似czzy的脚本处理
                            if (script.includes('var player')) {
                                $print("找到可能包含player变量的脚本")
                                const playerMatch = script.match(/var player = "(.*?)"/)
                                const randMatch = script.match(/var rand = "(.*?)"/)
                                
                                if (playerMatch && randMatch) {
                                    try {
                                        // 尝试解密
                                        function decrypt(text, key, iv) {
                                            let key_value = CryptoJS.enc.Utf8.parse(key || 'PBfAUnTdMjNDe6pL')
                                            let iv_value = CryptoJS.enc.Utf8.parse(iv || 'sENS6bVbwSfvnXrj')
                                            let content = CryptoJS.AES.decrypt(text, key_value, {
                                                iv: iv_value,
                                                padding: CryptoJS.pad.Pkcs7,
                                            }).toString(CryptoJS.enc.Utf8)
                                            return content
                                        }
                                        
                                        // 这里使用czzy中类似的解密密钥，实际应根据123av修改
                                        const content = JSON.parse(decrypt(playerMatch[1], 'VideoPlayerKey123', randMatch[1]))
                                        if (content && content.url) {
                                            videoUrl = content.url
                                            $print("从iframe脚本解密获取URL: " + videoUrl)
                                        }
                                    } catch (e) {
                                        $print("解密播放地址失败: " + e.message)
                                    }
                                }
                            }
                            
                            // 查找直接包含url的脚本
                            if (!videoUrl && script.includes('url:')) {
                                const urlMatch = script.match(/url:\s*['"](https?:\/\/[^'"]+)['"]/)
                                if (urlMatch && urlMatch[1]) {
                                    videoUrl = urlMatch[1]
                                    $print("从iframe脚本中直接提取URL: " + videoUrl)
                                }
                            }
                            
                            // 查找data字段，类似czzy中的处理
                            if (!videoUrl && script.includes('"data":"')) {
                                try {
                                    const dataMatch = script.match(/"data":"([^"]+)"/)
                                    if (dataMatch && dataMatch[1]) {
                                        let data = dataMatch[1]
                                        let encrypted = data.split('').reverse().join('')
                                        let temp = ''
                                        for (let i = 0; i < encrypted.length; i = i + 2) {
                                            temp += String.fromCharCode(parseInt(encrypted[i] + encrypted[i + 1], 16))
                                        }
                                        // 根据实际情况调整截取逻辑
                                        videoUrl = temp.substring(0, (temp.length - 7) / 2) + temp.substring((temp.length - 7) / 2 + 7)
                                        $print("从data字段解密获取URL: " + videoUrl)
                                    }
                                } catch (e) {
                                    $print("从data解析URL失败: " + e.message)
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 方法3: 查找video标签
        if (!videoUrl) {
            const videoTag = $('video source')
            if (videoTag.length > 0) {
                const src = videoTag.attr('src')
                if (src) {
                    videoUrl = src
                    $print("从主页面video标签获取URL: " + videoUrl)
                }
            }
        }
        
        // 方法4: 尝试其他已知的API格式
        if (!videoUrl && videoId) {
            // 有些网站会有专门的API来获取视频URL
            $print("尝试通过API获取视频URL")
            try {
                const apiUrl = `${appConfig.site}/zh/api/video/${videoId}`
                const { data: apiData } = await $fetch.get(apiUrl, {
                    headers: {
                        'User-Agent': UA,
                        'Referer': url,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                
                if (typeof apiData === 'string') {
                    const apiJson = JSON.parse(apiData)
                    if (apiJson && apiJson.url) {
                        videoUrl = apiJson.url
                        $print("从API获取到视频URL: " + videoUrl)
                    }
                } else if (apiData && apiData.url) {
                    videoUrl = apiData.url
                    $print("从API获取到视频URL: " + videoUrl)
                }
            } catch (e) {
                $print("API请求失败: " + e.message)
            }
        }
    } catch (e) {
        $print("提取视频URL出错: " + e.message)
    }
    
    $print("最终获取到的视频URL: " + (videoUrl || "未找到"))
    
    tracks = [{
        name: title,
        ext: {
            url: videoUrl || url,
            videoId: videoId
        }
    }]
    
    return jsonify({
        list: [
            {
                title: '默认线路',
                tracks,
            },
        ],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const videoId = ext.videoId
    
    $print("获取播放信息URL: " + url)
    
    // 如果URL是123av网站的URL，需要再次解析获取实际视频URL
    if (url.includes('123av.com')) {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site
            },
        })
        
        const $ = cheerio.load(data)
        let newUrl = ''
        
        try {
            // 重复getTracks中的关键逻辑，确保能获取到视频URL
            // 方法1: 从window.videos获取
            const scriptContents = $('script')
            for (let i = 0; i < scriptContents.length; i++) {
                const scriptText = $(scriptContents[i]).html() || ''
                if (scriptText.includes('window.videos')) {
                    const match = scriptText.match(/window\.videos\s*=\s*(\[.+?\])/s)
                    if (match && match[1]) {
                        try {
                            const videos = JSON.parse(match[1])
                            if (videos && videos.length > 0 && videos[0].url) {
                                newUrl = videos[0].url
                                $print("成功从详情页提取视频URL: " + newUrl)
                                break
                            }
                        } catch (e) {
                            $print("解析JSON出错: " + e.message)
                        }
                    }
                }
            }
            
            // 方法2: 查找iframe，简化版
            if (!newUrl) {
                const iframe = $('iframe')
                if (iframe.length > 0) {
                    const iframeSrc = iframe.attr('src')
                    if (iframeSrc) {
                        $print("在getPlayinfo中找到iframe，URL: " + iframeSrc)
                        
                        // 直接使用iframe的src作为线索
                        // 很多情况下，直接请求iframe内容比较复杂，可以尝试构造直接的视频URL
                        if (iframeSrc.includes('player') || iframeSrc.includes('embed')) {
                            // 有些网站的播放器iframe地址可以转换为直接的视频地址
                            // 这需要根据实际情况调整
                            const possibleVideoUrl = iframeSrc.replace('/player/', '/stream/').replace('/embed/', '/stream/')
                            $print("尝试构造视频URL: " + possibleVideoUrl)
                            
                            try {
                                // 尝试请求构造的URL
                                const { data: testData } = await $fetch.get(possibleVideoUrl, {
                                    headers: {
                                        'User-Agent': UA,
                                        'Referer': url
                                    }
                                })
                                
                                // 如果响应是JSON并包含url字段
                                if (typeof testData === 'string' && testData.includes('"url"')) {
                                    try {
                                        const json = JSON.parse(testData)
                                        if (json && json.url) {
                                            newUrl = json.url
                                            $print("从构造的URL获取到视频地址: " + newUrl)
                                        }
                                    } catch (e) {}
                                }
                            } catch (e) {
                                $print("尝试构造URL失败: " + e.message)
                            }
                        }
                    }
                }
            }
            
            // 方法3: 从video标签获取
            if (!newUrl) {
                const videoTag = $('video source')
                if (videoTag.length > 0) {
                    const src = videoTag.attr('src')
                    if (src) {
                        newUrl = src
                        $print("从video标签获取URL: " + newUrl)
                    }
                }
            }
            
            // 方法4: 尝试硬编码的常见模式
            if (!newUrl && videoId) {
                // 很多网站会有固定的视频请求格式
                const possibleFormats = [
                    `${appConfig.site}/zh/api/stream/${videoId}`,
                    `${appConfig.site}/zh/stream/${videoId}.m3u8`,
                    `${appConfig.site}/zh/hls/${videoId}.m3u8`
                ]
                
                for (const format of possibleFormats) {
                    $print("尝试硬编码格式: " + format)
                    try {
                        const { data: formatData } = await $fetch.get(format, {
                            headers: {
                                'User-Agent': UA,
                                'Referer': url
                            }
                        })
                        
                        // 如果响应是JSON
                        if (typeof formatData === 'string' && formatData.startsWith('{')) {
                            try {
                                const json = JSON.parse(formatData)
                                if (json && json.url) {
                                    newUrl = json.url
                                    $print("从硬编码格式获取到URL: " + newUrl)
                                    break
                                }
                            } catch (e) {}
                        } 
                        // 如果响应是m3u8内容
                        else if (typeof formatData === 'string' && 
                                (formatData.includes('#EXTM3U') || formatData.startsWith('http'))) {
                            newUrl = format
                            $print("找到有效的m3u8地址: " + newUrl)
                            break
                        }
                    } catch (e) {
                        // 请求失败，继续尝试下一个格式
                    }
                }
            }
            
            if (newUrl) {
                url = newUrl
            }
        } catch (e) {
            $print("解析视频地址出错: " + e.message)
        }
    }
    
    // 确保URL是有效的
    if (!url.startsWith('http')) {
        $print("警告：未找到有效的视频URL，使用原始URL")
        url = ext.url
    }
    
    return jsonify({ 
        urls: [url],
        headers: [{
            'User-Agent': UA, 
            'Referer': appConfig.site,
            'Origin': appConfig.site
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
                    url: `${appConfig.site}${link}`
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
