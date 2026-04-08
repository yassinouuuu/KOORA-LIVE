// ===== KOORA LIVE - SMART LOGO ENGINE =====
// Uses TheSportsDB LIVE Search API - 100% accurate logos
// Cache results in sessionStorage to avoid repeated calls

const logoCache = {};

// Main function: search for team by name, return real badge URL
window.getTeamLogo = async function(name) {
    if (!name || !name.trim()) return window.getFallbackAvatar(name || '?');

    const key = name.toLowerCase().trim();
    if (logoCache[key]) return logoCache[key];

    // Check sessionStorage cache
    const cacheKey = 'logo_' + key;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        logoCache[key] = cached;
        return cached;
    }

    try {
        const res = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`
        );
        const data = await res.json();
        if (data.teams && data.teams.length > 0 && data.teams[0].strTeamBadge) {
            const url = data.teams[0].strTeamBadge + '/preview';
            logoCache[key] = url;
            sessionStorage.setItem(cacheKey, url);
            return url;
        }
    } catch (e) {
        console.warn('Logo fetch failed for:', name, e);
    }

    const fallback = window.getFallbackAvatar(name);
    logoCache[key] = fallback;
    return fallback;
};

// Search leagues by name and return their badge from TheSportsDB
window.getLeagueLogo = async function(name) {
    if (!name) return window.getFallbackAvatar(name || '?');

    const key = 'league_' + name.toLowerCase().trim();
    const cached = sessionStorage.getItem(key);
    if (cached) return cached;

    try {
        const res = await fetch(
            `https://www.thesportsdb.com/api/v1/json/3/search_all_leagues.php?s=Soccer&c=${encodeURIComponent(name)}`
        );
        const data = await res.json();
        if (data.countrys && data.countrys[0] && data.countrys[0].strBadge) {
            sessionStorage.setItem(key, data.countrys[0].strBadge);
            return data.countrys[0].strBadge;
        }
    } catch (e) {}

    // Fallback: known leagues
    const l = name.toLowerCase();
    if (l.includes('champion')) return 'https://upload.wikimedia.org/wikipedia/ar/thumb/f/f9/UEFA_Champions_League_Official_Logo.png/128px-UEFA_Champions_League_Official_Logo.png';
    if (l.includes('premier'))  return 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/128px-Premier_League_Logo.svg.png';
    if (l.includes('liga') || l.includes('laliga')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/LaLiga_logo_2023.svg/128px-LaLiga_logo_2023.svg.png';
    if (l.includes('serie'))    return 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Serie_A_logo_%282019%29.svg/128px-Serie_A_logo_%282019%29.svg.png';
    if (l.includes('bundesliga')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/128px-Bundesliga_logo_%282017%29.svg.png';
    if (l.includes('ligue'))    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Ligue_1_Uber_Eats_2020.svg/128px-Ligue_1_Uber_Eats_2020.svg.png';
    if (l.includes('saudi') || l.includes('روشن') || l.includes('سعودي')) return 'https://upload.wikimedia.org/wikipedia/ar/thumb/5/56/Saudi_Pro_League_logo.svg/128px-Saudi_Pro_League_logo.svg.png';
    if (l.includes('مصر') || l.includes('egypt')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Egyptian_Premier_League_logo.png/128px-Egyptian_Premier_League_logo.png';
    if (l.includes('world cup') || l.includes('كأس العالم')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/4/45/FIFA_World_Cup.svg/128px-FIFA_World_Cup.svg.png';
    if (l.includes('europa'))   return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/UEFA_Europa_League_Logo_%282015%29.svg/128px-UEFA_Europa_League_Logo_%282015%29.svg.png';
    if (l.includes('afcon') || l.includes('أمم أفريقيا')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6d/Africa_Cup_of_Nations_logo.svg/128px-Africa_Cup_of_Nations_logo.svg.png';

    return window.getFallbackAvatar(name.substring(0, 3));
};

// Sync version for leagues (for existing code compatibility)
window.getLeagueLogoSync = function(name) {
    const l = (name || '').toLowerCase();
    if (l.includes('champion')) return 'https://upload.wikimedia.org/wikipedia/ar/thumb/f/f9/UEFA_Champions_League_Official_Logo.png/128px-UEFA_Champions_League_Official_Logo.png';
    if (l.includes('premier'))  return 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/128px-Premier_League_Logo.svg.png';
    if (l.includes('liga') || l.includes('laliga')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/LaLiga_logo_2023.svg/128px-LaLiga_logo_2023.svg.png';
    if (l.includes('serie'))    return 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e1/Serie_A_logo_%282019%29.svg/128px-Serie_A_logo_%282019%29.svg.png';
    if (l.includes('bundesliga')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/d/df/Bundesliga_logo_%282017%29.svg/128px-Bundesliga_logo_%282017%29.svg.png';
    if (l.includes('ligue'))    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Ligue_1_Uber_Eats_2020.svg/128px-Ligue_1_Uber_Eats_2020.svg.png';
    if (l.includes('saudi') || l.includes('روشن') || l.includes('سعودي')) return 'https://upload.wikimedia.org/wikipedia/ar/thumb/5/56/Saudi_Pro_League_logo.svg/128px-Saudi_Pro_League_logo.svg.png';
    if (l.includes('مصر') || l.includes('egypt')) return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Egyptian_Premier_League_logo.png/128px-Egyptian_Premier_League_logo.png';
    if (l.includes('world cup') || l.includes('كأس العالم')) return 'https://upload.wikimedia.org/wikipedia/en/thumb/4/45/FIFA_World_Cup.svg/128px-FIFA_World_Cup.svg.png';
    if (l.includes('europa'))   return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/UEFA_Europa_League_Logo_%282015%29.svg/128px-UEFA_Europa_League_Logo_%282015%29.svg.png';
    return window.getFallbackAvatar(name ? name.substring(0, 3) : '?');
};

window.getFallbackAvatar = function(name) {
    const colors = ['3f5efb','fc466b','00c896','ff6b35','845ec2','0081cf'];
    const color = colors[(name ? name.length : 0) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${color}&color=fff&size=256&bold=true`;
};
