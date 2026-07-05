

function parseRSS(xml, q) {
  const items = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g);
  if (!itemMatches) return items;

  console.log(`Found ${itemMatches.length} raw <item> blocks.`);

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const sourceMatch = itemXml.match(/<source[\s\S]*?>([\s\S]*?)<\/source>/);

    if (titleMatch && linkMatch) {
      const title = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
      const link = linkMatch[1].trim();
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();
      const source = sourceMatch ? sourceMatch[1].trim() : 'Google News';

      items.push({
        title, link, pubDate, source
      });
    }
  }
  return items;
}

async function test() {
  const q = "share market 2025 bit coin";
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
  console.log("Fetching RSS from:", rssUrl);
  try {
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) {
      console.log("Fetch failed with status:", res.status);
      return;
    }
    const xml = await res.text();
    console.log("Fetched XML length:", xml.length);
    const parsed = parseRSS(xml, q);
    console.log("Parsed items count:", parsed.length);
    if (parsed.length > 0) {
      console.log("First item:", parsed[0]);
    }
  } catch (e) {
    console.error("Test error:", e);
  }
}

test();
