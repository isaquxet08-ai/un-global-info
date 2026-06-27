// 定时抓取函数
async function fetchAndSaveData(env) {
    const API_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,population,area,capital,flags,region';
    try {
        const resp = await fetch(API_URL);
        const data = await resp.json();
        await env.UN_DATA.put('all_countries', JSON.stringify(data), { expirationTtl: 86400 });
        console.log('✅ 数据抓取成功，共 ' + data.length + ' 条记录');
    } catch (err) {
        console.error('❌ 抓取失败：', err);
    }
}

// 从 KV 读取数据
async function getCountryData(env, code) {
    const cached = await env.UN_DATA.get('all_countries', 'json');
    if (!cached) return null;
    return cached.find(c => c.cca2 === code.toUpperCase()) || null;
}

// Worker 主入口
export default {
    // 定时任务
    async scheduled(event, env, ctx) {
        await fetchAndSaveData(env);
    },
    // HTTP 请求处理 —— 必须放在这里！
    async fetch(request, env) {
        const url = new URL(request.url);
        // 接口：获取单个国家数据
        if (url.pathname === '/api/country') {
            const code = url.searchParams.get('code') || 'CN';
            const data = await getCountryData(env, code);
            if (data) {
                return new Response(JSON.stringify(data), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({ error: '未找到该国数据' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        // 健康检查
        return new Response('Worker is running!');
    }
};