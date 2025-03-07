/**
 * 123AV XPTV 扩展脚本
 * 作者: 示例作者
 * 版本: 1.3
 * 描述: 123AV网站的视频资源脚本
 */

// 初始化必要的库
const cheerio = createCheerio()
const CryptoJS = createCryptoJS()

// 基础配置
const BASE_URL = 'https://123av.com';
const API_URL = BASE_URL;
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
          api: '/zh/recent',
          page: 1
        },
      },
      {
        name: '热门视频',
        ext: {
          api: '/zh/trending',
          page: 1
        },
      },
      {
        name: '今日热门',
        ext: {
          api: '/zh/today-hot',
          page: 1
        },
      },
      {
        name: '审查内容',
        ext: {
          api: '/zh/censored',
          page: 1
        },
      },
      {
        name: '未审查内容',
        ext: {
          api: '/zh/uncensored',
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
  
  let url = `${BASE_URL}${api}`;
  if (page > 1) {
    url += `?page=${page}`;
  }
  
  $print("请求URL: " + url);
  
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
    
    if (link && title) {
      cards.push({
        vod_id: link,
        vod_name: title,
        vod_pic: image,
        vod_remarks: remarks,
        ext: {
          url: `${BASE_URL}${link}`
        }
      });
    }
  });
  
  $print("找到卡片数量: " + cards.length);
  
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
  
  $print("获取播放列表URL: " + url);
  
  const { data } = await $fetch.get(url, {
    headers: {
      'User-Agent': PC_UA,
      'Referer': BASE_URL
    }
  });
  
  const html = data;
  const $ = cheerio.load(html);
  
  const title = $('h1.title').text().trim();
  
  // 查找视频播放地址
  let videoUrl = '';
  try {
    // 尝试从页面脚本中提取视频URL
    const scriptContent = $('script').text();
    const match = scriptContent.match(/window\.videos\s*=\s*(\[.+?\])/s);
    if (match && match[1]) {
      const videos = JSON.parse(match[1]);
      if (videos && videos.length > 0 && videos[0].url) {
        videoUrl = videos[0].url;
        $print("成功从脚本中提取视频URL: " + videoUrl);
      }
    }
    
    // 如果上面的方法失败，尝试使用类似czzy.js的方法
    if (!videoUrl) {
      const iframe = $('iframe');
      if (iframe.length > 0) {
        const iframeSrc = iframe.attr('src');
        if (iframeSrc) {
          $print("找到iframe，尝试获取: " + iframeSrc);
          const { data: iframeData } = await $fetch.get(iframeSrc, {
            headers: {
              'User-Agent': PC_UA,
              'Referer': url
            }
          });
          
          const $iframe = cheerio.load(iframeData);
          const scripts = $iframe('script');
          
          for (let i = 0; i < scripts.length; i++) {
            const scriptText = $iframe(scripts[i]).html();
            if (scriptText && scriptText.includes('var player') || scriptText.includes('url:')) {
              $print("找到可能包含视频URL的脚本");
              // 这里可以添加类似于czzy.js中的解析逻辑
            }
          }
        }
      }
    }
  } catch (e) {
    $print("解析视频地址时出错: " + e.message);
  }
  
  return jsonify({
    list: [{
      title: '默认线路',
      tracks: [{
        name: title || '默认',
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
  
  $print("获取播放信息URL: " + url);
  
  // 如果没有直接获取到视频URL，尝试再次访问详情页解析
  if (!url.includes('http') || url.includes('123av.com')) {
    const { data } = await $fetch.get(url, {
      headers: {
        'User-Agent': PC_UA,
        'Referer': BASE_URL
      }
    });
    
    const $ = cheerio.load(data);
    
    try {
      const scriptContent = $('script').text();
      const match = scriptContent.match(/window\.videos\s*=\s*(\[.+?\])/s);
      if (match && match[1]) {
        const videos = JSON.parse(match[1]);
        if (videos && videos.length > 0 && videos[0].url) {
          url = videos[0].url;
          $print("成功从详情页提取视频URL: " + url);
        }
      }
      
      // 如果还是没有找到视频URL，尝试从video标签获取
      if (!url || url === ext.url) {
        const videoTag = $('video source');
        if (videoTag.length > 0) {
          const src = videoTag.attr('src');
          if (src) {
            url = src;
            $print("从video标签获取URL: " + url);
          }
        }
      }
    } catch (e) {
      $print("解析视频地址出错: " + e.message);
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
  
  // 修正搜索URL
  const searchUrl = `${BASE_URL}/zh/search?q=${encodeURIComponent(wd)}&page=${page}`;
  $print("搜索URL: " + searchUrl);
  
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
    
    if (link && title) {
      cards.push({
        vod_id: link,
        vod_name: title,
        vod_pic: image,
        vod_remarks: remarks,
        ext: {
          url: `${BASE_URL}${link}`
        }
      });
    }
  });
  
  $print("搜索结果数量: " + cards.length);
  
  const hasNext = $('.pagination .page-item:last-child').hasClass('disabled') === false;
  
  return jsonify({
    list: cards,
    nextPage: hasNext ? page + 1 : null
  });
} 
