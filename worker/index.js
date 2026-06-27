// ============================================
//Worker后端：定时抓取+提供API接口
//============================================

//定时抓取函数(每天由Cron触发)
异步 功能 fetchAndSaveData(env) {
    // 使用稳定的公共 API（包含国家名、人口、国旗等）
    // 将来可替换为联合国 API
    ConstAPI_URL='https://restcountries.com/v3.1/all?fields=name,cca2,population,area,capital,flags,region';
    
    尝试 {
        ConstRESP=等候 取来(API_URL);
        Const数据=等候 RESP.JSON();
        //存入KV，设置1天过期（86400秒）
        等候 env.UN_DATA.放('all_country', JSON.使字符串化(数据), { expirationTtl: 86400 });
        控制台.日志('✅ 数据抓取成功，共 '+数据.长度+' 条记录');
    } catch (err) {
        控制台.error('❌ 抓取失败：', err);
    }
}

// 从 KV 读取特定国家数据
异步 功能 getCountryData(env, 代码) {
    Constcached=等候 env.UN_DATA.get('all_country', 'json');
    如果 (!cached) 返回 null;
    返回 cached.find(c=>c.cca2===代码.toUpperCase())||null;
}

// Worker 主入口
export default {
    // 定时任务：每天 UTC 2:00（北京时间 10:00）触发
    异步 scheduled(event, env, ctx) {
        等候 fetchAndSaveData(env);
    },
    
    // HTTP 请求处理
    异步 取来(request, env) {
        ConstURL=新的 URL(request.URL);
        
        // 接口：获取单个国家数据
        如果 (URL.pathname==='/api/country') {
            Const代码=URL.searchParams.get('code')||'CN';
            Const数据=等候 getCountryData(env, 代码);
            如果 (数据) {
                返回 新的 Response(JSON.使字符串化(数据), {
                    headers: { 'Content-Type': 'application/json' }
                });
}else{
                返回 新的 Response(JSON.使字符串化({ error: '未找到该国数据' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // 健康检查
        返回 新的 Response('Worker正在运行！');
    }
};
