const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

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

    // 根据网页结构文档使用正确的导航菜单选择器
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
    
    // 如果没有找到导航项，尝试其他选择器
    if (list.length === 0) {
        $print('尝试其他导航选择器')
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
        
        // 根据网页结构文档使用正确的视频列表选择器
        $('.row.box-item-list.gutter-20 .box-item').each((_, element) => {
            const $element = $(element)
            const $link = $element.find('.thumb a').first()
            const $img = $element.find('.thumb img')
            const $title = $element.find('.detail a')
            const $duration = $element.find('.duration')
            
            const href = $link.attr('href')
            // 从img的title或alt属性获取视频代码
            const videoCode = $img.attr('title') || $img.attr('alt') || ''
            // 从detail > a的文本内容获取完整标题
            const fullTitle = $title.text().trim()
            // 使用data-src属性获取真实图片URL（懒加载）
            const cover = $img.attr('data-src') || $img.attr('src')
            const duration = $duration.text().trim()
            // 从thumb的data-preview属性获取预览图
            const preview = $element.find('.thumb').attr('data-preview') || ''
            
            // 提取视频ID
            let videoId = ''
            if (href) {
                videoId = href.replace('v/', '')
            }

            if (href && (videoCode || fullTitle)) {
                const title = fullTitle || videoCode
                $print(`解析到视频: ${title}, ID: ${videoId}`)
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

        // 如果没有找到视频，尝试其他常见选择器
        if (cards.length === 0) {
            $print('尝试其他视频列表选择器')
            $('.box-item, .video-item').each((_, element) => {
                const $element = $(element)
                const $link = $element.find('a').first()
                const $img = $element.find('img')
                const $duration = $element.find('.duration')
                
                const href = $link.attr('href')
                const title = $img.attr('alt') || $link.attr('title') || $element.find('.title').text().trim()
                const cover = $img.attr('data-src') || $img.attr('src')
                const duration = $duration.text().trim()
                
                if (href && title) {
                    $print(`解析到视频: ${title}`)
                    cards.push({
                        vod_id: href,
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: duration,
                        ext: {
                            url: href.startsWith('http') ? href : new URL(href, appConfig.site).href,
                        },
                    })
                }
            })
        }

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

        // 123av网站通常只有一个播放源，直接添加默认播放项
        tracks.push({
            name: '默认播放源',
            pan: '',
            ext: {
                url: url
            },
        })

        // 尝试查找其他可能的播放列表
        $('.paly_list_btn a, .module-play-list a, .video-episodes a').each((_, e) => {
            const name = $(e).text().trim()
            const href = $(e).attr('href')
            
            if (href && name && tracks.length === 1) { // 如果已经有默认播放源，只添加其他不同的播放源
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
                    // 尝试解密播放源
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
                    // 尝试其他解析方式
                    const videoSrc = $('video source').attr('src') || $('video').attr('src')
                    if (videoSrc) {
                        $print('找到直接的视频源')
                        playUrl = videoSrc
                    } else {
                        // 尝试从script标签中查找播放源
                        const scriptContent = $('script:contains("player")').text()
                        const videoPattern = /url:\s*['"]([^'"]+)['"]|source:\s*['"]([^'"]+)['"]|video:\s*['"]([^'"]+)['"]|playUrl:\s*['"]([^'"]+)['"]/
                        const match = scriptContent.match(videoPattern)
                        if (match) {
                            playUrl = match[1] || match[2] || match[3] || match[4]
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
