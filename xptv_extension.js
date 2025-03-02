//1121
const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '网页',
    site: 'https://123av.com/zh/dm4',
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

    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)

    // 解析导航标签
    $('.nav-menu li').each((_, element) => {
        const name = $(element).find('a').text().trim()
        const href = $(element).find('a').attr('href')
        
        if (!isIgnoreClassName(name)) {
            list.push({
                name,
                ext: {
                    url: href.startsWith('http') ? href : appConfig.site + href,
                },
            })
        }
    })

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    // 处理分页
    if (page > 1) {
        url = url.replace(/\.html$/, '') + `/page/${page}.html`
    }

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    // 定义多个选择器，按常见程度排序
    const selectors = [
        '.module-item',                    // 常见模板
        '.video-list .video-item',         // 视频列表
        '.bt_img li',                      // BT下载
        '.movie-list .movie-item',         // 电影列表
        '.stui-vodlist__box',             // STUI模板
        '.myui-vodlist__box',             // MYUI模板
        '.fed-list-item',                 // FED模板
        '.vodlist_item',                  // 通用列表项
        '.hl-list-item',                  // 海螺模板
        '.pack-ykpack',                   // 通用模板
        '.mo-main-info',                  // 影视模板
        '.public-list-box'                // 公共列表
    ]

    // 遍历选择器直到找到匹配的元素
    for (const selector of selectors) {
        const elements = $(selector)
        if (elements.length > 0) {
            elements.each((_, element) => {
                const $element = $(element)
                // 获取链接，支持多种选择器
                const href = $element.find('a').attr('href') || 
                            $element.find('.video-link').attr('href') || 
                            $element.find('[href]').attr('href')

                // 获取标题，支持多种选择器和属性
                const title = $element.find('.title').text().trim() || 
                             $element.find('.video-title').text().trim() || 
                             $element.find('.module-item-title').text().trim() ||
                             $element.find('.name').text().trim() ||
                             $element.find('h3').text().trim() ||
                             $element.find('a').attr('title') ||
                             $element.find('[title]').attr('title')

                // 获取封面图，支持多种属性
                const img = $element.find('img')
                const cover = img.attr('data-src') || 
                             img.attr('data-original') || 
                             img.attr('data-thumb') ||
                             img.attr('data-url') ||
                             img.attr('data-image') ||
                             img.attr('src')

                // 获取副标题，支持多种选择器
                const subTitle = $element.find('.video-info').text().trim() || 
                                $element.find('.module-item-text').text().trim() ||
                                $element.find('.pic-text').text().trim() ||
                                $element.find('.note').text().trim() ||
                                $element.find('.remarks').text().trim()

                // 调试信息
                $print(`解析到视频项：${title || '无标题'} - ${href || '无链接'}`)

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
            break
        }
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    // 定义多个选择器
    const selectors = [
        '.play-list .play-item',
        '.module-play-list a',
        '.playlist li a',
        'a[href*="play"]'
    ]

    // 遍历选择器直到找到匹配的元素
    for (const selector of selectors) {
        const elements = $(selector)
        if (elements.length > 0) {
            elements.each((_, element) => {
                const $element = $(element)
                const name = $element.find('.play-name').text().trim() || $element.text().trim()
                const href = $element.find('.play-link').attr('href') || $element.attr('href')
                
                if (href && name) {
                    tracks.push({
                        name: name,
                        pan: '',
                        ext: {
                            url: href.startsWith('http') ? href : appConfig.site + href,
                        },
                    })
                }
            })
            break
        }
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

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)
    let playUrl

    try {
        // 定义多个选择器
        const selectors = [
            '#video-player source',
            '.module-player-box iframe',
            'video source',
            'iframe'
        ]

        // 遍历选择器直到找到匹配的元素
        for (const selector of selectors) {
            const element = $(selector)
            if (element.length > 0) {
                playUrl = element.attr('src')
                if (playUrl) {
                    break
                }
            }
        }

        // 如果还是没找到，尝试从script中提取
        if (!playUrl) {
            const scriptContent = $('script:contains("player")').text()
            const match = scriptContent.match(/url:\s*['"](.*?)['"]/) || 
                         scriptContent.match(/src:\s*['"](.*?)['"]/) ||
                         scriptContent.match(/source:\s*['"](.*?)['"]/) 
            if (match) {
                playUrl = match[1]
            }
        }

        // 处理相对URL
        if (playUrl && !playUrl.startsWith('http')) {
            playUrl = new URL(playUrl, appConfig.site).href
        }
    } catch (error) {
        $print(error)
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
    const url = `${appConfig.site}/search?keyword=${text}&page=${page}`

    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)

    // 解析搜索结果
    $('.search-list .video-item').each((_, element) => {
        const href = $(element).find('.video-link').attr('href')
        const title = $(element).find('.video-title').text().trim()
        const cover = $(element).find('.video-cover').attr('data-src') || 
                     $(element).find('.video-cover').attr('src')
        const subTitle = $(element).find('.video-info').text().trim()

        cards.push({
            vod_id: href,
            vod_name: title,
            vod_pic: cover,
            vod_remarks: subTitle,
            ext: {
                url: href.startsWith('http') ? href : appConfig.site + href,
            },
        })
    })

    return jsonify({
        list: cards,
    })
}
