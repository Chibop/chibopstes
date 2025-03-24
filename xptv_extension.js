//1112
// 创建cheerio实例，用于HTML解析
const cheerio = createCheerio()
// 创建CryptoJS实例，用于加密解密操作
const CryptoJS = createCryptoJS()

// 设置用户代理，模拟Chrome浏览器访问，避免被网站识别为爬虫
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// 应用基本配置信息
let appConfig = {
    ver: 100,                              // 脚本版本号
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
    try {
        ext = argsify(ext)  // 解析传入的参数
        let tracks = []     // 存储播放列表
        let url = ext.url   // 获取视频详情页URL

        // 请求视频详情页
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
            },
        })

        const $ = cheerio.load(data)  // 解析HTML


        // 提取所有播放源
        $('#page-video').each((_, element) => {
            const vScope = $(element).attr('v-scope'); // 获取 v-scope 属性

        // 使用正则表达式提取数字
        const match = vScope.match(/Movie\(\{id:\s*(\d+),/);
        if (match) {
            id = match[1]; // 提取到的 ID
            }
            tracks.push({
                name: `默认`,               // 播放源名称
                pan: '',                       // 网盘链接(这里为空，因为是在线播放源)
                ext: {
                    url: `${appConfig.site}ajax/v/${id}/videos`,                 // 播放页面URL
                },
            })
        })


        // 返回播放列表
        return jsonify({
            list: [
                {
                    title: '默认分组',      // 分组标题
                    tracks,                 // 播放列表
                },
            ],
        })
    } catch (error) {
        console.error("请求播放列表失败:", error);
        await $fetch.get(`https://www.google.com/?data3=${error}`);
        return jsonify({
            error: "获取播放列表失败",
        });
    }
}

/**
 * 获取视频播放信息
 * 从播放页面解析出实际的视频播放地址
 * 包含两种不同的解析逻辑，应对不同的页面结构
 */
async function getPlayinfo(ext) {

    let cards = []
    ext = argsify(ext)              // 解析传入的参数
    
    let url = ext.url               // 获取播放页面URL

    const url2 = await processUrls(url);

    const { data } = await $fetch.get(url2, {
        headers: {
            'User-Agent': UA,
        },
    })
    const $ = cheerio.load(data)  // 解析HTML
    // 提取 body 中的内容
    const jsonString = $('body').html(); // 获取 <body> 标签中的内容
     // 解析 JSON 字符串
    const jsonData = JSON.parse(jsonString);    
     // 检查状态并提取 watch 数组
    if (jsonData.status === 200) {
    jsonData.result.watch.forEach(item => {
        const url = item.url;   // 获取 url
        cards.push(url)
    });
    } else {
    console.error("请求失败，状态码:", jsonData.status);
    }
    // await $fetch.get(cards);

    const url4 = await processUrl(cards);


    let url3 = 'https://s211.skyearth8.xyz/vod1/1/ib/8j5dgm0k_5c49e63b2f1fd71a94834ca146ad5672/720/v.m3u8'

    return jsonify({                // 返回播放信息，包括视频URL和请求头
        urls: [url3],
        headers: [{'User-Agent': UA, }], // 可选
    })


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
    let url = `${appConfig.site}search?keyword=${text}&page=${page}`

    // 请求搜索页面
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $ = cheerio.load(data)  // 解析HTML

    // 查找并遍历所有搜索结果
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

    // 返回搜索结果
    return jsonify({
        list: cards,
    })
}

// 定义一个新的函数，接收 URLs 数组
async function processUrls(url) {
    
    let results = url

    return results; // 返回所有结果
}

// 定义一个新的函数，接收 URLs 数组
async function processUrl(url) {
    
    let results = url
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
        },
    })

    const $data2 = cheerio.load(data)  // 解析HTML
    const playerDiv = $data2('#player').attr('v-scope');
    // 使用正则表达式提取 m3u8 地址
    const m3u8Match = playerDiv.match(/"stream":"(https:\/\/[^"]+\.m3u8)"/);
    const m3u8Url = m3u8Match ? m3u8Match[1] : null;
    await $fetch.get(`https://www.google.com/?data=${m3u8Url}`);


    return m3u8Url; // 返回所有结果
}
