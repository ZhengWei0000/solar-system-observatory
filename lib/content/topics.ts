import type { FeaturedTopic } from "@/types";

export const featuredTopics: FeaturedTopic[] = [
  {
    id: "what-is-natural-satellite",
    slug: "what-is-natural-satellite",
    title: "什么是天然卫星",
    description: "从引力束缚、分类与命名规范理解天然卫星的科学定义，并区分规则卫星与不规则卫星。",
    tags: ["基础概念", "系统结构"],
    readingMinutes: 5,
    keyLearnings: [
      "天然卫星的核心定义是长期受母天体引力束缚并稳定绕行。",
      "规则卫星多在赤道附近顺行，不规则卫星常呈高倾角或逆行。",
      "命名和发现记录由 IAU 与 JPL SSD 等机构持续维护。"
    ],
    sources: [
      {
        title: "Moons Overview",
        publisher: "NASA Solar System Exploration",
        url: "https://solarsystem.nasa.gov/moons/overview/",
        reliability: "official"
      },
      {
        title: "Planetary Satellite Discovery Circumstances",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/discovery.html",
        reliability: "official"
      },
      {
        title: "Naming of Astronomical Objects",
        publisher: "IAU",
        url: "https://www.iau.org/public/themes/naming/",
        reliability: "official"
      }
    ]
  },
  {
    id: "retrograde-moons",
    slug: "retrograde-moons",
    title: "什么是逆行卫星",
    description: "结合观测与动力学研究理解逆行卫星的轨道特征及其与俘获起源的关系。",
    tags: ["轨道力学", "捕获过程"],
    readingMinutes: 7,
    keyLearnings: [
      "逆行卫星相对母行星自转方向反向运行，多见于不规则卫星群。",
      "高倾角与高离心率通常暗示俘获过程，而非原位共盘形成。",
      "Triton 等逆行大卫星是研究捕获动力学的重要样本。"
    ],
    sources: [
      {
        title: "Triton: Neptune's Largest Moon",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/neptune/moons/triton/",
        reliability: "official"
      },
      {
        title: "Planetary Satellite Orbits & Ephemerides",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/orbits.html",
        reliability: "official"
      },
      {
        title: "Irregular Satellites of the Planets",
        publisher: "Annual Review / arXiv",
        url: "https://arxiv.org/abs/astro-ph/0610056",
        reliability: "peer_review"
      }
    ]
  },
  {
    id: "why-no-moons",
    slug: "why-no-moons",
    title: "为什么有些行星没有卫星",
    description: "以水星与金星为例，结合潮汐演化、希尔球尺度和形成历史分析“无卫星”现象。",
    tags: ["行星形成", "比较行星学"],
    readingMinutes: 6,
    keyLearnings: [
      "靠近太阳会缩小行星希尔球，降低长期稳定卫星轨道空间。",
      "潮汐演化与早期碰撞历史会影响卫星形成与长期留存。",
      "水星与金星的当前“无天然卫星”状态是多因素共同作用结果。"
    ],
    sources: [
      {
        title: "Mercury Facts",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/mercury/facts/",
        reliability: "official"
      },
      {
        title: "Venus Facts",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/venus/venus-facts/",
        reliability: "official"
      },
      {
        title: "Planetary Satellite Discovery Circumstances",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/discovery.html",
        reliability: "official"
      }
    ]
  },
  {
    id: "orbital-resonance",
    slug: "orbital-resonance",
    title: "什么是轨道共振",
    description: "从木卫一-木卫二-木卫三拉普拉斯共振入手理解多体系统中周期锁定与能量耗散。",
    tags: ["轨道共振", "木星系统"],
    readingMinutes: 8,
    keyLearnings: [
      "轨道共振指多个天体轨道周期接近简单整数比并长期耦合。",
      "拉普拉斯共振维持木卫系统长期节律并驱动潮汐加热。",
      "共振结构可连接轨道动力学、内部热历史与可居住性评估。"
    ],
    sources: [
      {
        title: "Jupiter's Moons Overview",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/jupiter/moons/",
        reliability: "official"
      },
      {
        title: "Europa Facts",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/jupiter/moons/europa/facts/",
        reliability: "official"
      },
      {
        title: "Melting of Io by Tidal Dissipation",
        publisher: "Science (1979)",
        url: "https://www.science.org/doi/10.1126/science.203.4383.892",
        reliability: "peer_review"
      }
    ]
  },
  {
    id: "saturn-complexity",
    slug: "saturn-complexity",
    title: "为什么土星系统如此复杂",
    description: "通过土星环、牧羊卫星、冰卫星与不规则卫星群理解多尺度系统耦合与长期演化。",
    tags: ["土星", "系统演化"],
    readingMinutes: 9,
    keyLearnings: [
      "土星环与邻近卫星在角动量交换中共同演化。",
      "内侧冰卫星与外侧不规则卫星群反映不同形成和俘获历史。",
      "Cassini 观测显著提升了对土星系统复杂性的量化理解。"
    ],
    sources: [
      {
        title: "Saturn Overview",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/saturn/",
        reliability: "official"
      },
      {
        title: "Enceladus",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/saturn/moons/enceladus/",
        reliability: "official"
      },
      {
        title: "Cassini Mission",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/mission/cassini/",
        reliability: "official"
      }
    ]
  },
];
