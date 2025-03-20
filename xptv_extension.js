//1112
// 创建cheerio实例，用于HTML解析
const cheerio = createCheerio()
// 创建CryptoJS实例，用于加密解密操作
const CryptoJS = createCryptoJS()

// 设置用户代理，模拟Chrome浏览器访问，避免被网站识别为爬虫
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// 应用基本配置信息
let appConfig = {
    ver: 9,                              // 脚本版本号
    title: '123av',                       // 显示的站点名称
    site: 'https://123av.com/zh/',   // 网站基础URL
}

/**
 * 获取应用配置信息，包括标签列表
 * 此函数是XPTV脚本的入口点，返回整体配置信息
 */
async function getConfig() {
    let config = appConfig
    config.tabs = await getTabs()  // 动态获取网站的分类标签
    return jsonify(config)         // 转换为JSON格式返回
}

/**
 * 获取网站的分类标签
 * 从网站首页提取导航菜单分类
 * 排除不需要的分类（如关于、公告等）
 */
async function getTabs() {
    let list = []
    // 定义需要忽略的分类名称关键词
    let ignore = ['类型', '制作人', '女演员', '系列', '24av', 'ThePornDude']
    // 检查分类名是否包含需要忽略的关键词
    function isIgnoreClassName(className) {
        return ignore.some((element) => className.includes(element))
    }

    // 请求网站首页
    const { data } = await $fetch.get(appConfig.site, {
        headers: {
            'User-Agent': UA,  // 使用预定义的User-Agent
        },
    })
    const $ = cheerio.load(data)  // 使用cheerio加载HTML，便于解析

    // 查找导航菜单中的所有分类链接
    let allClass = $('ul#nav > li.has-child > ul > li > a')
    allClass.each((i, e) => {
        const name = $(e).text()           // 获取分类名称
        const href = $(e).attr('href')     // 获取分类链接
        const isIgnore = isIgnoreClassName(name)  // 检查是否需要忽略
        if (isIgnore) return  // 如果需要忽略则跳过

        // 添加到分类列表
        list.push({
            name,  // 分类名称
            ext: {
                url: appConfig.site + href,  // 完整的分类URL
            },
        })
    })

    return list  // 返回分类列表
}

/**
 * 获取视频卡片列表
 * 根据分类URL获取该分类下的视频列表
 * 支持分页加载
 */
async function getCards(ext) {
    ext = argsify(ext)  // 解析传入的参数
    let cards = []      // 存储视频卡片信息
    let { page = 1, url } = ext  // 获取页码和URL，默认为第一页

    // 处理分页URL
    if (page > 1) {
        url += `?page=${page}`  // 网站分页格式：/page/页码
    }

    // 请求分类页面
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)  // 解析HTML

    // 查找并遍历所有视频卡片
    $('.box-item-list .box-item').each((_, element) => {
        const href = $(element).find('a').attr('href'); // 视频详情链接
        const title = $(element).find('img').attr('alt'); // 视频标题
        const cover = $(element).find('img').attr('data-src'); // 视频封面图
        const duration = $(element).find('.duration').text(); // 视频时长
        // 添加视频卡片信息
        cards.push({
            vod_id: href,                 // 视频ID(使用链接作为ID)
            vod_name: title,              // 视频名称
            vod_pic: cover,               // 视频封面
            vod_remarks: duration,  // 视频时长
            ext: {
                url: appConfig.site + href,               // 视频详情页URL
            },
        })
    })

    // 返回视频卡片列表
    return jsonify({
        list: cards,
    })
}

/**
 * 获取视频播放列表
 * 从视频详情页提取各个播放源和网盘链接
 */
async function getTracks(ext) {
    ext = argsify(ext)  // 解析传入的参数
    let tracks = []     // 存储播放列表
    let url = ext.url   // 获取视频详情页URL
    await $fetch.get(`https://www.google.com/?${url}`)

    // 请求视频详情页
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)  // 解析HTML

    // 提取所有播放源
    $('link[rel="alternate').each((_, e) => {
        const name = $(element).attr('hreflang')           // 播放源名称
        const href = $(element).attr('href')     // 播放页面链接
        tracks.push({
            name: `${name}`,               // 播放源名称
            pan: '',                       // 网盘链接(这里为空，因为是在线播放源)
            ext: {
                url: href,                 // 播放页面URL
            },
        })
    })

    // 注释掉的提示消息
    // $utils.toastInfo('不能看的在群裡回報')

    // 返回播放列表
    return jsonify({
        list: [
            {
                title: '默认分组',      // 分组标题
                tracks,                 // 播放列表
            },
        ],
    })
}

/**
 * 获取视频播放信息
 * 从播放页面解析出实际的视频播放地址
 * 包含两种不同的解析逻辑，应对不同的页面结构
 */
