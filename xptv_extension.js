const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

let appConfig = {
    ver: 1,
    title: '网页111格式化',
    site: 'https://123av.com',
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

    $print(`正在请求URL: ${appConfig.site}`)
    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)
    $print('页面加载完成，开始解析导航菜单')

    // 使用网站实际的导航菜单选择器
    $('#nav > li > ul > li > a').each((_, e) => {
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
    
    // 如果没有找到导航项，尝试其他常见选择器
    if (list.length === 0) {
        $print('尝试其他导航选择器')
        $('.nav-wrap a, .menu-item a').each((_, e) => {
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
    }

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

    // 优化分页处理逻辑
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
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), 10000)
            )
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析视频列表')
        
        // 使用网站实际的DOM结构选择器
        $('.box-item-list .box-item').each((_, element) => {
            const $element = $(element)
            const $link = $element.find('.thumb a').first()
            const $img = $element.find('.thumb img')
            const $title = $element.find('.detail a')
            const $duration = $element.find('.duration')
            
            const href = $link.attr('href')
            const title = $img.attr('alt') || $title.text().trim()
            const cover = $img.attr('data-src') || $img.attr('src')
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
            $print('页面结构片段:')
            $print($('body').html().substring(0, 500))
        } else {
            $print(`共解析到 ${cards.length} 个视频项`)
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
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), 10000)
            )
        ])

        if (!data) {
            throw new Error('未获取到数据')
        }

        const $ = cheerio.load(data)
        $print('页面加载完成，开始解析播放列表')

        // 优化播放列表选择器
        $('.paly_list_btn a, .module-play-list a, .video-episodes a, .stui-content__playlist a, .fed-play-item a').each((_, e) => {
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

        // 尝试获取预览图片和视频时长信息
        const previewUrl = $('.thumb').attr('data-preview')
        const duration = $('.duration').text().trim()
        if (previewUrl) {
            $print(`找到预览图片: ${previewUrl}`)
        }
        if (duration) {
            $print(`视频时长: ${duration}`)
        }

        // 尝试获取iframe源
        const jsurl = $('iframe[src*="player"], iframe[src*="play"], iframe[allowfullscreen]').attr('src')
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
