const cheerio = createCheerio();
const CryptoJS = createCryptoJS();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let vodConfig = {
    ver: 2,
    title: '123AV-VOD',
    site: 'https://123av.com/zh/'
};

async function getCards(ext) {
    ext = argsify(ext);
    const { page = 1, url } = ext;
    let cards = [];

    try {
        const pageUrl = buildPagination(url, page);
        const $ = await fetchPage(pageUrl);
        
        // 解析视频列表
        $('.row.box-item-list .box-item').each((_, element) => {
            const $el = $(element);
            const videoLink = $el.find('.thumb a').first();
            
            cards.push({
                vod_id: extractVideoId(videoLink.attr('href')),
                vod_name: $el.find('.detail a').text().trim(),
                vod_pic: parseLazyImage($el.find('img')),
                vod_remarks: $el.find('.duration').text().trim(),
                ext: {
                    url: normalizeUrl(videoLink.attr('href')),
                    preview: $el.find('.thumb').data('preview')
                }
            });
        });

    } catch (error) {
        handleError('获取视频列表失败', error);
    }
    return jsonify({ list: cards });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    try {
        const $ = await fetchPage(ext.url);
        const iframeSrc = $('iframe[src*="player"]').attr('src');
        const decryptedData = await decryptPlayerSource(iframeSrc);
        
        return jsonify({
            urls: [decryptedData.url],
            headers: { Referer: iframeSrc }
        });

    } catch (error) {
        handleError('解析播放地址失败', error);
        return jsonify({ urls: [] });
    }
}

// 工具函数
function parseLazyImage($img) {
    return $img.data('src') || $img.attr('src') || '';
}

function extractVideoId(href) {
    return (href || '').split('/v/').pop().replace('/', '');
}

async function decryptPlayerSource(url) {
    const { data } = await $fetch.get(url);
    const encryptedStr = data.match(/var player = "(.*?)"/)[1];
    return CryptoJS.AES.decrypt(encryptedStr, 'VFBTzdujpR9FWBhe', {
        iv: CryptoJS.enc.Utf8.parse('sENS6bVbwSfvnXrj')
    }).toString(CryptoJS.enc.Utf8);
}