async function getPlayinfo(ext) {
    ext = argsify(ext)         // 解析传入的参数
    const url = ext.url        // 获取播放页面URL

    // 请求播放页面
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })
    let playurl                // 存储最终的播放URL

    try {
        const $ = cheerio.load(data)  // 解析HTML

        // 解析方法1：通过iframe获取播放器链接
        const jsurl = $('iframe').attr('src')
        if (jsurl) {
            // 设置请求头
            let headers = {
                'user-agent': UA,
            }
            // 特殊处理player-v2链接
            if (jsurl.includes('player-v2')) {
                headers['sec-fetch-dest'] = 'iframe'
                headers['sec-fetch-mode'] = 'navigate'
                headers['referer'] = `${appConfig.site}/`
            }

            // 请求播放器页面
            const jsres = await $fetch.get(jsurl, { headers: headers })
            const $2 = cheerio.load(jsres.data)
            const scripts = $2('script')
            if (scripts.length - 2 > 0) {
                // 获取倒数第二个script标签的内容
                let code = scripts.eq(scripts.length - 2).text()

                // 解析方法1.1：处理var player格式的加密
                if (code.includes('var player')) {
                    // 提取加密数据和随机密钥
                    let player = code.match(/var player = "(.*?)"/)
                    let rand = code.match(/var rand = "(.*?)"/)

                    // AES解密函数
                    function decrypt(text, key, iv, type) {
                        let key_value = CryptoJS.enc.Utf8.parse(key || 'PBfAUnTdMjNDe6pL')
                        let iv_value = CryptoJS.enc.Utf8.parse(iv || 'sENS6bVbwSfvnXrj')
                        let content
                        if (type) {
                            // 加密
                            content = CryptoJS.AES.encrypt(text, key_value, {
                                iv: iv_value,
                                mode: CryptoJS.mode.CBC,
                                padding: CryptoJS.pad.Pkcs7,
                            })
                        } else {
                            // 解密
                            content = CryptoJS.AES.decrypt(text, key_value, {
                                iv: iv_value,
                                padding: CryptoJS.pad.Pkcs7,
                            }).toString(CryptoJS.enc.Utf8)
                        }
                        return content
                    }

                    // 使用AES解密获取播放信息
                    let content = JSON.parse(decrypt(player[1], 'VFBTzdujpR9FWBhe', rand[1]))
                    $print(JSON.stringify(content))
                    playurl = content.url  // 提取播放URL
                } else {
                    // 解析方法1.2：处理另一种加密格式
                    // 提取加密数据
                    let data = code.split('"data":"')[1].split('"')[0]
                    // 字符串反转
                    let encrypted = data.split('').reverse().join('')
                    let temp = ''
                    // 十六进制解码
                    for (let i = 0x0; i < encrypted.length; i = i + 0x2) {
                        temp += String.fromCharCode(parseInt(encrypted[i] + encrypted[i + 0x1], 0x10))
                    }
                    // 提取有效部分，去除混淆数据
                    playurl = temp.substring(0x0, (temp.length - 0x7) / 0x2) + temp.substring((temp.length - 0x7) / 0x2 + 0x7)
                }
            }
        } else {
            // 解析方法2：处理window.wp_nonce格式
            const script = $('script:contains(window.wp_nonce)')
            if (script.length > 0) {
                let code = script.eq(0).text()
                // 提取JavaScript代码
                let group = code.match(/(var.*)eval\((\w*\(\w*\))\)/)
                const md5 = CryptoJS
                // 执行JavaScript代码获取结果
                const result = eval(group[1] + group[2])
                // 提取播放URL
                playurl = result.match(/url:.*?['"](.*?)['"]/)[1]
            }
        }
    } catch (error) {
        $print(error)  // 输出错误信息以便调试
    }

    // 返回播放信息，包括视频URL和请求头
    return jsonify({ urls: [playurl], headers: [{ 'User-Agent': UA }] })
}

/**
 * 搜索功能
 * 根据关键词搜索视频
 * 支持分页
 */
async function search(ext) {
    ext = argsify(ext)  // 解析传入的参数
    let cards = []      // 存储搜索结果

    let text = encodeURIComponent(ext.text)  // URL编码搜索关键词
    let page = ext.page || 1                 // 获取页码，默认为第一页
    // 构建搜索URL，网站使用特殊的URL路径进行搜索
    let url = `${appConfig.site}/daoyongjiek0shibushiyoubing?q=${text}$f=_all&p=${page}`

    // 请求搜索页面
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)  // 解析HTML

    // 查找并遍历所有搜索结果
    $('div.bt_img > ul li').each((_, element) => {
        const href = $(element).find('a').attr('href')              // 视频详情链接
        const title = $(element).find('img.thumb').attr('alt')      // 视频标题
        const cover = $(element).find('img.thumb').attr('data-original')  // 视频封面图
        const subTitle = $(element).find('.jidi span').text()       // 剧集信息
        const hdinfo = $(element).find('.hdinfo .qb').text()        // 清晰度信息
        // 添加搜索结果信息
        cards.push({
            vod_id: href,                 // 视频ID(使用链接作为ID)
            vod_name: title,              // 视频名称
            vod_pic: cover,               // 视频封面
            vod_remarks: subTitle || hdinfo,  // 备注信息(优先显示剧集信息，其次是清晰度)
            url: href,                    // 视频详情页URL(冗余字段)
            ext: {
                url: href,                // 视频详情页URL
            },
        })
    })

    // 返回搜索结果
    return jsonify({
        list: cards,
    })
}
