import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Session cookie - loaded from .env file
const SESSION_COOKIE = process.env.SESSION_COOKIE;

app.use(express.static(path.join(__dirname)));

// API endpoint to fetch ideas
app.get('/api/ideas', async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const response = await fetch(`https://businessideasdb.com/ideas?page=${page}&_rsc=1`, {
      headers: {
        'accept': '*/*',
        'rsc': '1',
        'next-url': '/ideas',
        'cookie': SESSION_COOKIE
      }
    });

    const text = await response.text();

    // Parse RSC response to extract ideas
    const ideas = parseRSCResponse(text);

    res.json({
      page,
      totalPages: 7,
      totalIdeas: 73,
      ideas
    });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

function parseRSCResponse(text) {
  const ideas = [];

  // Extract slugs
  const slugs = [...new Set(text.match(/\/idea\/[a-z0-9-]+/g) || [])].map(s => s.replace('/idea/', ''));

  // Extract titles
  const titles = [...(text.matchAll(/"text-base font-bold text-ink[^"]*","children":"([^"]+)"/g) || [])].map(m => m[1]);

  // Extract descriptions
  const descs = [...(text.matchAll(/"text-\[13px\] text-ink-3 mb-3\.5[^"]*","children":"([^"]+)"/g) || [])].map(m => m[1]);

  // Extract volumes
  const vols = [...(text.matchAll(/"font-mono text-\[15px\] font-extrabold text-ink","children":\["([^"]+)"/g) || [])].map(m => m[1]);

  // Extract growth % - pattern: text-green","children":["+",34,"%"]
  const growths = [...(text.matchAll(/text-green","children":\["\+",([0-9]+),"%"\]/g) || [])].map(m => '+' + m[1] + '%');

  // Extract competition levels
  const comps = [...(text.matchAll(/"font-semibold"[^}]+"children":"(Low|Medium|High)"/g) || [])].map(m => m[1]);

  // Extract categories
  const cats = [...(text.matchAll(/"uppercase","style":[^}]+,"children":"([^"]+)"/g) || [])].map(m => m[1]);

  // Extract signals
  const signals = [...(text.matchAll(/"rounded-full text-green[^}]+"children":"([^"]+)"/g) || [])].map(m => m[1]);

  // Extract competitors
  const competitorBlocks = [...(text.matchAll(/"text-\[11px\] text-ink-4","children":"([^"]+)"/g) || [])].map(m => m[1]);

  // Extract tags
  const tagMatches = [...text.matchAll(/"text-\[11px\] text-ink-3 bg-subtle px-2 py-\[2px\] rounded","children":"([^"]+)"/g)];

  for (let i = 0; i < slugs.length; i++) {
    // Get tags for this idea (groups of 3)
    const startTagIdx = i * 3;
    const tags = [];
    for (let t = startTagIdx; t < startTagIdx + 3 && t < tagMatches.length; t++) {
      if (tagMatches[t]) tags.push(tagMatches[t][1]);
    }

    ideas.push({
      id: i + 1,
      slug: slugs[i],
      category: cats[i] || 'SaaS',
      signal: signals[i] || 'Strong Signal',
      title: titles[i] || slugs[i].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: descs[i] || '',
      competitors: competitorBlocks[i] || '',
      tags: tags.length > 0 ? tags : ['B2B'],
      volume: vols[i] || '0',
      growth: growths[i] || '+0%',
      competition: comps[i] || 'Medium'
    });
  }

  return ideas;
}

// API endpoint to fetch idea details
app.get('/api/idea/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const response = await fetch(`https://businessideasdb.com/idea/${slug}?_rsc=1`, {
      headers: {
        'accept': '*/*',
        'rsc': '1',
        'next-url': '/ideas',
        'cookie': SESSION_COOKIE
      }
    });

    const text = await response.text();
    const idea = parseIdeaDetail(text, slug);

    res.json(idea);
  } catch (error) {
    console.error('Error fetching idea details:', error);
    res.status(500).json({ error: 'Failed to fetch idea details' });
  }
});

function parseIdeaDetail(text, slug) {
  // Extract scores from sidebar component - look for the scores object pattern
  const scoresMatch = text.match(/"scores":\{"opportunity":(\d+),"problem":(\d+),"feasibility":(\d+),"timing":(\d+)\}/);

  let opportunity = 0, problem = 0, feasibility = 0, timing = 0;
  if (scoresMatch) {
    opportunity = parseInt(scoresMatch[1]);
    problem = parseInt(scoresMatch[2]);
    feasibility = parseInt(scoresMatch[3]);
    timing = parseInt(scoresMatch[4]);
  } else {
    // Fallback: look for individual score patterns in component props
    const oppMatch = text.match(/"Opportunity"[^}]*\[(\d+),/);
    const probMatch = text.match(/"Problem"[^}]*\[(\d+),/);
    const feasMatch = text.match(/"Feasibility"[^}]*\[(\d+),/);
    const timMatch = text.match(/"Timing"[^}]*\[(\d+),/);

    if (oppMatch) opportunity = parseInt(oppMatch[1]);
    if (probMatch) problem = parseInt(probMatch[1]);
    if (feasMatch) feasibility = parseInt(feasMatch[1]);
    if (timMatch) timing = parseInt(timMatch[1]);
  }

  const overallMatch = text.match(/Why ",(\d+\.?\d*)\]/);

  // Extract metrics
  const volumeMatch = text.match(/"font-mono text-\[20px\] font-extrabold[^"]*","children":"([^"]+)"/);
  const growthMatch = text.match(/"font-mono text-sm font-bold text-green","children":\["\+",(\d+),"%"\]/);

  // Extract keyword - pattern: text-[13px] font-bold text-ink bg-surface px-2.5 py-[3px] rounded-md border border-border","children":"..."
  const keywordMatch = text.match(/"text-\[13px\] font-bold text-ink bg-surface[^"]*","children":"([^"]+)"/);

  // Extract brief sections
  const briefMatch = text.match(/"text-\[15px\] leading-\[1\.7\] text-ink mb-5[^"]*","children":"([^"]+)"/);
  const whyNowMatch = text.match(/"Why now"\}\],\["\$","p"[^}]+"children":"([^"]+)"/);
  const whoForMatch = text.match(/"Who it's for"\}\],\["\$","p"[^}]+"children":"([^"]+)"/);
  const whatExistsMatch = text.match(/"What exists today"\}\],\["\$","p"[^}]+"children":"([^"]+)"/);

  // Extract additional brief paragraphs
  const briefParagraphs = [...text.matchAll(/"text-\[14px\] leading-\[1\.7\] text-ink-2 max-w-\[64ch\] mt-5","children":"([^"]+)"/g)].map(m => m[1]);

  // Extract source signals
  const signalSubreddit = text.match(/r\/","([^"]+)"\]/);
  const signalUpvotes = text.match(/"↑"," ",\["\$","strong"[^}]+"children":"(\d+)"/);
  // Comments pattern: ["$","strong",...,"children":"34"]," comments"
  const signalComments = text.match(/"children":"(\d+)"\}\]," comments"/);
  const signalTitle = text.match(/"text-\[14px\] leading-\[1\.55\] text-ink mb-2\.5","children":"([^"]+)"/);
  // Quote is in Schema.org JSON-LD format: "text":"quote text"
  // Look for it near answerCount which indicates Reddit thread data
  const signalQuote = text.match(/"text":"([^"]{20,}?)","upvoteCount"/);

  // Extract competitors with descriptions
  const competitors = [];
  // Pattern: name in truncate span, domain in font-mono span, description in text-ink-3, price in font-semibold
  const compNameMatches = [...text.matchAll(/"text-\[14px\] font-semibold text-ink truncate","children":"([^"]+)"/g)];
  const compDomainMatches = [...text.matchAll(/"font-mono text-\[10\.5px\] text-ink-4","children":"([^"]+\.com)"/g)];
  const compDescMatches = [...text.matchAll(/"text-\[13px\] text-ink-3 leading-\[1\.5\]","children":"([^"]+)"/g)];
  const compPriceMatches = [...text.matchAll(/"\$\$(\d+\/mo)"/g)];

  for (let i = 0; i < compNameMatches.length && i < 5; i++) {
    competitors.push({
      name: compNameMatches[i] ? compNameMatches[i][1] : '',
      domain: compDomainMatches[i] ? compDomainMatches[i][1] : '',
      description: compDescMatches[i] ? compDescMatches[i][1] : '',
      price: compPriceMatches[i] ? '$' + compPriceMatches[i][1] : ''
    });
  }

  // Extract build path steps
  const buildSteps = [...text.matchAll(/"text-\[14px\] text-ink-2 leading-\[1\.6\] pt-1","children":"([^"]+)"/g)].map(m => m[1]);

  // Extract keyword data table
  const keywordData = [];
  const keywordNames = [...text.matchAll(/"px-5 py-3 font-mono text-\[12px\] font-semibold text-ink","children":"([^"]+)"/g)];
  const keywordVols = [...text.matchAll(/"px-5 py-3 font-mono text-\[12px\] text-ink-2","children":"([^"]+)"/g)];
  const keywordGrowths = [...text.matchAll(/"px-5 py-3 font-mono text-\[12px\] font-bold text-green","children":\["\+",(\d+),"%"\]/g)];

  for (let i = 0; i < keywordNames.length; i++) {
    keywordData.push({
      keyword: keywordNames[i] ? keywordNames[i][1] : '',
      volume: keywordVols[i] ? keywordVols[i][1] : '',
      growth: keywordGrowths[i] ? '+' + keywordGrowths[i][1] + '%' : '',
      competition: 'Medium'
    });
  }

  // Extract proof of revenue / proven earners
  // Strategy: Find all "/proven/<slug>" anchors in the text and extract data around each
  // The component ID prefix ($L37, $L3d, etc.) is dynamic, so match any.
  const provenEarners = [];
  const provenSlugs = [...text.matchAll(/"\$L[0-9a-f]+","([a-z0-9-]+)",\{"href":"\/proven\/\1"/g)];

  for (const slugMatch of provenSlugs) {
    const slug = slugMatch[1];
    const startIdx = slugMatch.index;
    // Look in the next 2000 chars for the earner's data
    const earnerSection = text.substring(startIdx, startIdx + 2000);

    // Name: first h3 with text-[14px] font-bold text-ink
    const nameMatch = earnerSection.match(/"text-\[14px\] font-bold text-ink[^}]+"children":"([^"]+)"/);
    // Revenue
    const revMatch = earnerSection.match(/"\$\$(\d+\.?\d*K?)"/);
    // Description (try inline first)
    let descMatch = earnerSection.match(/"text-\[12px\] text-ink-3 leading-normal line-clamp-2","children":"([^"]+)"/);

    // Domain
    const domainMatch = earnerSection.match(/s2\/favicons\?domain=([^&]+)&sz=32/);

    // If no inline description, look for a $L38-style reference and resolve it
    if (!descMatch) {
      const refMatch = earnerSection.match(/"\$L([0-9a-f]+)"/);
      if (refMatch) {
        // Try multiple references after the name
        const refsAfterName = [...earnerSection.matchAll(/"\$L([0-9a-f]+)"/g)].map(m => m[1]);
        for (const ref of refsAfterName) {
          const refDef = text.match(new RegExp(`\\n${ref}:\\["\\$","p"[^\\n]+`));
          if (refDef) {
            const refDesc = refDef[0].match(/"text-\[12px\] text-ink-3 leading-normal line-clamp-2","children":"([^"]+)"/);
            if (refDesc) {
              descMatch = refDesc;
              break;
            }
          }
        }
      }
    }

    if (nameMatch && revMatch) {
      provenEarners.push({
        slug,
        name: nameMatch[1],
        revenue: '$' + revMatch[1] + '/mo',
        description: descMatch ? descMatch[1] : '',
        domain: domainMatch ? domainMatch[1] : ''
      });
    }
  }

  // Extract related ideas from section 30 (id="related")
  const relatedIdeas = [];

  // Find the related section and parse from there
  const relatedSectionStart = text.indexOf('"id":"related"');
  if (relatedSectionStart > 0) {
    const relatedText = text.substring(relatedSectionStart);

    // Pattern: ["$","$L25","trade-invoice-autopilot",{"href":"/idea/trade-invoice-autopilot"
    // Component ID prefix ($L25, etc.) is dynamic per page, so match any.
    const relatedSlugs = [...relatedText.matchAll(/\["\$","\$L[0-9a-f]+","([a-z0-9-]+)",\{"href":"\/idea\/\1"/g)];

    // Get data for each related idea from the full text using slugs
    // Get titles from h3 elements after each slug reference
    const allTitles = [...text.matchAll(/"h3"[^}]+"text-\[14px\] font-semibold text-ink leading-\[1\.3\] tracking-\[-0\.01em\]","children":"([^"]+)"/g)];
    // Get descriptions from p elements
    const allDescs = [...text.matchAll(/"text-\[12px\] text-ink-3 leading-\[1\.5\] line-clamp-2","children":"([^"]+)"/g)];
    // Get scores
    const allScores = [...text.matchAll(/"font-mono text-\[13px\] font-bold text-accent","children":(\d+\.?\d*)\}/g)];
    // Get volumes and growth (footer pattern)
    const allVolGrowth = [...text.matchAll(/"font-mono text-\[10px\] text-ink-4[^}]+"children":\["(\d+\.?\d*K?)"," vol · ",\["\$","strong"[^}]+"children":\["\+",(\d+),"%"\]/g)];

    for (let i = 0; i < Math.min(relatedSlugs.length, 3); i++) {
      relatedIdeas.push({
        slug: relatedSlugs[i][1],
        title: allTitles[i] ? allTitles[i][1] : '',
        description: allDescs[i] ? allDescs[i][1] : '',
        score: allScores[i] ? allScores[i][1] : '',
        volume: allVolGrowth[i] ? allVolGrowth[i][1] : '',
        growth: allVolGrowth[i] ? '+' + allVolGrowth[i][2] + '%' : ''
      });
    }
  }

  // Extract meta info from sidebar - look for the pattern in 43: section
  // Pattern: "children":"Added"}]},["$","span",...,"children":"Jun 7, 2026"
  const addedMatch = text.match(/"Added"\}\],\["\$","span"[^}]+"children":"([A-Z][a-z]+ \d+, \d{4})"/);
  const categoryMatch = text.match(/"Category"\}\],\["\$","span"[^}]+"children":"([^"]+)"/);
  const difficultyMatch = text.match(/"Difficulty"\}\],\["\$","span"[^}]+"children":"([^"]+)"/);
  const revenueMatch = text.match(/"Revenue"\}\],\["\$","span"[^}]+"children":"\$\$([^"]+)"/);

  // Extract title from schema.org
  const titleMatch = text.match(/"headline":"([^"]+)"/);

  // Extract FAQ from schema.org - handle escaped chars in answers
  const faqs = [];
  const faqMatches = [...text.matchAll(/"@type":"Question","name":"((?:[^"\\]|\\.)+)"[^}]+?"acceptedAnswer":\{"@type":"Answer","text":"((?:[^"\\]|\\.)+)"\}/g)];
  for (const m of faqMatches) {
    faqs.push({
      question: m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'),
      answer: m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
    });
  }

  // Signal posts count
  const signalPosts = text.match(/"Signals"\}\][^}]+"children":\[(\d+)," posts/);
  const ideaId = text.match(/"ideaId":(\d+)/);

  return {
    slug,
    title: titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    scores: {
      opportunity,
      problem,
      feasibility,
      timing,
      overall: overallMatch ? parseFloat(overallMatch[1]) : ((opportunity + problem + feasibility + timing) / 4).toFixed(1)
    },
    metrics: {
      volume: volumeMatch ? volumeMatch[1] : '0',
      growth: growthMatch ? '+' + growthMatch[1] + '%' : '+0%',
      keyword: keywordMatch ? keywordMatch[1] : ''
    },
    brief: {
      main: briefMatch ? briefMatch[1] : '',
      whyNow: whyNowMatch ? whyNowMatch[1] : '',
      whoFor: whoForMatch ? whoForMatch[1] : '',
      whatExists: whatExistsMatch ? whatExistsMatch[1] : '',
      additional: briefParagraphs
    },
    signal: {
      subreddit: signalSubreddit ? signalSubreddit[1] : '',
      upvotes: signalUpvotes ? parseInt(signalUpvotes[1]) : 0,
      comments: signalComments ? parseInt(signalComments[1]) : 0,
      title: signalTitle ? signalTitle[1] : '',
      quote: signalQuote ? signalQuote[1] : ''
    },
    competitors,
    buildSteps,
    keywordData,
    provenEarners,
    relatedIdeas,
    faqs,
    ideaId: ideaId ? parseInt(ideaId[1]) : null,
    meta: {
      added: addedMatch ? addedMatch[1] : '',
      category: categoryMatch ? categoryMatch[1] : 'SaaS',
      difficulty: difficultyMatch ? difficultyMatch[1] : 'Medium',
      revenue: revenueMatch ? '$' + revenueMatch[1] : '$100K - $1M',
      signalPosts: signalPosts ? parseInt(signalPosts[1]) : 1
    }
  };
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
