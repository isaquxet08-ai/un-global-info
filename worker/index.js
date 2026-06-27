// ============================================
// Worker 后端：定时抓取 + 提供 API 接口
// ============================================

// 定时抓取函数（每天由 Cron 触发）
async function fetchAndSaveData(env) {
    // 使用稳定的公共 API（包含国家名、人口、国旗等）
    const API_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,population,area,capital,flags,region';
    
    try {
        const resp = await fetch(API_URL);
        const data = await resp.json();
        // 存入 KV，设置 1 天过期（86400 秒）
        await env.UN_DATA.put('all_countries', JSON.stringify(data), { expirationTtl: 86400 });
        console.log('✅ 数据抓取成功，共 ' + data.length + ' 条记录');
    } catch (err) {
        console.error('❌ 抓取失败：', err);
    }
}

// 从 KV 读取特定国家数据
async function getCountryData(env, code) {
    const cached = await env.UN_DATA.get('all_countries', 'json');
    if (!cached) return null;
    return cached.find(c => c.cca2 === code.toUpperCase()) || null;
}

// Worker 主入口
export default {
    // 定时任务：每天 UTC 0,6,12,18 点（北京时间 8,14,20,次日2点）
    async scheduled(event, env, ctx) {
        await fetchAndSaveData(env);
    },
    
    // HTTP 请求处理
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
