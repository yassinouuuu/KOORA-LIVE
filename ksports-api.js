// =====================================================
//   KOORA LIVE - KSportsAPI Integration Engine
// =====================================================
//   Fetches live football matches from API-Football (api-sports.io)
//   and automatically maps them to site channels.
//
//   Features:
//   - Auto-fetch today's matches from API-Football
//   - Smart channel-to-league mapping
//   - Auto-import matches with correct stream links
//   - Configurable per site/template
//   - Caching to respect API rate limits (100/day free)
// =====================================================

window.KSportsAPI = (function() {
    'use strict';

    // ---- Configuration ----
    const CONFIG = {
        // API-Football (api-sports.io) - Free tier: 100 requests/day
        API_KEY: '', // Will be set from dashboard
        BASE_URL: 'https://v3.football.api-sports.io',
        
        // CORS proxy options (for client-side requests)
        CORS_PROXIES: [
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?'
        ],

        // Cache duration in minutes
        CACHE_DURATION: 30,
        
        // Firebase key for storing API config
        CONFIG_KEY: 'ksports_config',
        IMPORTED_KEY: 'ksports_imported'
    };

    // ---- Channel ↔ League Mapping ----
    // Maps channel names to leagues/competitions they typically broadcast
    // ✅ محدّث لموسم 2025-2026
    const CHANNEL_LEAGUE_MAP = {
        // ═══════════════════════════════════════════════
        // beIN Sports Network (شبكة بي إن سبورت)
        // الحقوق: الدوري الإنجليزي، لا ليغا، الدوري الفرنسي،
        //         أبطال أوروبا، الدوري الأوروبي، دوري المؤتمر،
        //         أبطال آسيا، أبطال أفريقيا، كأس أمم أفريقيا
        // ═══════════════════════════════════════════════
        'bein sport 1': {
            leagues: [39, 2, 3, 45, 48, 848, 531], // PL, UCL, UEL, FA Cup, EFL Cup, UECL, UEFA Super Cup
            keywords: ['إنجليزي', 'أبطال أوروبا', 'بريميير ليغ']
        },
        'bein sport 2': {
            leagues: [2, 3, 848, 39, 45], // UCL, UEL, UECL, PL, FA Cup
            keywords: ['أبطال أوروبا', 'يوروبا ليغ']
        },
        'bein sport 3': {
            leagues: [140, 143, 144, 3, 848], // La Liga, Copa del Rey, Spanish Super Cup, UEL, UECL
            keywords: ['اسباني', 'لا ليغا', 'إسباني']
        },
        'bein sport 4': {
            leagues: [61, 66, 848, 2], // Ligue 1, Coupe de France, UECL, UCL
            keywords: ['فرنسي', 'ليغ 1']
        },
        'bein sport 5': {
            leagues: [2, 3, 61, 140, 848], // UCL, UEL, Ligue 1, La Liga, UECL
            keywords: ['أوروبي']
        },
        'bein sport 6': {
            leagues: [218, 114, 20, 2, 3], // AFCON, CAF CL, CAF Confed Cup, UCL, UEL
            keywords: ['أفريقيا', 'كاف']
        },
        'bein sport 7': {
            leagues: [39, 2, 3, 140, 61], // PL, UCL, UEL, La Liga, Ligue 1
            keywords: ['أوروبي']
        },
        'bein sport 8': {
            leagues: [39, 2, 3, 140, 61, 848], // overflow channels
            keywords: []
        },
        'bein sport 9': {
            leagues: [39, 2, 3, 140, 61, 848], // overflow channels
            keywords: []
        },
        'bein sport premium 1': {
            leagues: [39, 2, 140], // PL, UCL, La Liga
            keywords: ['بريميوم', 'إنجليزي']
        },
        'bein sport premium 2': {
            leagues: [39, 2, 140, 61], // PL, UCL, La Liga, Ligue 1
            keywords: ['بريميوم']
        },
        'bein sport afc': {
            leagues: [17, 18, 480], // AFC Champions League Elite, AFC Cup, AFC Qualifiers
            keywords: ['آسيا', 'أبطال آسيا']
        },
        'bein sport xtra 1': {
            leagues: [39, 2, 3, 140, 61], // Extra overflow
            keywords: ['إكسترا']
        },
        // ═══════════════════════════════════════════════
        // Thmanyah (ثمانية) - خلفاً لـ SSC المُغلقة أكتوبر 2025
        // الحقوق: دوري روشن السعودي، كأس الملك، السوبر السعودي،
        //         دوري يلو (الدرجة الأولى) - حتى 2031
        // ═══════════════════════════════════════════════
        'thmanyah 1': {
            leagues: [307, 853, 855], // Saudi Pro League (Roshn), King Cup, Saudi Super Cup
            keywords: ['سعودي', 'روشن', 'ثمانية']
        },
        'thmanyah 2': {
            leagues: [307, 853, 308], // Saudi Pro League, King Cup, Yelo League
            keywords: ['سعودي', 'روشن', 'يلو']
        },
        'thmanyah 3': {
            leagues: [307, 308, 853], // Saudi leagues overflow
            keywords: ['سعودي']
        },
        // ═══════════════════════════════════════════════
        // MBC Action / Shahid (ام بي سي أكشن / شاهد)
        // الحقوق: الدوري الألماني (بوندسليغا) - حتى 2028
        // 3 مباريات أسبوعياً على MBC Action مجاناً
        // كل المباريات على منصة شاهد
        // ═══════════════════════════════════════════════
        'mbc action': {
            leagues: [78, 79], // Bundesliga, 2. Bundesliga
            keywords: ['ألماني', 'بوندسليغا', 'ام بي سي']
        },
        'shahid': {
            leagues: [78, 79], // Bundesliga, 2. Bundesliga
            keywords: ['ألماني', 'بوندسليغا', 'شاهد']
        },
        // ═══════════════════════════════════════════════
        // STARZPLAY (ستارزبلاي)
        // الحقوق: الدوري الإيطالي (سيري آ) - حتى 2028
        // ═══════════════════════════════════════════════
        'starzplay': {
            leagues: [135, 137, 547], // Serie A, Coppa Italia, Supercoppa Italiana
            keywords: ['إيطالي', 'سيري آ', 'ستارز']
        },
        // ═══════════════════════════════════════════════
        // AD Sports / Abu Dhabi Sports (أبوظبي الرياضية)
        // الحقوق: دوري أدنوك الإماراتي
        // ═══════════════════════════════════════════════
        'abu dhabi sports 1': {
            leagues: [403, 404], // UAE ADNOC Pro League, UAE Cup
            keywords: ['إماراتي', 'أبوظبي', 'أدنوك']
        },
        'abu dhabi sports 2': {
            leagues: [403, 404], // UAE Pro League, UAE Cup
            keywords: ['إماراتي', 'أبوظبي']
        },
        // ═══════════════════════════════════════════════
        // Dubai Sports (دبي الرياضية)
        // الحقوق: دوري أدنوك الإماراتي (مشاركة)
        // ═══════════════════════════════════════════════
        'dubai sports 1': {
            leagues: [403], // UAE ADNOC Pro League
            keywords: ['إماراتي', 'دبي']
        },
        'dubai sports 2': {
            leagues: [403], // UAE ADNOC Pro League
            keywords: ['إماراتي', 'دبي']
        },
        // ═══════════════════════════════════════════════
        // OnTime Sports (أون تايم سبورتس - مصر)
        // الحقوق: الدوري المصري الممتاز
        // ═══════════════════════════════════════════════
        'ontime sports 1': {
            leagues: [233, 234], // Egyptian Premier League, Egyptian Cup
            keywords: ['مصري', 'مصر']
        },
        'ontime sports 2': {
            leagues: [233, 234], // Egyptian Premier League, Egyptian Cup
            keywords: ['مصري', 'مصر']
        },
        // ═══════════════════════════════════════════════
        // Alkass (الكأس - قطر)
        // الحقوق: دوري نجوم قطر
        // ═══════════════════════════════════════════════
        'alkass 1': {
            leagues: [153, 154, 17], // Qatar Stars League, Qatar Cup, AFC CL
            keywords: ['قطري', 'الكأس']
        },
        'alkass 2': {
            leagues: [153, 154], // Qatar Stars League, Qatar Cup
            keywords: ['قطري', 'الكأس']
        },
        // ═══════════════════════════════════════════════
        // Arryadia (الرياضية المغربية) - SNRT
        // الحقوق: البطولة الاحترافية (بوتولا برو)
        // ═══════════════════════════════════════════════
        'arryadia': {
            leagues: [200, 201, 114, 20], // Botola Pro, Botola 2, CAF CL, CAF Confed Cup
            keywords: ['مغربي', 'المغربية', 'بوتولا']
        },
        'arryadia hd': {
            leagues: [200, 201, 114], // Botola Pro, Botola 2, CAF CL
            keywords: ['مغربي', 'المغربية']
        },
        // ═══════════════════════════════════════════════
        // Sharjah Sports (الشارقة الرياضية)
        // الحقوق: دوري أدنوك الإماراتي (مشاركة)
        // ═══════════════════════════════════════════════
        'sharjah sports': {
            leagues: [403], // UAE ADNOC Pro League
            keywords: ['إماراتي', 'الشارقة']
        },
        // General/Fallback (بطولات رئيسية مشهورة)
        '_default': {
            leagues: [39, 140, 61, 2, 3, 848, 307, 78, 135, 17],
            keywords: []
        }
    };

    // ---- League ID → Arabic Name Map ----
    // ✅ محدّث لموسم 2025-2026
    const LEAGUE_NAMES = {
        1: 'كأس العالم FIFA',
        2: 'دوري أبطال أوروبا',
        3: 'الدوري الأوروبي (يوروبا ليغ)',
        4: 'بطولة أمم أوروبا (يورو)',
        5: 'دوري الأمم الأوروبية',
        6: 'تصفيات كأس العالم - أفريقيا',
        10: 'تصفيات كأس العالم - آسيا',
        15: 'كأس آسيا',
        17: 'دوري أبطال آسيا النخبة',
        18: 'كأس الاتحاد الآسيوي',
        20: 'كأس الكونفدرالية الأفريقية',
        29: 'كأس العالم للأندية',
        39: 'الدوري الإنجليزي الممتاز',
        40: 'دوري الدرجة الأولى الإنجليزي (تشامبيونشيب)',
        45: 'كأس الاتحاد الإنجليزي',
        48: 'كأس رابطة الأندية الإنجليزية (كاراباو)',
        61: 'الدوري الفرنسي (ليغ 1)',
        65: 'كأس فرنسا',
        66: 'كأس الرابطة الفرنسية',
        78: 'الدوري الألماني (بوندسليغا)',
        79: 'دوري الدرجة الثانية الألماني',
        81: 'كأس ألمانيا (DFB Pokal)',
        88: 'الدوري الهولندي (إيريديفيزي)',
        94: 'الدوري البرتغالي',
        114: 'دوري أبطال أفريقيا',
        135: 'الدوري الإيطالي (سيري آ)',
        137: 'كأس إيطاليا (كوبا إيطاليا)',
        140: 'الدوري الإسباني (لا ليغا)',
        143: 'كأس ملك إسبانيا (كوبا ديل ري)',
        144: 'كأس السوبر الإسباني',
        153: 'دوري نجوم قطر',
        154: 'كأس أمير قطر',
        169: 'الدوري البرازيلي (سيري آ)',
        172: 'كأس البرازيل',
        179: 'الدوري الأرجنتيني',
        188: 'الدوري التركي (سوبر ليغ)',
        197: 'كأس ليبرتادوريس',
        200: 'الدوري المغربي (بوتولا برو)',
        201: 'الدوري المغربي الدرجة الثانية',
        218: 'كأس أمم أفريقيا (كان)',
        233: 'الدوري المصري الممتاز',
        234: 'كأس مصر',
        239: 'الدوري الجزائري',
        241: 'الدوري التونسي',
        253: 'الدوري الأمريكي (MLS)',
        307: 'دوري روشن السعودي',
        308: 'دوري يلو السعودي (الدرجة الأولى)',
        357: 'الدوري الكويتي',
        383: 'الدوري البحريني',
        403: 'دوري أدنوك للمحترفين (الإماراتي)',
        404: 'كأس رئيس الدولة الإماراتي',
        480: 'تصفيات كأس آسيا',
        531: 'كأس السوبر الأوروبي',
        547: 'كأس السوبر الإيطالي',
        848: 'دوري المؤتمر الأوروبي',
        853: 'كأس الملك السعودي',
        855: 'كأس السوبر السعودي'
    };

    // ---- State ----
    let apiKey = '';
    let cachedFixtures = null;
    let cacheTimestamp = 0;

    // ---- Helper: Get today's date in YYYY-MM-DD format ----
    function getToday() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // ---- Helper: Convert UTC time to local Mecca/Riyadh time (UTC+3) ----
    function toMeccaTime(utcDateStr) {
        try {
            const date = new Date(utcDateStr);
            // Convert to UTC+3 (Mecca time)
            const meccaOffset = 3 * 60; // minutes
            const utcMs = date.getTime() + (date.getTimezoneOffset() * 60000);
            const meccaDate = new Date(utcMs + (meccaOffset * 60000));
            return String(meccaDate.getHours()).padStart(2, '0') + ':' +
                   String(meccaDate.getMinutes()).padStart(2, '0');
        } catch(e) {
            return '00:00';
        }
    }

    // ---- Helper: Normalize channel name for matching ----
    function normalizeChannelName(name) {
        return (name || '')
            .toLowerCase()
            .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isChannelMatch(mapKey, chName) {
        if (mapKey === '_default') return false;
        var c = chName.toLowerCase().replace(/-/g, ' ');
        var m = mapKey.toLowerCase();
        
        if (m.indexOf('bein') !== -1) {
            var numMatch = m.match(/\d+/);
            var num = numMatch ? numMatch[0] : '';
            var isPremium = m.indexOf('premium') !== -1;
            
            if (c.indexOf('bein') === -1 && c.indexOf('بين') === -1) return false;
            if (num) {
                var numRegex = new RegExp('(^|\\D)' + num + '(\\D|$)');
                if (!numRegex.test(c)) return false;
            }
            if (isPremium && c.indexOf('premium') === -1 && c.indexOf('بريميوم') === -1) return false;
            return true;
        }
        else if (m.indexOf('thmanyah') !== -1) {
            var numMatch = m.match(/\d+/);
            var num = numMatch ? numMatch[0] : '';
            if (c.indexOf('thmanyah') === -1 && c.indexOf('ثمانية') === -1 && c.indexOf('tmanyah') === -1) return false;
            if (num) {
                var numRegex = new RegExp('(^|\\D)' + num + '(\\D|$)');
                if (!numRegex.test(c)) return false;
            }
            return true;
        }
        else if (m.indexOf('mbc') !== -1) {
            if (c.indexOf('mbc') === -1 && c.indexOf('ام بي سي') === -1) return false;
            if (m.indexOf('action') !== -1 && c.indexOf('action') === -1 && c.indexOf('أكشن') === -1) return false;
            return true;
        }
        else if (m.indexOf('shahid') !== -1) {
            return c.indexOf('shahid') !== -1 || c.indexOf('شاهد') !== -1;
        }
        else if (m.indexOf('starzplay') !== -1) {
            return c.indexOf('starzplay') !== -1 || c.indexOf('starz') !== -1 || c.indexOf('ستارز') !== -1;
        }
        else if (m.indexOf('abu dhabi') !== -1) {
            var numMatch = m.match(/\d+/);
            var num = numMatch ? numMatch[0] : '';
            if (c.indexOf('abu dhabi') === -1 && c.indexOf('ابوظبي') === -1 && c.indexOf('أبوظبي') === -1 && c.indexOf('ad sports') === -1) return false;
            if (num) {
                var numRegex = new RegExp('(^|\\D)' + num + '(\\D|$)');
                if (!numRegex.test(c)) return false;
            }
            return true;
        }
        else if (m.indexOf('dubai') !== -1) {
            var numMatch = m.match(/\d+/);
            var num = numMatch ? numMatch[0] : '';
            if (c.indexOf('dubai') === -1 && c.indexOf('دبي') === -1) return false;
            if (num) {
                var numRegex = new RegExp('(^|\\D)' + num + '(\\D|$)');
                if (!numRegex.test(c)) return false;
            }
            return true;
        }
        else if (m.indexOf('sharjah') !== -1) {
            return c.indexOf('sharjah') !== -1 || c.indexOf('الشارقة') !== -1;
        }

        return c.indexOf(m) !== -1;
    }

    // ---- Find matching leagues for site channels ----
    function getLeaguesForChannels(siteChannels) {
        if (!siteChannels || siteChannels.length === 0) {
            return CHANNEL_LEAGUE_MAP['_default'].leagues;
        }

        const leagueIds = new Set();
        
        siteChannels.forEach(function(ch) {
            const normalized = normalizeChannelName(ch.name);
            let matched = false;

            // Try exact and partial matching
            Object.keys(CHANNEL_LEAGUE_MAP).forEach(function(mapKey) {
                if (mapKey === '_default') return;
                
                if (isChannelMatch(mapKey, ch.name)) {
                    CHANNEL_LEAGUE_MAP[mapKey].leagues.forEach(function(id) {
                        leagueIds.add(id);
                    }); 
                    matched = true;
                }

                // Check keywords
                if (!matched) {
                    CHANNEL_LEAGUE_MAP[mapKey].keywords.forEach(function(kw) {
                        if (normalized.includes(kw.toLowerCase())) {
                            CHANNEL_LEAGUE_MAP[mapKey].leagues.forEach(function(id) {
                                leagueIds.add(id);
                            });
                            matched = true;
                        }
                    });
                }
            });

            // If no match found, add default leagues
            if (!matched) {
                CHANNEL_LEAGUE_MAP['_default'].leagues.forEach(function(id) {
                    leagueIds.add(id);
                });
            }
        });

        return Array.from(leagueIds);
    }

    // ---- Determine best channel for a match based on league ----
    function getBestChannelForMatch(leagueId, siteChannels) {
        if (!siteChannels || siteChannels.length === 0) return null;

        for (var i = 0; i < siteChannels.length; i++) {
            var ch = siteChannels[i];
            
            var mapKeys = Object.keys(CHANNEL_LEAGUE_MAP);
            for (var j = 0; j < mapKeys.length; j++) {
                var mapKey = mapKeys[j];
                if (mapKey === '_default') continue;
                
                if (isChannelMatch(mapKey, ch.name)) {
                    if (CHANNEL_LEAGUE_MAP[mapKey].leagues.indexOf(leagueId) !== -1) {
                        return ch;
                    }
                }
            }
        }

        // Return first channel as fallback
        return siteChannels[0];
    }

    // ---- Fetch fixtures from API-Football ----
    function fetchFixtures(callback) {
        // Check cache first
        var now = Date.now();
        if (cachedFixtures && (now - cacheTimestamp) < CONFIG.CACHE_DURATION * 60 * 1000) {
            callback(null, cachedFixtures);
            return;
        }

        // Load API key from config
        loadConfig(function(config) {
            if (!config || !config.apiKey) {
                callback('API key not configured. Please set it in the dashboard.', null);
                return;
            }

            apiKey = config.apiKey;
            var today = getToday();
            var url = CONFIG.BASE_URL + '/fixtures?date=' + today;

            // Try direct request first
            makeAPIRequest(url, function(err, data) {
                if (err) {
                    // Try CORS proxy
                    tryWithProxy(url, 0, function(proxyErr, proxyData) {
                        if (proxyErr) {
                            callback('Failed to fetch fixtures: ' + proxyErr, null);
                        } else {
                            processFixturesResponse(proxyData, callback);
                        }
                    });
                } else {
                    processFixturesResponse(data, callback);
                }
            });
        });
    }

    function makeAPIRequest(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('x-apisports-key', apiKey);
        xhr.timeout = 15000;
        
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    callback(null, data);
                } catch(e) {
                    callback('Invalid JSON response', null);
                }
            } else {
                callback('HTTP ' + xhr.status, null);
            }
        };
        
        xhr.onerror = function() { callback('Network error', null); };
        xhr.ontimeout = function() { callback('Request timeout', null); };
        xhr.send();
    }

    function tryWithProxy(url, proxyIndex, callback) {
        if (proxyIndex >= CONFIG.CORS_PROXIES.length) {
            callback('All proxies failed', null);
            return;
        }

        var proxyUrl = CONFIG.CORS_PROXIES[proxyIndex] + encodeURIComponent(url);
        
        fetch(proxyUrl, {
            headers: {
                'x-apisports-key': apiKey
            }
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            callback(null, data);
        })
        .catch(function() {
            tryWithProxy(url, proxyIndex + 1, callback);
        });
    }

    function processFixturesResponse(data, callback) {
        if (!data || !data.response) {
            callback('Invalid API response structure', null);
            return;
        }

        cachedFixtures = data.response;
        cacheTimestamp = Date.now();

        // Save to localStorage cache
        try {
            localStorage.setItem('ksports_fixtures_cache', JSON.stringify({
                data: data.response,
                timestamp: cacheTimestamp
            }));
        } catch(e) {}

        callback(null, data.response);
    }

    // ---- Load saved API config ----
    function loadConfig(callback) {
        if (window.DB) {
            window.DB.get(CONFIG.CONFIG_KEY, function(config) {
                if (config && !Array.isArray(config)) {
                    callback(config);
                } else if (Array.isArray(config) && config.length > 0) {
                    callback(config[0]);
                } else {
                    // Try localStorage directly
                    try {
                        var stored = JSON.parse(localStorage.getItem(CONFIG.CONFIG_KEY));
                        callback(stored);
                    } catch(e) {
                        callback(null);
                    }
                }
            });
        } else {
            try {
                var stored = JSON.parse(localStorage.getItem(CONFIG.CONFIG_KEY));
                callback(stored);
            } catch(e) {
                callback(null);
            }
        }
    }

    // ---- Save API config ----
    function saveConfig(config) {
        localStorage.setItem(CONFIG.CONFIG_KEY, JSON.stringify(config));
        if (window.DB) {
            window.DB.save(CONFIG.CONFIG_KEY, config);
        }
    }

    // ---- Convert API fixture to match format ----
    function fixtureToMatch(fixture, channel) {
        var home = fixture.teams.home;
        var away = fixture.teams.away;
        var league = fixture.league;
        var time = toMeccaTime(fixture.fixture.date);
        var leagueName = LEAGUE_NAMES[league.id] || league.name;

        var homeName = home.name;
        var awayName = away.name;

        return {
            id: 'api_' + fixture.fixture.id,
            title: 'بث مباشر مباراة ' + homeName + ' ضد ' + awayName + ' - ' + leagueName,
            home: homeName,
            homeBadge: home.logo || window.getFallbackAvatar(homeName),
            away: awayName,
            awayBadge: away.logo || window.getFallbackAvatar(awayName),
            time: time,
            league: leagueName,
            leagueBadge: league.logo || '',
            iframe: channel ? channel.iframe : '',
            description: '',
            keywords: homeName + ', ' + awayName + ', ' + leagueName + ', بث مباشر, كورة لايف',
            isAutoImported: true,
            apiFixtureId: fixture.fixture.id,
            apiStatus: fixture.fixture.status.short,
            apiLeagueId: league.id,
            channelName: channel ? channel.name : 'غير محدد'
        };
    }

    // ---- Main: Auto-import matches for this site ----
    function autoImportMatches(callback) {
        // Step 1: Get site's channels
        window.DB.get('channels', function(channels) {
            // Step 2: Determine leagues based on channels
            var leagueIds = getLeaguesForChannels(channels);
            
            // Step 3: Fetch today's fixtures
            fetchFixtures(function(err, fixtures) {
                if (err) {
                    callback({ success: false, error: err, imported: 0 });
                    return;
                }

                // Step 4: Filter fixtures by relevant leagues
                var relevantFixtures = fixtures.filter(function(f) {
                    return leagueIds.indexOf(f.league.id) !== -1;
                });

                // Step 5: Get existing matches to avoid duplicates
                window.DB.get('customMatches', function(existingMatches) {
                    var existingIds = {};
                    existingMatches.forEach(function(m) {
                        if (m.apiFixtureId) existingIds[m.apiFixtureId] = true;
                        // Also check by team names to avoid manual + API duplicates
                        existingIds[normalizeChannelName(m.home) + '_' + normalizeChannelName(m.away)] = true;
                    });

                    var newMatches = [];
                    relevantFixtures.forEach(function(fixture) {
                        // Skip if already imported
                        if (existingIds[fixture.fixture.id]) return;
                        
                        var homeKey = normalizeChannelName(fixture.teams.home.name);
                        var awayKey = normalizeChannelName(fixture.teams.away.name);
                        if (existingIds[homeKey + '_' + awayKey]) return;

                        // Find the best matching channel
                        var bestChannel = getBestChannelForMatch(fixture.league.id, channels);
                        
                        var match = fixtureToMatch(fixture, bestChannel);
                        newMatches.push(match);
                    });

                    if (newMatches.length > 0) {
                        // Add new matches to existing ones
                        var allMatches = existingMatches.concat(newMatches);
                        window.DB.save('customMatches', allMatches);
                    }

                    callback({
                        success: true,
                        imported: newMatches.length,
                        total: relevantFixtures.length,
                        matchedLeagues: leagueIds.length,
                        channels: channels.length
                    });
                });
            });
        });
    }

    // ---- Remove all auto-imported matches ----
    function clearAutoImported(callback) {
        window.DB.get('customMatches', function(matches) {
            var filtered = matches.filter(function(m) {
                return !m.isAutoImported;
            });
            window.DB.save('customMatches', filtered);
            callback(matches.length - filtered.length);
        });
    }

    // ---- Get import status ----
    function getImportStatus(callback) {
        window.DB.get('customMatches', function(matches) {
            var autoCount = 0;
            var manualCount = 0;
            matches.forEach(function(m) {
                if (m.isAutoImported) autoCount++;
                else manualCount++;
            });
            callback({
                total: matches.length,
                auto: autoCount,
                manual: manualCount
            });
        });
    }

    // ---- Fetch fixtures preview (without importing) ----
    function previewMatches(callback) {
        window.DB.get('channels', function(channels) {
            var leagueIds = getLeaguesForChannels(channels);
            
            fetchFixtures(function(err, fixtures) {
                if (err) {
                    callback({ success: false, error: err });
                    return;
                }

                var relevantFixtures = fixtures.filter(function(f) {
                    return leagueIds.indexOf(f.league.id) !== -1;
                });

                var previewList = relevantFixtures.map(function(fixture) {
                    var bestChannel = getBestChannelForMatch(fixture.league.id, channels);
                    return fixtureToMatch(fixture, bestChannel);
                });

                callback({
                    success: true,
                    matches: previewList,
                    totalFromAPI: fixtures.length,
                    filteredCount: relevantFixtures.length,
                    leagues: leagueIds.map(function(id) {
                        return { id: id, name: LEAGUE_NAMES[id] || 'League #' + id };
                    })
                });
            });
        });
    }

    // ---- Public API ----
    return {
        // Config
        saveConfig: saveConfig,
        loadConfig: loadConfig,
        
        // Core
        autoImportMatches: autoImportMatches,
        previewMatches: previewMatches,
        clearAutoImported: clearAutoImported,
        getImportStatus: getImportStatus,
        
        // Helpers
        getLeaguesForChannels: getLeaguesForChannels,
        getBestChannelForMatch: getBestChannelForMatch,
        
        // Constants
        LEAGUE_NAMES: LEAGUE_NAMES,
        CHANNEL_LEAGUE_MAP: CHANNEL_LEAGUE_MAP,
        CONFIG: CONFIG,
        isChannelMatch: isChannelMatch
    };
})();
