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
        // الحقوق: كأس العالم، الدوري الإنجليزي، لا ليغا، الدوري الفرنسي،
        //         أبطال أوروبا، الدوري الأوروبي، دوري المؤتمر،
        //         أبطال آسيا، أبطال أفريقيا، كأس أمم أفريقيا
        // ═══════════════════════════════════════════════
        'bein sport 1': {
            leagues: [1, 39, 2, 3, 45, 48, 848, 531], // World Cup, PL, UCL, UEL, FA Cup, EFL Cup, UECL, UEFA Super Cup
            keywords: ['إنجليزي', 'أبطال أوروبا', 'بريميير ليغ']
        },
        'bein sport 2': {
            leagues: [1, 2, 3, 848, 39, 45], // World Cup, UCL, UEL, UECL, PL, FA Cup
            keywords: ['أبطال أوروبا', 'يوروبا ليغ']
        },
        'bein sport 3': {
            leagues: [1, 140, 143, 144, 3, 848], // World Cup, La Liga, Copa del Rey, Spanish Super Cup, UEL, UECL
            keywords: ['اسباني', 'لا ليغا', 'إسباني']
        },
        'bein sport 4': {
            leagues: [1, 61, 66, 848, 2], // World Cup, Ligue 1, Coupe de France, UECL, UCL
            keywords: ['فرنسي', 'ليغ 1']
        },
        'bein sport 5': {
            leagues: [1, 2, 3, 61, 140, 848], // World Cup, UCL, UEL, Ligue 1, La Liga, UECL
            keywords: ['أوروبي']
        },
        'bein sport 6': {
            leagues: [1, 218, 114, 20, 2, 3], // World Cup, AFCON, CAF CL, CAF Confed Cup, UCL, UEL
            keywords: ['أفريقيا', 'كاف']
        },
        'bein sport 7': {
            leagues: [1, 39, 2, 3, 140, 61], // World Cup, PL, UCL, UEL, La Liga, Ligue 1
            keywords: ['أوروبي']
        },
        'bein sport 8': {
            leagues: [1, 39, 2, 3, 140, 61, 848], // World Cup, overflow channels
            keywords: []
        },
        'bein sport 9': {
            leagues: [1, 39, 2, 3, 140, 61, 848], // World Cup, overflow channels
            keywords: []
        },
        'bein sport premium 1': {
            leagues: [1, 39, 2, 140], // World Cup, PL, UCL, La Liga
            keywords: ['بريميوم', 'إنجليزي']
        },
        'bein sport premium 2': {
            leagues: [1, 39, 2, 140, 61], // World Cup, PL, UCL, La Liga, Ligue 1
            keywords: ['بريميوم']
        },
        'bein sport afc': {
            leagues: [1, 17, 18, 480], // World Cup, AFC Champions League Elite, AFC Cup, AFC Qualifiers
            keywords: ['آسيا', 'أبطال آسيا']
        },
        'bein sport xtra 1': {
            leagues: [1, 39, 2, 3, 140, 61], // World Cup, Extra overflow
            keywords: ['إكسترا']
        },
        'bein sport max 1': {
            leagues: [1, 218, 4], // World Cup, AFCON, Euro
            keywords: ['ماكس', 'max', 'كأس العالم']
        },
        'bein sport max 2': {
            leagues: [1, 218, 4], // World Cup, AFCON, Euro
            keywords: ['ماكس', 'max', 'كأس العالم']
        },
        'bein sport max 3': {
            leagues: [1, 218, 4], // World Cup, AFCON, Euro
            keywords: ['ماكس', 'max', 'كأس العالم']
        },
        'bein sport max 4': {
            leagues: [1, 218, 4], // World Cup, AFCON, Euro
            keywords: ['ماكس', 'max', 'كأس العالم']
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
        // الحقوق: دوري نجوم قطر، كأس العالم
        // ═══════════════════════════════════════════════
        'alkass 1': {
            leagues: [1, 153, 154, 17], // World Cup, Qatar Stars League, Qatar Cup, AFC CL
            keywords: ['قطري', 'الكأس']
        },
        'alkass 2': {
            leagues: [1, 153, 154], // World Cup, Qatar Stars League, Qatar Cup
            keywords: ['قطري', 'الكأس']
        },
        'alkass extra 1': {
            leagues: [1], // World Cup
            keywords: ['الكأس إكسترا', 'alkass extra', 'كأس العالم']
        },
        'alkass extra 2': {
            leagues: [1], // World Cup
            keywords: ['الكأس إكسترا', 'alkass extra', 'كأس العالم']
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
            leagues: [1, 39, 140, 61, 2, 3, 848, 307, 78, 135, 17],
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

    // ---- Team Name → Arabic Translation Map ----
    // ✅ قاعدة بيانات أسماء الفرق بالعربية - أكثر من 200 فريق
    const TEAM_NAMES_AR = {
        // ═══════════════════════════════════════════════
        // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 الدوري الإنجليزي الممتاز (Premier League)
        // ═══════════════════════════════════════════════
        'manchester city': 'مانشستر سيتي',
        'manchester united': 'مانشستر يونايتد',
        'liverpool': 'ليفربول',
        'arsenal': 'أرسنال',
        'chelsea': 'تشيلسي',
        'tottenham': 'توتنهام هوتسبير',
        'tottenham hotspur': 'توتنهام هوتسبير',
        'newcastle': 'نيوكاسل يونايتد',
        'newcastle united': 'نيوكاسل يونايتد',
        'aston villa': 'أستون فيلا',
        'west ham': 'وست هام يونايتد',
        'west ham united': 'وست هام يونايتد',
        'brighton': 'برايتون',
        'brighton & hove albion': 'برايتون',
        'crystal palace': 'كريستال بالاس',
        'brentford': 'برينتفورد',
        'wolverhampton': 'وولفرهامبتون',
        'wolverhampton wanderers': 'وولفرهامبتون',
        'wolves': 'وولفرهامبتون',
        'bournemouth': 'بورنموث',
        'afc bournemouth': 'بورنموث',
        'fulham': 'فولهام',
        'nottingham forest': 'نوتينغهام فورست',
        'everton': 'إيفرتون',
        'luton': 'لوتون تاون',
        'luton town': 'لوتون تاون',
        'burnley': 'بيرنلي',
        'sheffield united': 'شيفيلد يونايتد',
        'leicester': 'ليستر سيتي',
        'leicester city': 'ليستر سيتي',
        'ipswich': 'إيبسويتش تاون',
        'ipswich town': 'إيبسويتش تاون',
        'southampton': 'ساوثهامبتون',
        'leeds': 'ليدز يونايتد',
        'leeds united': 'ليدز يونايتد',

        // ═══════════════════════════════════════════════
        // 🇪🇸 الدوري الإسباني (La Liga)
        // ═══════════════════════════════════════════════
        'real madrid': 'ريال مدريد',
        'barcelona': 'برشلونة',
        'fc barcelona': 'برشلونة',
        'atletico madrid': 'أتلتيكو مدريد',
        'atletico de madrid': 'أتلتيكو مدريد',
        'real sociedad': 'ريال سوسيداد',
        'real betis': 'ريال بيتيس',
        'villarreal': 'فياريال',
        'athletic bilbao': 'أتلتيك بيلباو',
        'athletic club': 'أتلتيك بيلباو',
        'sevilla': 'إشبيلية',
        'sevilla fc': 'إشبيلية',
        'valencia': 'فالنسيا',
        'valencia cf': 'فالنسيا',
        'osasuna': 'أوساسونا',
        'getafe': 'خيتافي',
        'getafe cf': 'خيتافي',
        'celta vigo': 'سيلتا فيغو',
        'celta de vigo': 'سيلتا فيغو',
        'rayo vallecano': 'رايو فاليكانو',
        'mallorca': 'ريال مايوركا',
        'rcd mallorca': 'ريال مايوركا',
        'cadiz': 'قادش',
        'cadiz cf': 'قادش',
        'almeria': 'ألميريا',
        'ud almeria': 'ألميريا',
        'girona': 'جيرونا',
        'girona fc': 'جيرونا',
        'las palmas': 'لاس بالماس',
        'ud las palmas': 'لاس بالماس',
        'alaves': 'ديبورتيفو ألافيس',
        'deportivo alaves': 'ديبورتيفو ألافيس',
        'granada': 'غرناطة',
        'granada cf': 'غرناطة',
        'espanyol': 'إسبانيول',
        'rcd espanyol': 'إسبانيول',
        'leganes': 'ليغانيس',
        'cd leganes': 'ليغانيس',
        'real valladolid': 'بلد الوليد',

        // ═══════════════════════════════════════════════
        // 🇮🇹 الدوري الإيطالي (Serie A)
        // ═══════════════════════════════════════════════
        'inter': 'إنتر ميلان',
        'inter milan': 'إنتر ميلان',
        'internazionale': 'إنتر ميلان',
        'ac milan': 'إيه سي ميلان',
        'milan': 'إيه سي ميلان',
        'juventus': 'يوفنتوس',
        'napoli': 'نابولي',
        'ssc napoli': 'نابولي',
        'roma': 'روما',
        'as roma': 'روما',
        'lazio': 'لاتسيو',
        'ss lazio': 'لاتسيو',
        'atalanta': 'أتالانتا',
        'fiorentina': 'فيورنتينا',
        'acf fiorentina': 'فيورنتينا',
        'bologna': 'بولونيا',
        'bologna fc': 'بولونيا',
        'torino': 'تورينو',
        'torino fc': 'تورينو',
        'monza': 'مونزا',
        'udinese': 'أودينيزي',
        'sassuolo': 'ساسوولو',
        'cagliari': 'كالياري',
        'empoli': 'إمبولي',
        'frosinone': 'فروسينوني',
        'lecce': 'ليتشي',
        'us lecce': 'ليتشي',
        'genoa': 'جنوى',
        'genoa cfc': 'جنوى',
        'hellas verona': 'هيلاس فيرونا',
        'salernitana': 'ساليرنيتانا',
        'como': 'كومو',
        'parma': 'بارما',
        'venezia': 'فينيسيا',

        // ═══════════════════════════════════════════════
        // 🇩🇪 الدوري الألماني (Bundesliga)
        // ═══════════════════════════════════════════════
        'bayern munich': 'بايرن ميونخ',
        'fc bayern munich': 'بايرن ميونخ',
        'bayern munchen': 'بايرن ميونخ',
        'borussia dortmund': 'بوروسيا دورتموند',
        'dortmund': 'بوروسيا دورتموند',
        'rb leipzig': 'آر بي لايبزيغ',
        'rasenballsport leipzig': 'آر بي لايبزيغ',
        'bayer leverkusen': 'باير ليفركوزن',
        'leverkusen': 'باير ليفركوزن',
        'eintracht frankfurt': 'آينتراخت فرانكفورت',
        'frankfurt': 'آينتراخت فرانكفورت',
        'union berlin': 'يونيون برلين',
        'vfb stuttgart': 'شتوتغارت',
        'stuttgart': 'شتوتغارت',
        'sc freiburg': 'فرايبورغ',
        'freiburg': 'فرايبورغ',
        'borussia monchengladbach': 'بوروسيا مونشنغلادباخ',
        'monchengladbach': 'بوروسيا مونشنغلادباخ',
        'vfl wolfsburg': 'فولفسبورغ',
        'wolfsburg': 'فولفسبورغ',
        'tsg hoffenheim': 'هوفنهايم',
        'hoffenheim': 'هوفنهايم',
        'werder bremen': 'فيردر بريمن',
        'bremen': 'فيردر بريمن',
        'mainz 05': 'ماينتس',
        'mainz': 'ماينتس',
        'fc augsburg': 'أوغسبورغ',
        'augsburg': 'أوغسبورغ',
        'vfl bochum': 'بوخوم',
        'bochum': 'بوخوم',
        'fc koln': 'كولن',
        'koln': 'كولن',
        'heidenheim': 'هايدنهايم',
        'darmstadt': 'دارمشتات',
        'st. pauli': 'سانت باولي',
        'holstein kiel': 'هولشتاين كيل',

        // ═══════════════════════════════════════════════
        // 🇫🇷 الدوري الفرنسي (Ligue 1)
        // ═══════════════════════════════════════════════
        'paris saint-germain': 'باريس سان جيرمان',
        'paris saint germain': 'باريس سان جيرمان',
        'psg': 'باريس سان جيرمان',
        'marseille': 'أولمبيك مارسيليا',
        'olympique de marseille': 'أولمبيك مارسيليا',
        'olympique marseille': 'أولمبيك مارسيليا',
        'monaco': 'موناكو',
        'as monaco': 'موناكو',
        'lyon': 'أولمبيك ليون',
        'olympique lyonnais': 'أولمبيك ليون',
        'lille': 'ليل',
        'losc lille': 'ليل',
        'lens': 'لانس',
        'rc lens': 'لانس',
        'nice': 'نيس',
        'ogc nice': 'نيس',
        'rennes': 'رين',
        'stade rennais': 'رين',
        'strasbourg': 'ستراسبورغ',
        'rc strasbourg': 'ستراسبورغ',
        'nantes': 'نانت',
        'fc nantes': 'نانت',
        'montpellier': 'مونبلييه',
        'montpellier hsc': 'مونبلييه',
        'reims': 'ريمس',
        'stade de reims': 'ريمس',
        'toulouse': 'تولوز',
        'toulouse fc': 'تولوز',
        'brest': 'بريست',
        'stade brestois': 'بريست',
        'le havre': 'لوهافر',
        'le havre ac': 'لوهافر',
        'clermont': 'كليرمون فوت',
        'clermont foot': 'كليرمون فوت',
        'lorient': 'لوريان',
        'fc lorient': 'لوريان',
        'metz': 'ميتز',
        'fc metz': 'ميتز',
        'auxerre': 'أوكسير',
        'aj auxerre': 'أوكسير',
        'angers': 'أنجيه',
        'angers sco': 'أنجيه',
        'saint-etienne': 'سانت إتيان',
        'as saint-etienne': 'سانت إتيان',

        // ═══════════════════════════════════════════════
        // 🇸🇦 دوري روشن السعودي
        // ═══════════════════════════════════════════════
        'al hilal': 'الهلال',
        'al-hilal': 'الهلال',
        'al ahli': 'الأهلي',
        'al-ahli': 'الأهلي',
        'al ittihad': 'الاتحاد',
        'al-ittihad': 'الاتحاد',
        'al nassr': 'النصر',
        'al-nassr': 'النصر',
        'al shabab': 'الشباب',
        'al-shabab': 'الشباب',
        'al fateh': 'الفتح',
        'al-fateh': 'الفتح',
        'al raed': 'الرائد',
        'al-raed': 'الرائد',
        'al taawoun': 'التعاون',
        'al-taawoun': 'التعاون',
        'al tai': 'الطائي',
        'al-tai': 'الطائي',
        'al feiha': 'الفيحاء',
        'al-feiha': 'الفيحاء',
        'al ettifaq': 'الاتفاق',
        'al-ettifaq': 'الاتفاق',
        'al khaleej': 'الخليج',
        'al-khaleej': 'الخليج',
        'al riyadh': 'الرياض',
        'al-riyadh': 'الرياض',
        'damac': 'ضمك',
        'damac fc': 'ضمك',
        'al akhdoud': 'الأخدود',
        'al-akhdoud': 'الأخدود',
        'al qadsiah': 'القادسية',
        'al-qadsiah': 'القادسية',
        'al orubah': 'العروبة',
        'al-orubah': 'العروبة',
        'al kholood': 'الخلود',
        'al-kholood': 'الخلود',

        // ═══════════════════════════════════════════════
        // 🇪🇬 الدوري المصري
        // ═══════════════════════════════════════════════
        'al ahly': 'الأهلي',
        'al ahly sc': 'الأهلي',
        'zamalek': 'الزمالك',
        'zamalek sc': 'الزمالك',
        'pyramids': 'بيراميدز',
        'pyramids fc': 'بيراميدز',
        'al masry': 'المصري',
        'al-masry': 'المصري البورسعيدي',
        'ismaily': 'الإسماعيلي',
        'ismaily sc': 'الإسماعيلي',
        'ceramica cleopatra': 'سيراميكا كليوباترا',
        'future fc': 'فيوتشر',
        'el mokawloon': 'المقاولون العرب',
        'national bank': 'البنك الأهلي',
        'national bank of egypt': 'البنك الأهلي',
        'pharco': 'فاركو',
        'pharco fc': 'فاركو',
        'smouha': 'سموحة',
        'smouha sc': 'سموحة',
        'enppi': 'إنبي',
        'el gaish': 'الجيش',
        'al ittihad alexandria': 'الاتحاد السكندري',
        'zed fc': 'زد',
        'ghazl el mahalla': 'غزل المحلة',
        'el daklyeh': 'الداخلية',

        // ═══════════════════════════════════════════════
        // 🇲🇦 الدوري المغربي (بوتولا برو)
        // ═══════════════════════════════════════════════
        'wydad ac': 'الوداد',
        'wydad casablanca': 'الوداد الرياضي',
        'wydad athletic club': 'الوداد الرياضي',
        'raja casablanca': 'الرجاء البيضاوي',
        'raja ca': 'الرجاء البيضاوي',
        'rs berkane': 'نهضة بركان',
        'renaissance berkane': 'نهضة بركان',
        'fus rabat': 'الفتح الرياضي',
        'fath union sport': 'الفتح الرياضي',
        'as far': 'الجيش الملكي',
        'far rabat': 'الجيش الملكي',
        'maghreb fes': 'المغرب الفاسي',
        'mouloudia oujda': 'مولودية وجدة',
        'hassania agadir': 'حسنية أكادير',
        'ittihad tanger': 'اتحاد طنجة',
        'olympic safi': 'أولمبيك آسفي',
        'moghreb tetouan': 'المغرب التطواني',
        'difaa el jadida': 'الدفاع الجديدي',
        'rapide oued zem': 'سريع واد زم',
        'chabab mohammedia': 'شباب المحمدية',
        'youssoufia berrechid': 'اليوسفية',

        // ═══════════════════════════════════════════════
        // 🇶🇦 دوري نجوم قطر
        // ═══════════════════════════════════════════════
        'al sadd': 'السد',
        'al-sadd': 'السد',
        'al duhail': 'الدحيل',
        'al-duhail': 'الدحيل',
        'al rayyan': 'الريان',
        'al-rayyan': 'الريان',
        'al gharafa': 'الغرافة',
        'al-gharafa': 'الغرافة',
        'al arabi': 'العربي',
        'al-arabi': 'العربي',
        'al wakrah': 'الوكرة',
        'al-wakrah': 'الوكرة',
        'umm salal': 'أم صلال',
        'qatar sc': 'قطر',
        'al shamal': 'الشمال',
        'al-shamal': 'الشمال',
        'al ahli doha': 'الأهلي الدوحة',
        'muaither': 'معيذر',

        // ═══════════════════════════════════════════════
        // 🇦🇪 الدوري الإماراتي
        // ═══════════════════════════════════════════════
        'al ain': 'العين',
        'al-ain': 'العين',
        'al wahda': 'الوحدة',
        'al-wahda': 'الوحدة',
        'shabab al ahli': 'شباب الأهلي',
        'shabab al-ahli': 'شباب الأهلي',
        'al jazira': 'الجزيرة',
        'al-jazira': 'الجزيرة',
        'al wasl': 'الوصل',
        'al-wasl': 'الوصل',
        'sharjah fc': 'الشارقة',
        'sharjah': 'الشارقة',
        'baniyas': 'بني ياس',
        'bani yas': 'بني ياس',
        'ajman': 'عجمان',
        'ajman club': 'عجمان',
        'al nasr dubai': 'النصر دبي',
        'al dhafra': 'الظفرة',
        'al-dhafra': 'الظفرة',
        'khor fakkan': 'خورفكان',
        'hatta': 'حتا',
        'emirates club': 'الإمارات',
        'ittihad kalba': 'اتحاد كلباء',

        // ═══════════════════════════════════════════════
        // 🇵🇹 الدوري البرتغالي
        // ═══════════════════════════════════════════════
        'benfica': 'بنفيكا',
        'sl benfica': 'بنفيكا',
        'fc porto': 'بورتو',
        'porto': 'بورتو',
        'sporting cp': 'سبورتينغ لشبونة',
        'sporting lisbon': 'سبورتينغ لشبونة',
        'braga': 'سبورتينغ براغا',
        'sc braga': 'سبورتينغ براغا',
        'vitoria guimaraes': 'فيتوريا غيماريش',

        // ═══════════════════════════════════════════════
        // 🇳🇱 الدوري الهولندي
        // ═══════════════════════════════════════════════
        'ajax': 'أياكس',
        'afc ajax': 'أياكس',
        'psv': 'آيندهوفن',
        'psv eindhoven': 'آيندهوفن',
        'feyenoord': 'فيينورد',
        'az alkmaar': 'أيه زد ألكمار',
        'fc twente': 'تفينتي',

        // ═══════════════════════════════════════════════
        // 🇹🇷 الدوري التركي
        // ═══════════════════════════════════════════════
        'galatasaray': 'غلطة سراي',
        'fenerbahce': 'فنربخشة',
        'besiktas': 'بشكتاش',
        'trabzonspor': 'طرابزون سبور',
        'istanbul basaksehir': 'باشاك شهير',

        // ═══════════════════════════════════════════════
        // 🌍 أندية أفريقية بارزة
        // ═══════════════════════════════════════════════
        'esperance tunis': 'الترجي التونسي',
        'esperance de tunis': 'الترجي التونسي',
        'es tunis': 'الترجي التونسي',
        'club africain': 'النادي الأفريقي',
        'etoile du sahel': 'النجم الساحلي',
        'cs sfaxien': 'النادي الصفاقسي',
        'tp mazembe': 'تي بي مازيمبي',
        'mamelodi sundowns': 'صنداونز',
        'al merrikh': 'المريخ',
        'al hilal omdurman': 'الهلال السوداني',
        'mc alger': 'مولودية الجزائر',
        'usm alger': 'اتحاد العاصمة',
        'cr belouizdad': 'شباب بلوزداد',
        'js kabylie': 'شبيبة القبائل',
        'es setif': 'وفاق سطيف',

        // ═══════════════════════════════════════════════
        // 🌐 منتخبات دولية
        // ═══════════════════════════════════════════════
        'spain': 'إسبانيا',
        'germany': 'ألمانيا',
        'france': 'فرنسا',
        'england': 'إنجلترا',
        'italy': 'إيطاليا',
        'brazil': 'البرازيل',
        'argentina': 'الأرجنتين',
        'portugal': 'البرتغال',
        'netherlands': 'هولندا',
        'belgium': 'بلجيكا',
        'croatia': 'كرواتيا',
        'morocco': 'المغرب',
        'senegal': 'السنغال',
        'tunisia': 'تونس',
        'algeria': 'الجزائر',
        'egypt': 'مصر',
        'cameroon': 'الكاميرون',
        'nigeria': 'نيجيريا',
        'ghana': 'غانا',
        'ivory coast': "كوت ديفوار",
        'saudi arabia': 'السعودية',
        'qatar': 'قطر',
        'uae': 'الإمارات',
        'united arab emirates': 'الإمارات',
        'iraq': 'العراق',
        'jordan': 'الأردن',
        'japan': 'اليابان',
        'south korea': 'كوريا الجنوبية',
        'australia': 'أستراليا',
        'usa': 'الولايات المتحدة',
        'united states': 'الولايات المتحدة',
        'mexico': 'المكسيك',
        'turkey': 'تركيا',
        'iran': 'إيران',
        'syria': 'سوريا',
        'palestine': 'فلسطين',
        'libya': 'ليبيا',
        'sudan': 'السودان',
        'oman': 'عُمان',
        'bahrain': 'البحرين',
        'kuwait': 'الكويت',
        'yemen': 'اليمن',
        'lebanon': 'لبنان'
    };

    // ---- Helper: Translate team name to Arabic (Dynamic) ----
    const translationCache = {};
    async function translateTeamNameAsync(englishName) {
        if (!englishName) return englishName;
        var original = englishName.trim();
        // Remove FC, CF, United etc. to improve translation
        var name = original.replace(/^(fc|cf|ac|rc|sc|cd|ud|rcd|sd|us|as|cs|es)\s/i, '')
                           .replace(/\s(fc|cf|sc|united|city|town|club|rovers|wanderers|athletic|sporting|association)$/i, '')
                           .trim();
        
        var key = name.toLowerCase();
        var fullKey = original.toLowerCase();

        if (TEAM_NAMES_AR[fullKey]) return TEAM_NAMES_AR[fullKey];
        if (TEAM_NAMES_AR[key]) return TEAM_NAMES_AR[key];
        if (translationCache[key]) return translationCache[key];

        // Fallback to Google Translate API (Free)
        try {
            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=' + encodeURIComponent(name);
            var response = await fetch(url);
            var data = await response.json();
            var arabicName = data[0][0][0];
            // Remove some common weird transliterations if they occur
            arabicName = arabicName.replace('نادي ', '').trim();
            translationCache[key] = arabicName;
            return arabicName;
        } catch(e) {
            console.error('Translation error for', name, e);
            translationCache[key] = original;
            return original;
        }
    }

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
            var isMax = m.indexOf('max') !== -1;
            
            if (c.indexOf('bein') === -1 && c.indexOf('بين') === -1 && c.indexOf('بي ان') === -1) return false;
            if (num) {
                var numRegex = new RegExp('(^|\\D)' + num + '(\\D|$)');
                if (!numRegex.test(c)) return false;
            }
            if (isPremium && c.indexOf('premium') === -1 && c.indexOf('بريميوم') === -1) return false;
            if (isMax && c.indexOf('max') === -1 && c.indexOf('ماكس') === -1) return false;
            if (!isMax && (c.indexOf('max') !== -1 || c.indexOf('ماكس') !== -1)) return false;
            return true;
        }
        else if (m.indexOf('alkass') !== -1) {
            var numMatch = m.match(/\d+/);
            var num = numMatch ? numMatch[0] : '';
            var isExtra = m.indexOf('extra') !== -1;
            
            if (c.indexOf('alkass') === -1 && c.indexOf('الكأس') === -1 && c.indexOf('الكاس') === -1) return false;
            if (num) {
                var numRegex = new RegExp('(^|\\D)' + num + '(\\D|$)');
                if (!numRegex.test(c)) return false;
            }
            if (isExtra && c.indexOf('extra') === -1 && c.indexOf('إكسترا') === -1 && c.indexOf('اكسترا') === -1) return false;
            if (!isExtra && (c.indexOf('extra') !== -1 || c.indexOf('إكسترا') !== -1 || c.indexOf('اكسترا') !== -1)) return false;
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

        var bestCh = null;
        var bestScore = -1;

        for (var i = 0; i < siteChannels.length; i++) {
            var ch = siteChannels[i];
            
            var mapKeys = Object.keys(CHANNEL_LEAGUE_MAP);
            for (var j = 0; j < mapKeys.length; j++) {
                var mapKey = mapKeys[j];
                if (mapKey === '_default') continue;
                
                if (isChannelMatch(mapKey, ch.name)) {
                    if (CHANNEL_LEAGUE_MAP[mapKey].leagues.indexOf(leagueId) !== -1) {
                        var score = 1;
                        if (mapKey.indexOf('max') !== -1 || mapKey.indexOf('extra') !== -1) {
                            score = 2;
                        }
                        if (score > bestScore) {
                            bestScore = score;
                            bestCh = ch;
                        }
                    }
                }
            }
        }

        return bestCh || siteChannels[0];
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
    function fixtureToMatch(fixture, channel, tsHome, tsAway) {
        var home = fixture.teams.home;
        var away = fixture.teams.away;
        var league = fixture.league;
        var time = toMeccaTime(fixture.fixture.date);
        var leagueName = LEAGUE_NAMES[league.id] || league.name;

        var homeName = tsHome || home.name;
        var awayName = tsAway || away.name;

        return {
            id: 'api_' + fixture.fixture.id,
            title: '\u0628\u062B \u0645\u0628\u0627\u0634\u0631 \u0645\u0628\u0627\u0631\u0627\u0629 ' + homeName + ' \u0636\u062F ' + awayName + ' - ' + leagueName,
            home: homeName,
            homeBadge: home.logo || window.getFallbackAvatar(homeName),
            away: awayName,
            awayBadge: away.logo || window.getFallbackAvatar(awayName),
            time: time,
            league: leagueName,
            leagueBadge: league.logo || '',
            iframe: channel ? channel.iframe : '',
            description: '',
            keywords: homeName + ', ' + awayName + ', ' + home.name + ', ' + away.name + ', ' + leagueName + ', \u0628\u062B \u0645\u0628\u0627\u0634\u0631, \u0643\u0648\u0631\u0629 \u0644\u0627\u064A\u0641',
            isAutoImported: true,
            apiFixtureId: fixture.fixture.id,
            apiStatus: fixture.fixture.status.short,
            apiLeagueId: league.id,
            channelName: channel ? channel.name : '\u063A\u064A\u0631 \u0645\u062D\u062F\u062F',
            // Live Score Data from API
            liveStatus: fixture.fixture.status.short,
            liveHomeScore: fixture.goals ? fixture.goals.home : null,
            liveAwayScore: fixture.goals ? fixture.goals.away : null,
            liveMinute: fixture.fixture.status.elapsed
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

                    (async function() {
                        var newMatches = [];
                        for (var i = 0; i < relevantFixtures.length; i++) {
                            var fixture = relevantFixtures[i];
                            // Skip if already imported
                            if (existingIds[fixture.fixture.id]) continue;
                            
                            var homeKey = normalizeChannelName(fixture.teams.home.name);
                            var awayKey = normalizeChannelName(fixture.teams.away.name);
                            if (existingIds[homeKey + '_' + awayKey]) continue;

                            // Find the best matching channel
                            var bestChannel = getBestChannelForMatch(fixture.league.id, channels);
                            
                            var tsHome = await translateTeamNameAsync(fixture.teams.home.name);
                            var tsAway = await translateTeamNameAsync(fixture.teams.away.name);

                            var match = fixtureToMatch(fixture, bestChannel, tsHome, tsAway);
                            newMatches.push(match);
                        }

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
                    })();
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

                (async function() {
                    var previewList = [];
                    for (var i = 0; i < relevantFixtures.length; i++) {
                        var fixture = relevantFixtures[i];
                        var bestChannel = getBestChannelForMatch(fixture.league.id, channels);
                        var tsHome = await translateTeamNameAsync(fixture.teams.home.name);
                        var tsAway = await translateTeamNameAsync(fixture.teams.away.name);
                        previewList.push(fixtureToMatch(fixture, bestChannel, tsHome, tsAway));
                    }

                    callback({
                        success: true,
                        matches: previewList,
                        totalFromAPI: fixtures.length,
                        filteredCount: relevantFixtures.length,
                        leagues: leagueIds.map(function(id) {
                            return { id: id, name: LEAGUE_NAMES[id] || 'League #' + id };
                        })
                    });
                })();
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
        translateTeamNameAsync: translateTeamNameAsync,
        
        // Constants
        LEAGUE_NAMES: LEAGUE_NAMES,
        TEAM_NAMES_AR: TEAM_NAMES_AR,
        CHANNEL_LEAGUE_MAP: CHANNEL_LEAGUE_MAP,
        CONFIG: CONFIG,
        isChannelMatch: isChannelMatch
    };
})();
