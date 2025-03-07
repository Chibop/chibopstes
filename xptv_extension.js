const cheerio = createCheerio()
const CryptoJS = createCryptoJS()
//1111
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '123AV',
    site: 'https://123av.com/zh/',
}

async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()
    return jsonify(config)
}

async function getTabs() {
    let list = []
    let ignore = ['关于', '公告', '官方', '备用', '群', '地址', '求片', 'javascript:']
    
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    try {
        $print(`正在请求URL: ${appConfig.site}`)
        const { data } = await Promise.race([
            $fetch.get(appConfig.site, {
                headers: {
                    'User-Agent': UA,
                },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析导航菜单')

        // 使用主选择器解析导航菜单
        $('#nav > li > a').each((_, e) => {
            const name = $(e).text().trim()
            const href = $(e).attr('href')
            if (href && name && !href.includes('javascript:') && !isIgnoreClassName(name)) {
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

    } catch (error) {
        $print(`获取导航菜单出错: ${error.message}`)
        if (error.stack) {
            $print(`错误堆栈: ${error.stack}`)
        }
    }

    return list
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { page = 1, url } = ext

    // 处理分页URL
    if (page > 1) {
        if (url.includes('/page/')) {
            url = url.replace(/\/page\/\d+/, `/page/${page}`)
        } else if (url.includes('?page=')) {
            url = url.replace(/page=\d+/, `page=${page}`)
        } else if (url.includes('?')) {
            url += `&page=${page}`
        } else {
            if (url.endsWith('/')) {
                url += `page/${page}`
            } else {
                url += `/page/${page}`
            }
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析视频列表')

        // 使用主选择器解析视频列表
        $('.row.box-item-list.gutter-20 .box-item').each((_, element) => {
            const $element = $(element)
            const $link = $element.find('.thumb a').first()
            const $img = $element.find('.thumb img')
            const $title = $element.find('.detail a')
            const $duration = $element.find('.duration')
            
            const href = $link.attr('href')
            const videoCode = $img.attr('title') || $img.attr('alt') || ''
            const fullTitle = $title.text().trim()
            const cover = $img.attr('data-src') || $img.attr('src')
            const duration = $duration.text().trim()
            const preview = $element.find('.thumb').attr('data-preview') || ''
            
            let videoId = ''
            if (href) {
                videoId = href.replace('v/', '')
            }

            if (href && (videoCode || fullTitle)) {
                const title = fullTitle || videoCode
                $print(`解析到视频: ${title}`)
                cards.push({
                    vod_id: videoId,
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: duration,
                    ext: {
                        url: href.startsWith('http') ? href : new URL(href, appConfig.site).href,
                        preview: preview,
                        code: videoCode
                    },
                })
            }
        })

        if (cards.length === 0) {
            $print('未找到任何视频项')
        }

    } catch (error) {
        $print(`获取视频列表出错: ${error.message}`)
        if (error.stack) {
            $print(`错误堆栈: ${error.stack}`)
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

    try {
        $print(`正在请求URL: ${url}`)
        const { data } = await Promise.race([
            $fetch.get(url, {
                headers: {
                    'User-Agent': UA,
                },
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析播放列表')

        // 添加默认播放源
        tracks.push({
            name: '默认播放源',
            pan: '',
            ext: {
                url: url
            },
        })

        // 解析其他播放源
        $('.paly_list_btn a, .module-play-list a, .video-episodes a').each((_, e) => {
            const name = $(e).text().trim()
            const href = $(e).attr('href')
            
            if (href && name && tracks.length === 1) {
                $print(`解析到播放源: ${name}`)
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
            $print('未找到任何播放源')
        }

    } catch (error) {
        $print(`获取播放列表出错: ${error.message}`)
        if (error.stack) {
            $print(`错误堆栈: ${error.stack}`)
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
            new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时')), 10000))
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析播放源')

        // 获取iframe源
        const jsurl = $('iframe[src*="player"], iframe[src*="play"], iframe[allowfullscreen]').attr('src')
        if (jsurl) {
            $print(`找到iframe，URL: ${jsurl}`)
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
                $print('分析脚本内容')
                
                if (code.includes('var player')) {
                    let player = code.match(/var player = "(.*?)"/) 
                    let rand = code.match(/var rand = "(.*?)"/) 

                    if (player && rand) {
                        $print('找到加密的播放源数据，尝试解密')
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
                    // 尝试获取直接视频源
                    const videoSrc = $('video source').attr('src') || $('video').attr('src')
                    if (videoSrc) {
                        $print('找到直接的视频源')
                        playUrl = videoSrc
                    } else {
                        // 尝试从script标签中查找播放源
                        const scriptContent = $('script:contains("player")').text()
                        const videoPattern = /url:\s*['"]([^'"]+)['"]/
                        const match = scriptContent.match(videoPattern)
                        if (match) {
                            playUrl = match[1]
                            $print('从脚本中找到播放源')
                        }
                    }
                }
            }
        }

        if (!playUrl) {
            $print('未找到播放源')
        } else if (!playUrl.startsWith('http')) {
            playUrl = new URL(playUrl, appConfig.site).href
            $print(`规范化播放源URL: ${playUrl}`)
        }

        return jsonify({
            urls: [playUrl],
            headers: [{
                'User-Agent': UA,
                'Referer': appConfig.site
            }]
        })
    } catch (error) {
        $print(`获取播放源出错: ${error.message}`)
        if (error.stack) {
            $print(`错误堆栈: ${error.stack}`)
        }
        return jsonify({
            urls: [],
            headers: []
        })
}
    }

