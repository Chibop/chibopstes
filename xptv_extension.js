const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '123',
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

    // 优化选择器，参考czyy.js
    let allClass = $('ul.submenu_mi > li > a, .nav-item a, .menu-item a')
    allClass.each((_, e) => {
        const name = $(e).text().trim()
        const href = $(e).attr('href')
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

    if (list.length === 0) {
        $print('未找到任何导航项，添加默认导航')
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

    // 优化分页处理逻辑，参考czyy.js
    if (page > 1) {
        if (url.includes('/page/')) {
            url = url.replace(/\/page\/\d+/, `/page/${page}`)
        } else if (url.includes('?page=')) {
            url = url.replace(/page=\d+/, `page=${page}`)
        } else if (url.includes('?')) {
            url += `&page=${page}`
        } else {
            url += `/page/${page}`
        }
    }

    try {
        $print(`正在请求URL: ${url}`)
        const { data } = await Promise.race([
            $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                },
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), 10000)
            )
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析视频列表')

        // 优化选择器和数据提取逻辑
        $('.bt_img.mi_ne_kd.mrb ul > li, .video-item, .module-item, .box-item').each((_, element) => {
            const $element = $(element)
            const $link = $element.find('a').first()
            const $img = $element.find('img')
            const $title = $element.find('.title, .detail a')
            const $duration = $element.find('.jidi span, .video-duration, .duration')
            
            const href = $link.attr('href')
            const title = $img.attr('alt') || $title.text().trim()
            const cover = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src')
            const subTitle = $duration.text().trim()

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

        if (cards.length === 0) {
            $print('未找到任何视频项，返回空列表')
        }

    } catch (error) {
        $print(`获取视频列表出错: ${error.message}`)
    }

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let tracks = []
    let url = ext.url

    try {
        $print(`正在请求URL: ${url}`)
        const { data } = await Promise.race([
            $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                },
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), 10000)
            )
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析播放列表')

        // 优化选择器，参考czyy.js
        $('.paly_list_btn a, .module-play-list a, .video-episodes a').each((_, e) => {
            const name = $(e).text().trim()
            const href = $(e).attr('href')
            
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

        if (tracks.length === 0) {
            $print('未找到任何播放项，返回空列表')
        }
    } catch (error) {
        $print(`获取播放列表出错: ${error.message}`)
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
    let playUrl = ''

    try {
        $print(`正在请求URL: ${url}`)
        const { data } = await Promise.race([
            $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                    'Referer': appConfig.site
                },
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), 10000)
            )
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析播放源')

        // 尝试获取iframe源
        const jsurl = $('iframe').attr('src')
        if (jsurl) {
            $print('找到iframe，尝试解析播放源')
            let headers = {
                'user-agent': UA,
                'referer': url
            }

            if (jsurl.includes('player-v2')) {
                headers['sec-fetch-dest'] = 'iframe'
                headers['sec-fetch-mode'] = 'navigate'
                headers['referer'] = `${appConfig.site}/`
            }

            const jsres = await $fetch.get(jsurl.startsWith('http') ? jsurl : new URL(jsurl, appConfig.site).href, { headers })
            const $2 = cheerio.load(jsres.data)
            const scripts = $2('script')

            if (scripts.length > 1) {
                let code = scripts.eq(scripts.length - 2).text()
                
                if (code.includes('var player')) {
                    // 尝试解密播放源
                    let player = code.match(/var player = "(.*?)"/) 
                    let rand = code.match(/var rand = "(.*?)"/) 

                    if (player && rand) {
                        function decrypt(text, key, iv) {
                            let key_value = CryptoJS.enc.Utf8.parse(key || 'PBfAUnTdMjNDe6pL')
                            let iv_value = CryptoJS.enc.Utf8.parse(iv || 'sENS6bVbwSfvnXrj')
                            let content = CryptoJS.AES.decrypt(text, key_value, {
                                iv: iv_value,
                                padding: CryptoJS.pad.Pkcs7,
                            }).toString(CryptoJS.enc.Utf8)
                            return content
                        }

                        try {
                            let content = JSON.parse(decrypt(player[1], 'VFBTzdujpR9FWBhe', rand[1]))
                            $print('成功解密播放源')
                            playUrl = content.url
                        } catch (e) {
                            $print(`解密播放源失败: ${e.message}`)
                        }
                    }
                } else {
                    // 尝试其他解析方式
                    const videoSrc = $2('video source').attr('src') || $2('video').attr('src')
                    if (videoSrc) {
                        playUrl = videoSrc.startsWith('http') ? videoSrc : new URL(videoSrc, jsurl).href
                    }
                }
            }
        } else {
            // 直接尝试查找视频源
            const videoElement = $('video source[src], video[src]').first()
            if (videoElement.length) {
                playUrl = videoElement.attr('src')
                if (playUrl && !playUrl.startsWith('http')) {
                    playUrl = new URL(playUrl, appConfig.site).href
                }
            }
        }

        if (!playUrl) {
            $print('未找到任何播放源，返回空URL')
        } else {
            $print(`找到播放源: ${playUrl}`)
        }
    } catch (error) {
        $print(`解析播放源时出错: ${error.message}`)
    }

    return jsonify({ 
        urls: playUrl ? [playUrl] : [], 
        headers: [{ 'User-Agent': UA }]
    })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/search?q=${text}&page=${page}`

    try {
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)
        $print('开始解析搜索结果')

        $('.bt_img.mi_ne_kd.mrb ul > li, .video-item, .module-item').each((_, element) => {
            const $element = $(element)
            const href = $element.find('a').first().attr('href')
            const title = $element.find('img').attr('alt') || $element.find('.title').text().trim()
            const cover = $element.find('img').attr('data-original') || $element.find('img').attr('src')
            const subTitle = $element.find('.jidi span, .video-duration').text().trim()

            if (href && title) {
                $print(`解析到搜索结果: ${title}`)
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

        if (cards.length === 0) {
            $print('未找到任何搜索结果')
        }
    } catch (error) {
        $print(`搜索出错: ${error.message}`)
    }

    return jsonify({
        list: cards,
    })
}
