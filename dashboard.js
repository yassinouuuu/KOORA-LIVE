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
        window.DB.get('channels', function(storedChannels) {
            adminChannelsList.innerHTML = '';
            storedChannels.forEach((channel, index) => {
                const item = document.createElement('div');
                item.className = 'channel-list-item';
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
        
        // Anti-duplicate protection for Firebase double callback
        if (addChannelForm.dataset.submitting === 'true') return;
        addChannelForm.dataset.submitting = 'true';

        window.DB.get('channels', function(storedChannels) {
            if (addChannelForm.dataset.submitting !== 'true') return;
            addChannelForm.dataset.submitting = 'false';

            const newChannel = {
                id: Date.now(),
                name: nameInput.value.trim(),
                iframe: iframeInput.value.trim()
            };
            storedChannels.push(newChannel);
            window.DB.save('channels', storedChannels);
            
            nameInput.value = '';
            iframeInput.value = '';
            previewBox.style.display = 'none';
            previewWrapper.innerHTML = '';
            loadChannels();
            alert('تمت إضافة القناة بنجاح!');
        });
    });

    window.deleteChannel = (index) => {
        if (confirm('هل أنت متأكد من حذف هذه القناة؟')) {
            window.DB.get('channels', function(storedChannels) {
                storedChannels.splice(index, 1);
                window.DB.save('channels', storedChannels);
                loadChannels();
                if (typeof populateChannelSelects === 'function') populateChannelSelects();
            });
        }
    };

    // --- Matches Management ---
    const addMatchForm = document.getElementById('addMatchForm');
    const adminMatchesList = document.getElementById('adminMatchesList');
    const previewHomeLogo = document.getElementById('previewHomeLogo');
    const previewAwayLogo = document.getElementById('previewAwayLogo');

    function loadMatchesAdmin() {
        window.DB.get('customMatches', function(storedMatches) {
            adminMatchesList.innerHTML = '';
            storedMatches.forEach((match, index) => {
                const item = document.createElement('div');
                item.className = 'channel-list-item';
                const apiBadge = match.isAutoImported
                    ? '<span style="padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;background:rgba(0,236,188,0.15);color:#00ecbc;margin-right:6px;"><i class="fas fa-cloud-download-alt"></i> API</span>'
                    : '<span style="padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;background:rgba(63,94,251,0.15);color:#3f5efb;margin-right:6px;"><i class="fas fa-hand-paper"></i> يدوي</span>';
                const channelBadge = match.channelName
                    ? '<span style="font-size:0.7rem;color:var(--text-dim);background:rgba(255,255,255,0.05);padding:2px 6px;border-radius:3px;"><i class="fas fa-tv"></i> ' + match.channelName + '</span>'
                    : '';
                item.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;flex:1;">
                        <img src="${match.homeBadge}" style="width:28px;height:28px;object-fit:contain;border-radius:4px;" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(match.home)}&background=3f5efb&color=fff'">
                        ${apiBadge}
                        <span>${match.title} (${match.league})</span>
                        ${channelBadge}
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-primary" style="padding:5px 15px; margin:0;" onclick="editMatch(${index})"><i class="fas fa-edit"></i> تعديل</button>
                        <button class="btn-delete" onclick="deleteMatch(${index})"><i class="fas fa-trash"></i> حذف</button>
                    </div>
                `;
                adminMatchesList.appendChild(item);
            });
        });
    }
    // Make globally accessible for KSportsAPI integration
    window.loadMatchesAdmin = loadMatchesAdmin;

    // --- Channel Auto-Select Logic ---
    const matchChannelSelect = document.getElementById('matchChannelSelect');
    
    function populateChannelSelects() {
        if (!matchChannelSelect) return;
        window.DB.get('channels', function(channels) {
            matchChannelSelect.innerHTML = '<option value="">-- اختر من قنواتك (اختياري) --</option>';
            if (channels) {
                channels.forEach(ch => {
                    const opt = document.createElement('option');
                    opt.value = ch.name;
                    opt.textContent = ch.name;
                    opt.dataset.iframe = ch.iframe;
                    matchChannelSelect.appendChild(opt);
                });
            }
        });
    }
    
    // Call when page loads and when channels change
    populateChannelSelects();
    
    // Auto-fill iframe when channel is chosen
    if (matchChannelSelect) {
        matchChannelSelect.addEventListener('change', function() {
            const selectedOpt = matchChannelSelect.options[matchChannelSelect.selectedIndex];
            if (selectedOpt && selectedOpt.dataset.iframe) {
                document.getElementById('matchIframe').value = selectedOpt.dataset.iframe;
            }
        });
    }

    window.currentEditMatchIndex = -1;

    window.editMatch = (index) => {
        window.DB.get('customMatches', function(storedMatches) {
            const m = storedMatches[index];
            if(!m) return;
            document.getElementById('matchHome').value = m.home || '';
            document.getElementById('matchHomeBadge').value = (m.homeBadge && m.homeBadge.includes('ui-avatars')) ? '' : (m.homeBadge || '');
            document.getElementById('matchAway').value = m.away || '';
            document.getElementById('matchAwayBadge').value = (m.awayBadge && m.awayBadge.includes('ui-avatars')) ? '' : (m.awayBadge || '');
            document.getElementById('matchLeague').value = m.league || '';
            document.getElementById('matchTime').value = m.time || '';
            document.getElementById('matchIframe').value = m.iframe || '';
            
            // Set channel dropdown if exists
            if (matchChannelSelect) {
                matchChannelSelect.value = m.channelName || '';
            }

            previewHomeLogo.src = m.homeBadge || '';
            previewAwayLogo.src = m.awayBadge || '';
            window.currentEditMatchIndex = index;
            const submitBtn = addMatchForm.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
            submitBtn.style.background = 'linear-gradient(45deg, #00ecbc, #00c69d)';
            document.getElementById('addMatchForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    };

    document.getElementById('matchHomeBadge').addEventListener('input', function() {
        previewHomeLogo.src = this.value.trim();
    });
    document.getElementById('matchAwayBadge').addEventListener('input', function() {
        previewAwayLogo.src = this.value.trim();
    });

    const generateDetailedDescription = (h, a, l) => {
        const paragraphs = [];
        paragraphs.push(`مرحباً بكم زوارنا الكرام في تغطية حصرية ومباشرة عبر منصتكم المفضلة "ستريم لايف"، حيث نلتقي اليوم في واحدة من أهم وأبرز المواجهات الكروية التي يترقبها عشاق الساحرة المستديرة في كل مكان. تتجه أنظار الملايين من محبي كرة القدم نحو هذه القمة الكروية النارية التي تجمع بين فريق ${h} ونظيره العنيد فريق ${a}، وذلك في إطار منافسات الجولة الحاسمة من بطولة ${l}. هذه المباراة ليست مجرد تسعين دقيقة اعتيادية، بل هي ملحمة كروية يتوقع أن تشهد الكثير من الإثارة، الندية، والأهداف الرائعة نظراً للقيمة الفنية العالية التي يمتلكها كلا الفريقين.`);
        paragraphs.push(`تكتسب هذه المواجهة بين ${h} و ${a} أهمية مضاعفة نظراً للموقف الحالي لكلا الفريقين في جدول ترتيب ${l}. ففي عالم كرة القدم الحديثة، كل نقطة تمثل فارقاً جوهرياً في مسيرة التتويج بالألقاب أو تجنب شبح الهبوط أو حتى ضمان مقعد مؤهل للبطولات القارية.`);
        paragraphs.push(`نحن هنا لنقدم لكم أفضل تجربة مشاهدة ممكنة، حيث نسعى جاهدين لتوفير بث مباشر عالي السلاسة وبدون أي تقطيع، لضمان استمتاعكم بكل لحظة من لحظات هذا اللقاء التاريخي. البث الخاص بنا يتكيف تلقائياً مع سرعة الإنترنت لديكم، حيث تتوفر جودات متعددة تبدأ من القوية وصولاً إلى 4K.`);
        paragraphs.push(`لماذا تعتبر منصة "ستريم لايف" الخيار الأول؟ لأننا نوفر لكم بث مباشر مباراة ${h} ضد ${a}، يلا شوت مباريات اليوم، كورة لايف شاهد برابط مباشر وبدون إعلانات مزعجة.`);
        return paragraphs.join('\n\n');
    };

    const generateKeywords = (h, a, l) => {
        return `${h}, ${a}, ${l}, بث مباشر مباراة ${h}, مشاهدة مباراة ${h} و ${a}, كورة لايف, يلا شوت, مباريات اليوم, بث مباشر, ${h} ضد ${a}`;
    };

    addMatchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (addMatchForm.dataset.submitting === 'true') return;
        addMatchForm.dataset.submitting = 'true';

        window.DB.get('customMatches', function(storedMatches) {
            if (addMatchForm.dataset.submitting !== 'true') return;
            addMatchForm.dataset.submitting = 'false';

            const homeName   = document.getElementById('matchHome').value.trim();
            const homeBadge  = document.getElementById('matchHomeBadge').value.trim();
            const awayName   = document.getElementById('matchAway').value.trim();
            const awayBadge  = document.getElementById('matchAwayBadge').value.trim();
            const leagueName = document.getElementById('matchLeague').value.trim();
            const timeVal    = document.getElementById('matchTime').value;
            const iframeVal  = document.getElementById('matchIframe').value.trim();
            
            const title = `بث مباشر مباراة ${homeName} ضد ${awayName} - ${leagueName}`;

            const isEdit = typeof window.currentEditMatchIndex === 'number' && window.currentEditMatchIndex > -1;
            const currentMatchId = isEdit ? storedMatches[window.currentEditMatchIndex].id : Date.now();
            
            // Preserve API metadata if editing an API match
            const prevMatch = isEdit ? storedMatches[window.currentEditMatchIndex] : {};

            const newMatch = {
                id: currentMatchId,
                title,
                home: homeName,
                homeBadge: homeBadge || `https://ui-avatars.com/api/?name=${encodeURIComponent(homeName)}&background=3f5efb&color=fff`,
                away: awayName,
                awayBadge: awayBadge || `https://ui-avatars.com/api/?name=${encodeURIComponent(awayName)}&background=fc466b&color=fff`,
                time: timeVal,
                league: leagueName,
                description: generateDetailedDescription(homeName, awayName, leagueName),
                keywords: generateKeywords(homeName, awayName, leagueName),
                iframe: iframeVal,
                channelName: (matchChannelSelect && matchChannelSelect.value) ? matchChannelSelect.value : (prevMatch.channelName || ''),
                isAutoImported: prevMatch.isAutoImported || false,
                apiFixtureId: prevMatch.apiFixtureId,
                apiStatus: prevMatch.apiStatus || 'NS'
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

            window.DB.save('customMatches', storedMatches);
            addMatchForm.reset();
            previewHomeLogo.src = '';
            previewAwayLogo.src = '';
            loadMatchesAdmin();
        });
    });

    window.deleteMatch = (index) => {
        if (confirm('هل أنت متأكد من حذف هذه المباراة؟')) {
            window.DB.get('customMatches', function(storedMatches) {
                storedMatches.splice(index, 1);
                window.DB.save('customMatches', storedMatches);
                loadMatchesAdmin();
            });
        }
    };

    window.clearAllMatches = () => {
        if (confirm('هل أنت متأكد من حذف جميع المباريات؟')) {
            window.DB.remove('customMatches');
            loadMatchesAdmin();
        }
    };

    // ======== FIX ALL LOGOS ========
    const btnFixLogos = document.getElementById('btnFixLogos');
    if (btnFixLogos) {
        btnFixLogos.addEventListener('click', async () => {
            window.DB.get('customMatches', async function(storedMatches) {
                if (!storedMatches || storedMatches.length === 0) {
                    alert('لا توجد مباريات لإصلاح شعاراتها.');
                    return;
                }

                btnFixLogos.disabled = true;
                btnFixLogos.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإصلاح...';

                for (let i = 0; i < storedMatches.length; i++) {
                    const m = storedMatches[i];
                    btnFixLogos.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i+1}/${storedMatches.length} جاري...`;

                    try {
                        const [homeBadge, awayBadge] = await Promise.all([
                            window.getTeamLogo(m.home),
                            window.getTeamLogo(m.away)
                        ]);
                        const leagueBadge = window.getLeagueLogo(m.league);

                        storedMatches[i].homeBadge = homeBadge;
                        storedMatches[i].awayBadge = awayBadge;
                        storedMatches[i].leagueBadge = leagueBadge;
                    } catch (err) {
                        console.error('Error fixing logos for match:', m.title, err);
                    }
                }

                window.DB.save('customMatches', storedMatches);
                loadMatchesAdmin();

                btnFixLogos.disabled = false;
                btnFixLogos.innerHTML = '<i class="fas fa-check"></i> تم الإصلاح!';
                setTimeout(() => {
                    btnFixLogos.innerHTML = '<i class="fas fa-sync"></i> إصلاح الشعارات';
                }, 3000);

                alert(`تم إصلاح الشعارات بنجاح!`);
            });
        });
    }

    window.logout = () => {
        localStorage.removeItem('adminAuth');
        window.location.href = 'admin.html';
    };

    // Cloud database status banner
    const cloudStatusBanner = document.getElementById('cloudStatusBanner');
    window.onFirebaseError = function(err) {
        // Firebase errors are non-critical since we use JSONBlob as primary
        console.warn('[Dashboard] Firebase error (non-critical):', err);
    };

    loadChannels();
    loadMatchesAdmin();
});
