const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '网式化',
    site: 'https://123av.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['关于', '公告', '官方', '备用', '群', '地址', '求片']
    
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    $print(`正在请求URL: ${appConfig.site}`)
    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    $print('页面加载完成，开始解析导航菜单')

    // 尝试多个可能的选择器
    const selectors = [
        '.nav-item',
        '.navbar-item',
        '.menu-item',
        '.header-nav-item',
        '.nav a',  // 更通用的选择器
        '.navbar a',
        '.menu a',
        '#menu-main-menu li a',  // WordPress常用导航
        '.main-menu a',
        'header a'  // 最通用的选择器

    for (const selector of selectors) {
        $print(`尝试选择器: ${selector}`)
        const elements = $(selector)
        if (elements.length > 0) {
            $print(`找到 ${elements.length} 个导航项`)
            elements.each((_, element) => {
                const $element = $(element)
                const name = $element.find('a').text().trim()
                const href = $element.find('a').attr('href')
                
                if (href && name && !isIgnoreClassName(name)) {
                    $print(`解析到导航项: ${name}`)
                    list.push({
                        name,
                        ext: {
                            url: href.startsWith('http') ? href : new URL(href, appConfig.site).href,
                        },
                    })
                }
            })
            break
        }
    }

    if (list.length === 0) {
        $print('未找到任何导航项，请检查网页结构')
        // 添加一个默认的导航项，确保至少有一个可用的标签
        list.push({
            name: '最新',
            ext: {
                url: appConfig.site
            }
        })
    }

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    // 处理分页
    if (page > 1) {
        if (url.includes('?')) {
            url += `&page=${page}`
        } else {
            url += `?page=${page}`
        }
    }

    $print(`正在请求URL: ${url}`)
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    $print('页面加载完成，开始解析视频列表')

    // 尝试多个可能的选择器
    const selectors = [
        '.video-item',
        '.module-item',
        '.bt_img li',
        '.movie-list-item',
        '.video-list-item',
        '.item',  // 更通用的选择器
        '.post',  // WordPress常用
        'article'  // 通用文章容器

    for (const selector of selectors) {
        $print(`尝试选择器: ${selector}`)
        const elements = $(selector)
        if (elements.length > 0) {
            $print(`找到 ${elements.length} 个视频项`)
            elements.each((_, element) => {
                const $element = $(element)
                const href = $element.find('a').attr('href') || $element.attr('href')
                const title = $element.find('.video-title,.title,.module-item-title').text().trim()
                const img = $element.find('img')
                const cover = img.attr('data-src') || img.attr('data-original') || img.attr('src')
                const subTitle = $element.find('.video-duration,.module-item-text').text().trim()

                if (href && title) {
                    $print(`解析到视频: ${title}`)
                    cards.push({
                        vod_id: href,
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: subTitle,
                        ext: {
                            url: href.startsWith('http') ? href : new URL(href, appConfig.site).href,
                        },
                    })
                }
            })
            break
        }
    }

    if (cards.length === 0) {
        $print('未找到任何视频项，请检查网页结构')
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    $print(`正在请求URL: ${url}`)
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    $print('页面加载完成，开始解析播放列表')

    // 尝试多个可能的选择器
    const selectors = [
        '.video-episodes a',
        '.module-play-list a',
        '.playlist li a',
        '.play-list a',
        '.episode-list a'
    ]

    for (const selector of selectors) {
        $print(`尝试选择器: ${selector}`)
        const elements = $(selector)
        if (elements.length > 0) {
            $print(`找到 ${elements.length} 个播放项`)
            elements.each((_, element) => {
                const $element = $(element)
                const name = $element.text().trim()
                const href = $element.attr('href')
                
                if (href && name) {
                    $print(`解析到播放项: ${name}`)
                    tracks.push({
                        name: name,
                        pan: '',
                        ext: {
                            url: href.startsWith('http') ? href : new URL(href, appConfig.site).href,
                        },
                    })
                }
            })
            break
        }
    }

    if (tracks.length === 0) {
        $print('未找到任何播放项，请检查网页结构')
    }

    return jsonify({
        list: [{
            title: '默认分组',
            tracks,
        }],
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    const url = ext.url

    $print(`正在请求URL: ${url}`)
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site
        },
    })

    const $ = cheerio.load(data)
    $print('页面加载完成，开始解析播放源')
    let playUrl

    try {
        // 尝试多个可能的选择器
        const selectors = [
            '#video-player source',
            '.module-player-box iframe',
            '#player iframe',
            'video source',
            'iframe',
            '.player-box iframe',  // 常见播放器容器
            '.video-container video',  // HTML5视频容器
            'source[src*=".m3u8"]',  // m3u8源
            'source[src*=".mp4"]'  // mp4源

        for (const selector of selectors) {
            $print(`尝试选择器: ${selector}`)
            const element = $(selector).first()
            if (element.length > 0) {
                playUrl = element.attr('src')
                if (playUrl) {
                    $print(`找到播放源: ${playUrl}`)
                    break
                }
            }
        }

        // 如果没找到视频源，尝试从script中提取
        if (!playUrl) {
            $print('尝试从script标签中提取播放源')
            const scriptContent = $('script:contains("player")').text()
            const match = scriptContent.match(/url:\s*['"](.+?)['"]/) || 
                         scriptContent.match(/src:\s*['"](.+?)['"]/) ||
                         scriptContent.match(/source:\s*['"](.+?)['"]/) 
            if (match) {
                playUrl = match[1]
                $print(`从script中找到播放源: ${playUrl}`)
            }
        }

        // 处理相对URL
        if (playUrl && !playUrl.startsWith('http')) {
            playUrl = new URL(playUrl, appConfig.site).href
        }
    } catch (error) {
        $print(`解析播放源时出错: ${error}`)
    }

    if (!playUrl) {
        $print('未找到任何播放源，请检查网页结构')
    }

    return jsonify({ 
        urls: [playUrl], 
        headers: [{ 'User-Agent': UA }]
    })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/zh/search?q=${text}&page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    // 解析搜索结果
    $('.video-item').each((_, element) => {
        const $element = $(element)
        const href = $element.find('a').attr('href')
        const title = $element.find('.video-title').text().trim()
        const cover = $element.find('img').attr('src')
        const subTitle = $element.find('.video-duration').text().trim()

        if (href && title) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: subTitle,
                ext: {
                    url: href.startsWith('http') ? href : appConfig.site + href,
                },
            })
        }
    })

    return jsonify({
        list: cards,
    })
}
