/**
 * 123AV XPTV 扩展脚本
 * 作者: 示例作者
 * 版本: 1.0
 * 描述: 123AV网站的视频资源脚本
 */

// 基础配置
const BASE_URL = 'https://123av.com';
const API_URL = `${BASE_URL}/zh`;
const IMG_BASE = 'https://cdn.123av.com';

const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36';

/**
 * 获取配置信息
 */
async function getConfig() {
  const appConfig = {
    ver: 1,
    title: "123AV",
    site: BASE_URL,
    tabs: [
      {
        name: '最近更新',
        ext: {
          api: 'recent',
          page: 1
        },
      },
      {
        name: '热门视频',
        ext: {
          api: 'trending',
          page: 1
        },
      },
      {
        name: '今日热门',
        ext: {
          api: 'today-hot',
          page: 1
        },
      },
      {
        name: '审查内容',
        ext: {
          api: 'censored',
          page: 1
        },
      },
      {
        name: '未审查内容',
        ext: {
          api: 'uncensored',
          page: 1
        },
      }
    ]
  };
  return jsonify(appConfig);
}

/**
 * 获取视频卡片
 */
async function getCards(ext) {
  ext = argsify(ext);
  const { api, page } = ext;
  
  let url = `${API_URL}/dm2/${api}`;
  if (page > 1) {
    url += `?page=${page}`;
  }
  
  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': PC_UA,
      'Referer': BASE_URL
    }
  });
  
  const html = data;
  const $ = cheerio.load(html);
  
  let cards = [];
  $('.box-item').each((index, element) => {
    const title = $(element).find('.detail a').text().trim();
    const link = $(element).find('.detail a').attr('href');
    const image = $(element).find('.thumb img').attr('data-src') || $(element).find('.thumb img').attr('src');
    const remarks = $(element).find('.duration').text().trim();
    const id = link.split('/').pop();
    
    if (link && title) {
      cards.push({
        vod_id: id,
        vod_name: title,
        vod_pic: image,
        vod_remarks: remarks,
        ext: {
          url: `${BASE_URL}${link}`
        }
      });
    }
  });
  
  const hasNext = $('.pagination .page-item:last-child').hasClass('disabled') === false;
  
  return jsonify({
    list: cards,
    nextPage: hasNext ? page + 1 : null
  });
}

/**
 * 获取播放列表
 */
async function getTracks(ext) {
  ext = argsify(ext);
  const { url } = ext;
  
  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': PC_UA,
      'Referer': BASE_URL
    }
  });
  
  const html = data;
  const $ = cheerio.load(html);
  
  const title = $('h1.title').text().trim();
  const videoId = url.split('/').pop();
  
  // 查找视频播放地址
  let videoUrl = '';
  const scriptContent = $('script:contains("window.videos")').html();
  if (scriptContent) {
    const match = scriptContent.match(/window\.videos\s*=\s*(\[.+?\])/s);
    if (match && match[1]) {
      try {
        const videos = JSON.parse(match[1]);
        if (videos && videos.length > 0 && videos[0].url) {
          videoUrl = videos[0].url;
        }
      } catch (e) {
        $print("解析视频地址出错: " + e.message);
      }
    }
  }
  
  return jsonify({
    list: [{
      title: '默认线路',
      tracks: [{
        name: title,
        ext: {
          url: videoUrl || url
        }
      }]
    }]
  });
}

/**
 * 获取播放信息
 */
async function getPlayinfo(ext) {
  ext = argsify(ext);
  let url = ext.url;
  
  // 如果没有直接获取到视频URL，尝试再次访问详情页解析
  if (url.includes('123av.com/zh/v/')) {
    const { data } = await $fetch.get(url, {
      headers: {
        'User-Agent': PC_UA,
        'Referer': BASE_URL
      }
    });
    
    const $ = cheerio.load(data);
    const scriptContent = $('script:contains("window.videos")').html();
    if (scriptContent) {
      const match = scriptContent.match(/window\.videos\s*=\s*(\[.+?\])/s);
      if (match && match[1]) {
        try {
          const videos = JSON.parse(match[1]);
          if (videos && videos.length > 0 && videos[0].url) {
            url = videos[0].url;
          }
        } catch (e) {
          $print("解析视频地址出错: " + e.message);
        }
      }
    }
  }
  
  return jsonify({ 
    urls: [url],
    headers: [{
      'User-Agent': PC_UA,
      'Referer': BASE_URL
    }]
  });
}

/**
 * 搜索功能
 */
async function search(ext) {
  ext = argsify(ext);
  const { wd, page = 1 } = ext;
  
  const searchUrl = `${API_URL}/search?q=${encodeURIComponent(wd)}&page=${page}`;
  
  const { data } = await $fetch.get(searchUrl, {
    headers: {
      'User-Agent': PC_UA,
      'Referer': BASE_URL
    }
  });
  
  const html = data;
  const $ = cheerio.load(html);
  
  let cards = [];
  $('.box-item').each((index, element) => {
    const title = $(element).find('.detail a').text().trim();
    const link = $(element).find('.detail a').attr('href');
    const image = $(element).find('.thumb img').attr('data-src') || $(element).find('.thumb img').attr('src');
    const remarks = $(element).find('.duration').text().trim();
    const id = link.split('/').pop();
    
    if (link && title) {
      cards.push({
        vod_id: id,
        vod_name: title,
        vod_pic: image,
        vod_remarks: remarks,
        ext: {
          url: `${BASE_URL}${link}`
        }
      });
    }
  });
  
  const hasNext = $('.pagination .page-item:last-child').hasClass('disabled') === false;
  
  return jsonify({
    list: cards,
    nextPage: hasNext ? page + 1 : null
  });
} 
