import type { APIRoute } from 'astro';

// All bots are allowed in production; `robots.txt` disallows only the paths of the backend that shares the domain with the site
// (the backend on a subdomain, the default, shares none: the lines are harmless there) and names the sitemap. The staging switch
// PUBLIC_NOINDEX=true disallows everything. Keep the pages themselves reachable (crawlers must fetch them to see `noindex`).
// `/livewire` covers Livewire's `/livewire-<hash>/` endpoints.
const BACKEND_PATHS = ['/admin/', '/cms-api/', '/forms/', '/livewire'];

export const GET: APIRoute = ({ site }) => {
    const noindex = import.meta.env.PUBLIC_NOINDEX === 'true';
    const disallow = noindex ? ['/'] : BACKEND_PATHS;
    const lines = ['User-agent: *', ...(noindex ? [] : ['Allow: /']), ...disallow.map((path) => `Disallow: ${path}`), ''];
    if (!noindex && site) lines.push(`Sitemap: ${new URL('sitemap-index.xml', site).href}`, '');
    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
