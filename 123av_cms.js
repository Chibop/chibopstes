const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let cmsConfig = {
    ver: 2,
    title: '123AV-CMS',
    site: 'https://123av.com/zh/'
};

async function getTabs() {
    let tabs = [];
    try {
        const $ = await fetchPage(cmsConfig.site);
        
        // 解析导航菜单
        $('#nav > li > a').each((_, element) => {
            const $link = $(element);
            const name = $link.text().trim();
            const href = $link.attr('href');
            
            if (!isIgnoredTab(name)) {
                tabs.push({
                    name,
                    ext: {
                        url: normalizeUrl(href),
                        lang: detectLanguage(href)
                    }
                });
            }
        });

        if (tabs.length === 0) {
            tabs.push(createDefaultTab());
        }

    } catch (error) {
        handleError('获取导航失败', error);
    }
    return jsonify(tabs);
}

async function getTracks(ext) {
    ext = argsify(ext);
    let tracks = [];
    try {
        const $ = await fetchPage(ext.url);
        
        // 解析分集信息
        $('.paly_list_btn').each((_, element) => {
            const $btn = $(element);
            tracks.push({
                name: $btn.text().trim(),
                ext: {
                    url: normalizeUrl($btn.attr('href')),
                    quality: detectQuality($btn.text())
                }
            });
        });

    } catch (error) {
        handleError('获取分集失败', error);
    }
    return jsonify({ list: [{ title: '播放源', tracks }] });
}

// 工具函数
function isIgnoredTab(name) {
    return ['关于', '公告', '官方'].some(ignore => name.includes(ignore));
}

function detectLanguage(href) {
    return href.match(/\/(zh|en|ja)\//)?.[1] || 'zh';
}

function normalizeUrl(href) {
    return href.startsWith('http') ? href : new URL(href, cmsConfig.site).href;
}

function createDefaultTab() {
    return {
        name: '最新内容',
        ext: {
            url: cmsConfig.site,
            lang: 'zh'
        }
    };
}

function handleError(context, error) {
    $print(`${context}: ${error.message}`);
    if (error.stack) {
        $print(`堆栈追踪: ${error.stack}`);
    }
}
