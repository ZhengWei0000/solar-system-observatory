import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { featuredTopics } from "@/lib/content/topics";

export default function LearnPage() {
  return (
    <div className="section-shell space-y-8 py-10">
      <SectionHeading
        eyebrow="Learn"
        title="学习专题"
        description="专题内容优先采用 NASA / JPL / IAU 等权威资料，并补充可追溯学术论文链接。"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featuredTopics.map((topic) => (
          <article key={topic.id} className="glass-panel rounded-3xl p-6">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">{topic.readingMinutes} min</div>
            <h2 className="mt-4 font-display text-2xl text-slate-50">{topic.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{topic.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {topic.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <h3 className="text-xs uppercase tracking-[0.24em] text-slate-400">关键学习点</h3>
              <ul className="space-y-2 text-sm leading-6 text-slate-300">
                {topic.keyLearnings.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <h3 className="text-xs uppercase tracking-[0.24em] text-slate-400">可信资料</h3>
              <ul className="space-y-3 text-sm text-slate-200">
                {topic.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-cyan-200 transition hover:text-cyan-100"
                    >
                      <span>{source.title}</span>
                      <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                        {source.reliability === "official" ? "Official" : "Peer Review"}
                      </span>
                    </a>
                    <div className="mt-1 text-xs text-slate-400">{source.publisher}</div>
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/sources" className="mt-6 inline-flex text-sm text-amber-200">
              查看数据来源与术语说明
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
