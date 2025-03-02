const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '网页格式化',
    site: 'https://example.com',
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

    // 解析视频列表
    $('.video-list .video-item').each((_, element) => {
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

    // 解析播放列表
    $('.play-list .play-item').each((_, element) => {
        const name = $(element).find('.play-name').text().trim()
        const href = $(element).find('.play-link').attr('href')
        
        tracks.push({
            name: name,
            pan: '',
            ext: {
                url: href.startsWith('http') ? href : appConfig.site + href,
            },
        })
    })

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
        // 尝试从页面中提取播放地址
        const videoElement = $('#video-player source')
        if (videoElement.length > 0) {
            playUrl = videoElement.attr('src')
        } else {
            // 尝试从script标签中提取
            const scriptContent = $('script:contains("player")').text()
            const match = scriptContent.match(/url:\s*['"]([^'"]+)/)
            if (match) {
                playUrl = match[1]
            }
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
