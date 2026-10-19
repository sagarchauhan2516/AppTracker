async function extractDDG() {
  const query = 'deloitte india careers 2026';
  const res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  const html = await res.text();
  const results = [];
  const blocks = html.split('class="result__body"');

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const linkMatch = b.match(/class="result__url"[^>]*href="([^"]+)"/i) || b.match(/href="([^"]+)"/i);
    const titleMatch = b.match(/class="result__title"[^>]*>([\s\S]*?)<\/h2>/i) || b.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snipMatch = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

    if (titleMatch) {
      const cleanTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      const cleanSnip = snipMatch ? snipMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      let url = linkMatch ? linkMatch[1] : '';
      if (url.includes('uddg=')) {
        try {
          const uParam = new URL('https://duckduckgo.com' + url).searchParams.get('uddg');
          if (uParam) url = decodeURIComponent(uParam);
        } catch (_) {}
      }
      if (cleanTitle) {
        results.push({ title: cleanTitle, url, snippet: cleanSnip });
      }
    }
  }

  console.log('Total extracted DDG results:', results.length);
  if (results.length > 0) {
    console.log('Sample Result 1:');
    console.log(JSON.stringify(results[0], null, 2));
  }
}
extractDDG();
