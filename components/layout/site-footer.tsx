export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/60 py-10">
      <div className="section-shell grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-display text-sm uppercase tracking-[0.3em] text-slate-200">
            Solar System Observatory
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            真实参数、参考轨道、模型等级和来源透明度优先。当前 MVP 默认使用本地规范化快照与参考轨道缓存。
          </p>
        </div>
        <div className="text-sm text-slate-400">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-300">数据原则</div>
          <p className="mt-3 leading-6">
            真实物理参数与参考轨道分开展示；科学近似模型不会伪装成真实扫描模型。
          </p>
        </div>
        <div className="text-sm text-slate-400">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-300">MVP 说明</div>
          <p className="mt-3 leading-6">
            首页、系统页、详情页、搜索、来源页、脚本与 API 已全部接通；更高精度星历与官方模型可按 README 升级。
          </p>
        </div>
      </div>
    </footer>
  );
}
