// dashboard.js - Management logic
document.addEventListener('DOMContentLoaded', () => {
    // --- Channels Management ---
    const addChannelForm = document.getElementById('addChannelForm');
    const nameInput = document.getElementById('channelName');
    const iframeInput = document.getElementById('channelIframe');
    const adminChannelsList = document.getElementById('adminChannelsList');
    const btnTest = document.getElementById('btnTest');
    const previewBox = document.getElementById('previewBox');
    const previewWrapper = document.getElementById('previewWrapper');

    function loadChannels() {
        const storedChannels = JSON.parse(localStorage.getItem('channels')) || [];
        adminChannelsList.innerHTML = '';
        storedChannels.forEach((channel, index) => {
            const item = document.createElement('div');
            item.className = 'channel-list-item';
            
            // Encode to base64 to avoid quote issues in the inline onclick
            const encodedIframe = btoa(unescape(encodeURIComponent(channel.iframe)));

            item.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight:700;">${channel.name}</div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-test" style="width:auto; padding:5px 15px; margin:0;" onclick="copyCode('${encodedIframe}')"><i class="fas fa-copy"></i> نسخ الكود</button>
                    <button class="btn-delete" onclick="deleteChannel(${index})"><i class="fas fa-trash"></i> حذف</button>
                </div>
            `;
            adminChannelsList.appendChild(item);
        });
    }

    window.copyCode = (encodedText) => {
        try {
            const text = decodeURIComponent(escape(atob(encodedText)));
            const tempInput = document.createElement('textarea');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            alert('تم نسخ الكود بنجاح!');
        } catch (e) {
            console.error('Copy failed', e);
            alert('فشل في نسخ الكود');
        }
    };

    btnTest.addEventListener('click', () => {
        let code = iframeInput.value.trim();
        if (!code) {
            alert('يرجى وضع كود الـ IFRAME أو رابط القناة أولاً');
            return;
        }
        
        if (!code.startsWith('<iframe') && code.startsWith('http')) {
            code = `<iframe src="${code}" allowfullscreen></iframe>`;
        }
        
        previewBox.style.display = 'block';
        previewWrapper.innerHTML = code;
    });

    addChannelForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const storedChannels = JSON.parse(localStorage.getItem('channels')) || [];
        const newChannel = {
            id: Date.now(),
            name: nameInput.value,
            iframe: iframeInput.value
        };
        storedChannels.push(newChannel);
        localStorage.setItem('channels', JSON.stringify(storedChannels));
        
        nameInput.value = '';
        iframeInput.value = '';
        previewBox.style.display = 'none';
        previewWrapper.innerHTML = '';
        loadChannels();
        alert('تمت إضافة القناة بنجاح!');
    });

    window.deleteChannel = (index) => {
        if (confirm('هل أنت متأكد من حذف هذه القناة؟')) {
            const storedChannels = JSON.parse(localStorage.getItem('channels')) || [];
            storedChannels.splice(index, 1);
            localStorage.setItem('channels', JSON.stringify(storedChannels));
            loadChannels();
        }
    };

    // --- Matches Management ---
    const addMatchForm = document.getElementById('addMatchForm');
    const adminMatchesList = document.getElementById('adminMatchesList');

    function loadMatchesAdmin() {
        const storedMatches = JSON.parse(localStorage.getItem('customMatches')) || [];
        adminMatchesList.innerHTML = '';
        storedMatches.forEach((match, index) => {
            const item = document.createElement('div');
            item.className = 'channel-list-item';
            item.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;flex:1;">
                    <img src="${match.homeBadge}" style="width:28px;height:28px;object-fit:contain;border-radius:4px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.home)}&background=3f5efb&color=fff'">
                    <span>${match.title} (${match.league})</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-primary" style="padding:5px 15px; margin:0;" onclick="editMatch(${index})"><i class="fas fa-edit"></i> تعديل</button>
                    <button class="btn-delete" onclick="deleteMatch(${index})"><i class="fas fa-trash"></i> حذف</button>
                </div>
            `;
            adminMatchesList.appendChild(item);
        });
    }

    // ---- Edit Match Logic ----
    window.currentEditMatchIndex = -1;

    window.editMatch = (index) => {
        const storedMatches = JSON.parse(localStorage.getItem('customMatches')) || [];
        const m = storedMatches[index];
        if(!m) return;
        
        document.getElementById('matchHome').value = m.home || '';
        document.getElementById('matchHomeBadge').value = (m.homeBadge && m.homeBadge.includes('ui-avatars')) ? '' : (m.homeBadge || '');
        document.getElementById('matchAway').value = m.away || '';
        document.getElementById('matchAwayBadge').value = (m.awayBadge && m.awayBadge.includes('ui-avatars')) ? '' : (m.awayBadge || '');
        document.getElementById('matchLeague').value = m.league || '';
        document.getElementById('matchTime').value = m.time || '';
        document.getElementById('matchIframe').value = m.iframe || '';
        
        previewHomeLogo.src = m.homeBadge || '';
        previewAwayLogo.src = m.awayBadge || '';
        
        window.currentEditMatchIndex = index;
        const submitBtn = addMatchForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
        submitBtn.style.background = 'linear-gradient(45deg, #00ecbc, #00c69d)';
        
        // Scroll to form
        document.getElementById('addMatchForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ---- Manual Logo Preview ----
    const previewHomeLogo = document.getElementById('previewHomeLogo');
    const previewAwayLogo = document.getElementById('previewAwayLogo');

    document.getElementById('matchHomeBadge').addEventListener('input', function() {
        previewHomeLogo.src = this.value.trim();
    });
    document.getElementById('matchAwayBadge').addEventListener('input', function() {
        previewAwayLogo.src = this.value.trim();
    });
    // ---- End Preview ----

    addMatchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const storedMatches = JSON.parse(localStorage.getItem('customMatches')) || [];
        
        const homeName     = document.getElementById('matchHome').value.trim();
        const homeBadge    = document.getElementById('matchHomeBadge').value.trim();
        const awayName     = document.getElementById('matchAway').value.trim();
        const awayBadge    = document.getElementById('matchAwayBadge').value.trim();
        const leagueName   = document.getElementById('matchLeague').value.trim();

        const title = `بث مباشر مباراة ${homeName} ضد ${awayName} - ${leagueName}`;
        
        // AI-Powered Detailed Description Generator (SEO Optimized - ~1000 words)
        const generateDetailedDescription = (h, a, l) => {
            const paragraphs = [];
            
            // 1. Introduction & Main Hook
            paragraphs.push(`مرحباً بكم زوارنا الكرام في تغطية حصرية ومباشرة عبر منصتكم المفضلة "ستريم لايف"، حيث نلتقي اليوم في واحدة من أهم وأبرز المواجهات الكروية التي يترقبها عشاق الساحرة المستديرة في كل مكان. تتجه أنظار الملايين من محبي كرة القدم نحو هذه القمة الكروية النارية التي تجمع بين فريق ${h} ونظيره العنيد فريق ${a}، وذلك في إطار منافسات الجولة الحاسمة من بطولة ${l}. هذه المباراة ليست مجرد تسعين دقيقة اعتيادية، بل هي ملحمة كروية يتوقع أن تشهد الكثير من الإثارة، الندية، والأهداف الرائعة نظراً للقيمة الفنية العالية التي يمتلكها كلا الفريقين. نحن هنا لنقدم لكم أفضل تجربة مشاهدة ممكنة، حيث نسعى جاهدين لتوفير بث مباشر عالي السلاسة وبدون أي تقطيع، لضمان استمتاعكم بكل لحظة من لحظات هذا اللقاء التاريخي.`);

            // 2. Importance of the match and League context
            paragraphs.push(`تكتسب هذه المواجهة بين ${h} و ${a} أهمية مضاعفة نظراً للموقف الحالي لكلا الفريقين في جدول ترتيب ${l}. ففي عالم كرة القدم الحديثة، كل نقطة تمثل فارقاً جوهرياً في مسيرة التتويج بالألقاب أو تجنب شبح الهبوط أو حتى ضمان مقعد مؤهل للبطولات القارية. بطولة ${l} لطالما عودتنا على المفاجآت والسيناريوهات الدرامية التي تحبس الأنفاس حتى الثواني الأخيرة. الجمهور اليوم لا يبحث فقط عن الانتصار، بل عن الأداء الممتع والروح القتالية التي تميز الكبار. إن الصراع التكتيكي المنتظر بين الأجهزة الفنية سيلعب دوراً محورياً في حسم هذه المعركة، حيث يسعى كل مدرب لفرض أسلوب لعبه واستغلال نقاط ضعف الخصم بأفضل طريقة ممكنة.`);

            // 3. Team H (Home) Analysis
            paragraphs.push(`إذا نظرنا عن قرب إلى فريق ${h}، فإنه يدخل هذا اللقاء متسلحاً بعاملي الأرض والجمهور - في حال أقيمت المباراة على ملعبه - وهو عامل لا يمكن الاستهانة به في رفع الروح المعنوية للاعبين وبث الرعب في قلوب المنافسين. ويمتلك ${h} كوكبة من النجوم البارزين الذين يتمتعون بمهارات فردية استثنائية قادرة على صنع الفارق في أي لحظة. تاريخ النادي حافل بالبطولات والإنجازات التي تجعل من قميصه مصدر فخر لكل من يرتديه ومصدر تهديد لكل من يواجهه. خط الهجوم لدى ${h} يتميز بالسرعة الفائقة والحسم أمام المرمى، بينما يعتمد خط الوسط على البناء المنظم للهجمات والسيطرة على إيقاع اللعب، مما يجعلهم خصماً صعب المراس في بطولة ${l}.`);

            // 4. Team A (Away) Analysis
            paragraphs.push(`في المقابل، لا يمكن بأي حال من الأحوال التقليل من شأن فريق ${a}، الذي أثبت مراراً وتكراراً قدرته على قهر الصعاب والتفوق على أقوى المنافسين حتى خارج ميدانه. يتميز ${a} بشخصية البطل وعقلية الانتصارات التي ترفض الاستسلام مهما كانت الظروف المقابلة. استراتيجية ${a} غالباً ما تتسم بالانضباط التكتيكي العالي، الصلابة الدفاعية، والاعتماد السريع على الهجمات المرتدة الخاطفة التي تمزق دفاعات الخصوم. جماهير ${a} التي زحفت لمؤازرة فريقها تأمل في رؤية فريقها يحصد النقاط الثلاث ويقدم رسالة تحذير شديدة اللهجة لباقي المنافسين في ${l}.`);

            // 5. Tactical Battle and Key Players
            paragraphs.push(`المعركة الحقيقية اليوم لن تكون فقط بين اللاعبين داخل المستطيل الأخضر، بل ستتجلى أيضاً في المنطقة الفنية بين المدربين. كلاهما يمتلك دهاءاً كروياً ورؤية ثاقبة لقراءة مجريات اللعب وإجراء التبديلات الحاسمة التي قد تقلب موازين المباراة. هل سيعتمد مدرب ${h} على الضغط العالي والحصار الهجومي المبكر؟ أم سيختار مدرب ${a} امتصاص حماس البداية وضرب دفاعات الخصم بالسرعات على الأطراف؟ وتظل الأنظار معلقة على مفاتيح اللعب والنجوم الذين تعول عليهم الجماهير لفك شفرة هذه القمة، سواء عبر تسديدة بعيدة المدى، تمريرة بينية سحرية، أو ارتقاء رأسي قوي يمزق الشباك. هذه هي التفاصيل الدقيقة التي تصنع الفارق في مباريات ${l} القوية.`);

            // 6. History and Head-to-Head
            paragraphs.push(`تاريخ المواجهات المباشرة بين ${h} و ${a} هو كتاب مفتوح مليء بالحكايات والأساطير الكروية. لطالما شهدت مبارياتهما السابقة غزارة تهديفية، بطاقات ملونة، واندفاعاً بدنياً يعكس حجم المنافسة الشرسة بينهما. هذه الديربيات والكلاسيكيات الخاصة تُلعب على جزئيات صغيرة، والتركيز الذهني طوال فترة المباراة هو المفتاح الوحيد لتجنب الأخطاء القاتلة. الإعلام الرياضي سُلّطت أضواؤه بالكامل على هذه القمة، والمحللون أفردوا ساعات طويلة لتشريح التشكيلات المتوقعة ونقاط القوة والضعف، مما يزيد من حجم الضغوطات الملقاة على عاتق أطقم الفريقين لتقديم أداء يرضي طموحات المشجعين ويليق بعراقة ${l}.`);

            // 7. Streaming Experience and Site Features (SEO heavy)
            paragraphs.push(`لماذا تعتبر منصة "ستريم لايف" الخيار الأول والأمثل لمتابعة مباريات كرة القدم؟ نحن هنا نعي تماماً المشاكل التي تواجه المشاهد العربي من تقطيع مستمر ومزعج للإعلانات المنبثقة، لذلك حرصنا على توفير بيئة مشاهدة استثنائية ومجانية تماماً. نقدم لكم اليوم بث مباشر عالي الجودة لمباراة ${h} ضد ${a}، بفضل سيرفراتنا القوية والمتعددة التي تضمن استقرار البث مهما بلغ عدد المشاهدين في وقت واحد. البث الخاص بنا يتكيف تلقائياً مع سرعة الإنترنت لديكم، حيث تتوفر جودات تبدأ من 144p لأصحاب الباقات والإنترنت الضعيف، وصولاً إلى جودات 720p HD و 1080p FHD و 4K لأصحاب الشاشات الكبيرة والإنترنت فائق السرعة. ستستمتعون بتعليق عربي حماسي ومتميز ينقل لكم نبض المدرجات، لتشعروا وكأنكم متواجدون فعلياً في قلب الحدث.`);

            // 8. Ongoing coverage details
            paragraphs.push(`تغطيتنا لهذه المباراة الكبيرة في ${l} لا تقتصر فقط على الدقائق التسعين للمباراة. يمكنكم هنا عبر موقع "ستريم لايف" متابعة التشكيلات الرسمية للفريقين فور الإعلان عنها، بالإضافة إلى إحصائيات حية ودقيقة أثناء اللقاء مثل نسبة الاستحواذ، عدد التسديدات، التمريرات، والركنيات. كما سيوفر لكم الموقع تغطية كاملة ومتجددة لأهم أحداث المباراة من أهداف، إنذارات، وتبديلات. وإذا فاتكم البث المباشر، لا تقلقوا، فنحن نوفر لكم ملخصات شاملة وأهداف المباراة فور انتهاء صافرة الحكم، لضمان بقائكم على إطلاع دائم بكل مجريات كرة القدم المحلية والعالمية.`);

            // 9. SEO Keyword Stuffing paragraph naturally blended
            paragraphs.push(`للباحثين عن الروابط السريعة والمضمونة عبر محركات البحث، أنتم في المكان الصحيح. هنا نوفر لكم بث مباشر مباراة ${h}، يلا شوت مباريات اليوم، كورة لايف مشاهدة مباراة ${h} و ${a}، شاهد برابط مباشر وبدون إعلانات مزعجة أحداث لقاء ${a} ضمن منافسات ${l}. نغطي لكم كافة البطولات الأوروبية والعربية والمحلية، لتتمكنوا من متابعة دربيات العالم والكلاسيكو بكل أريحية. فريق عمل ستريم لايف يعمل على مدار الساعة لضمان وصول الخدمة بأفضل شكل ممكن، ويتم تحديث سيرفرات المشاهدة بشكل مستمر قبل وأثناء المباراة لضمان عدم توقف البث أبداً.`);
            
            // 10. Conclusion and Call to Action
            paragraphs.push(`في الختام، عشاق الساحرة المستديرة، نحن على موعد مع سهرة كروية دسمة لا ينبغي تفويتها بأي حال من الأحوال. جهزوا أنفسكم، اجمعوا أصدقاءكم، واستعدوا لجرعة مكثفة من الأدرينالين والإثارة مع أبطال ${h} وصناديد ${a}. شاركوا رابط البث المباشر مع معارفكم عبر وسائل التواصل الاجتماعي لتكبر متعة المشاهدة الجماعية. ستبدأ المباراة في تمام الساعة ${document.getElementById('matchTime').value} بتوقيتكم المحلي، فكونوا على الموعد وتأكدوا من تواجدكم المبكر لضمان حجز مقعدكم الافتراضي في سيرفراتنا السريعة. نشكر لكم ثقتكم الدائمة في منصة ستريم لايف، ونتمنى للجميع مشاهدة ممتعة ومبهرة تليق بمقام بطولة ${l} المرموقة.`);

            return paragraphs.join('\n\n');
        };

        const generateKeywords = (h, a, l) => {
            return `${h}, ${a}, ${l}, بث مباشر مباراة ${h}, مشاهدة مباراة ${h} و ${a}, كورة لايف, يلا شوت، بث مباشر مباريات اليوم، ${h} ضد ${a}، اهداف مباراة ${h}، ملخص ${a}، رابط مباشر ${h}`;
        };

        const isEdit = typeof window.currentEditMatchIndex === 'number' && window.currentEditMatchIndex > -1;
        const currentMatchId = isEdit ? storedMatches[window.currentEditMatchIndex].id : Date.now();

        const newMatch = {
            id: currentMatchId,
            title,
            home: homeName,
            homeBadge: homeBadge || `https://ui-avatars.com/api/?name=${encodeURIComponent(homeName)}&background=3f5efb&color=fff`,
            away: awayName,
            awayBadge: awayBadge || `https://ui-avatars.com/api/?name=${encodeURIComponent(awayName)}&background=fc466b&color=fff`,
            time: document.getElementById('matchTime').value,
            league: leagueName,
            description: generateDetailedDescription(homeName, awayName, leagueName),
            keywords: generateKeywords(homeName, awayName, leagueName),
            iframe: document.getElementById('matchIframe').value
        };
        
        if (isEdit) {
            storedMatches[window.currentEditMatchIndex] = newMatch;
            window.currentEditMatchIndex = -1;
            const submitBtn = addMatchForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة المباراة';
            submitBtn.style.background = '';
            alert('تم تعديل المباراة بنجاح!');
        } else {
            storedMatches.push(newMatch);
            alert('تمت إضافة المباراة بنجاح مع الوصف التفصيلي والكلمات المفتاحية!');
        }

        localStorage.setItem('customMatches', JSON.stringify(storedMatches));
        
        addMatchForm.reset();
        previewHomeLogo.src = '';
        previewAwayLogo.src = '';
        loadMatchesAdmin();
    });

    window.deleteMatch = (index) => {
        if (confirm('هل أنت متأكد من حذف هذه المباراة؟')) {
            const storedMatches = JSON.parse(localStorage.getItem('customMatches')) || [];
            storedMatches.splice(index, 1);
            localStorage.setItem('customMatches', JSON.stringify(storedMatches));
            loadMatchesAdmin();
        }
    };

    window.clearAllMatches = () => {
        if (confirm('هل أنت متأكد من حذف جميع المباريات؟')) {
            localStorage.removeItem('customMatches');
            loadMatchesAdmin();
        }
    };

    // ======== FIX ALL LOGOS ========
    const btnFixLogos = document.getElementById('btnFixLogos');
    btnFixLogos.addEventListener('click', async () => {
        const storedMatches = JSON.parse(localStorage.getItem('customMatches')) || [];
        if (storedMatches.length === 0) {
            alert('لا توجد مباريات لإصلاح شعاراتها.');
            return;
        }

        btnFixLogos.disabled = true;
        btnFixLogos.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإصلاح...';

        for (let i = 0; i < storedMatches.length; i++) {
            const m = storedMatches[i];
            btnFixLogos.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i+1}/${storedMatches.length} جاري...`;

            const [homeBadge, awayBadge] = await Promise.all([
                window.getTeamLogo(m.home),
                window.getTeamLogo(m.away)
            ]);
            const leagueBadge = window.getLeagueLogo(m.league);

            storedMatches[i].homeBadge = homeBadge;
            storedMatches[i].awayBadge = awayBadge;
            storedMatches[i].leagueBadge = leagueBadge;
        }

        localStorage.setItem('customMatches', JSON.stringify(storedMatches));
        loadMatchesAdmin();

        btnFixLogos.disabled = false;
        btnFixLogos.innerHTML = '<i class="fas fa-check"></i> تم الإصلاح!';
        setTimeout(() => {
            btnFixLogos.innerHTML = '<i class="fas fa-sync"></i> إصلاح الشعارات';
        }, 3000);

        alert(`تم إصلاح شعارات ${storedMatches.length} مباراة بنجاح! أعد تحميل الصفحة الرئيسية لرؤية التغييرات.`);
    });

    window.logout = () => {
        localStorage.removeItem('adminAuth');
        window.location.href = 'admin.html';
    };

    loadChannels();
    loadMatchesAdmin();
});
