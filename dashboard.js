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

    // --- Channel Auto-Select Logic (Multi-Channel) ---
    function populateChannelSelects() {
        const selects = document.querySelectorAll('.match-channel-select');
        if (!selects.length) return;
        window.DB.get('channels', function(channels) {
            selects.forEach(select => {
                const currentVal = select.value;
                select.innerHTML = '<option value="">-- اختر قناة (اختياري) --</option>';
                if (channels) {
                    channels.forEach(ch => {
                        const opt = document.createElement('option');
                        opt.value = ch.name;
                        opt.textContent = ch.name;
                        opt.dataset.iframe = ch.iframe;
                        select.appendChild(opt);
                    });
                }
                select.value = select.dataset.pendingValue || currentVal; // Restore previous or pending selection
            });
        });
    }
    
    // Call when page loads and when channels change
    populateChannelSelects();

    // Event delegation for dynamic channel rows
    document.getElementById('matchChannelsContainer').addEventListener('change', function(e) {
        if (e.target.classList.contains('match-channel-select')) {
            const selectedOpt = e.target.options[e.target.selectedIndex];
            if (selectedOpt && selectedOpt.dataset.iframe) {
                const row = e.target.closest('.channel-row');
                const iframeInput = row.querySelector('.match-iframe-input');
                if (iframeInput) {
                    iframeInput.value = selectedOpt.dataset.iframe;
                }
            }
        }
    });

    document.getElementById('matchChannelsContainer').addEventListener('click', function(e) {
        if (e.target.closest('.btn-remove-channel')) {
            const row = e.target.closest('.channel-row');
            if (document.querySelectorAll('.channel-row').length > 1) {
                row.remove();
            } else {
                alert('يجب أن تحتوي المباراة على سيرفر واحد على الأقل.');
            }
        }
    });

    const btnAddChannelRow = document.getElementById('btnAddChannelRow');
    if (btnAddChannelRow) {
        btnAddChannelRow.addEventListener('click', function() {
            const container = document.getElementById('matchChannelsContainer');
            const rowCount = container.querySelectorAll('.channel-row').length + 1;
            const newRow = document.createElement('div');
            newRow.className = 'channel-row';
            newRow.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: start; background: rgba(255,255,255,0.02); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-top:10px;';
            newRow.innerHTML = `
                <div>
                    <label style="font-size: 0.8rem; margin-bottom: 5px;">اختر القناة (${rowCount})</label>
                    <select class="match-channel-select" style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: white;">
                        <option value="">-- اختر قناة (اختياري) --</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 0.8rem; margin-bottom: 5px;">كود الـ IFRAME / الرابط</label>
                    <textarea class="match-iframe-input" placeholder="ألصق الكود هنا" style="height:42px; min-height:42px;" required></textarea>
                </div>
                <div style="padding-top: 25px;">
                    <button type="button" class="btn-delete btn-remove-channel" style="padding: 10px; margin: 0;" title="حذف القناة"><i class="fas fa-trash"></i></button>
                </div>
            `;
            container.appendChild(newRow);
            populateChannelSelects();
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
            
            // Clear existing channel rows except the first one
            const container = document.getElementById('matchChannelsContainer');
            const rows = container.querySelectorAll('.channel-row');
            for (let i = 1; i < rows.length; i++) {
                rows[i].remove();
            }

            // Populate channels
            let channels = m.channels || [];
            if (channels.length === 0 && (m.iframe || m.channelName)) {
                // Backwards compatibility
                channels = [{ name: m.channelName || '', iframe: m.iframe || '' }];
            }

            if (channels.length > 0) {
                // First row
                const firstRow = container.querySelector('.channel-row');
                firstRow.querySelector('.match-channel-select').value = channels[0].name || '';
                firstRow.querySelector('.match-iframe-input').value = channels[0].iframe || '';

                // Additional rows
                for (let i = 1; i < channels.length; i++) {
                    const ch = channels[i];
                    const btnAdd = document.getElementById('btnAddChannelRow');
                    if (btnAdd) btnAdd.click();
                    // Since click is synchronous and creates a new row:
                    const newRows = container.querySelectorAll('.channel-row');
                    const newRow = newRows[newRows.length - 1];
                    // Wait for populateChannelSelects to finish? It is sync since options are stored locally if already populated, 
                    // but since populateChannelSelects does a DB get, we need a slight delay or rely on the sync population if options already exist.
                    // Actually, options might be added asynchronously. Let's set value immediately, and also set a data attribute for delayed setting.
                    const select = newRow.querySelector('.match-channel-select');
                    select.value = ch.name || '';
                    select.dataset.pendingValue = ch.name || '';
                    newRow.querySelector('.match-iframe-input').value = ch.iframe || '';
                }
            } else {
                const firstRow = container.querySelector('.channel-row');
                firstRow.querySelector('.match-channel-select').value = '';
                firstRow.querySelector('.match-iframe-input').value = '';
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
            
            // Collect all channels
            const channelRows = document.querySelectorAll('#matchChannelsContainer .channel-row');
            const matchChannels = [];
            channelRows.forEach(row => {
                const cName = row.querySelector('.match-channel-select').value.trim();
                const cIframe = row.querySelector('.match-iframe-input').value.trim();
                if (cIframe) {
                    matchChannels.push({ name: cName, iframe: cIframe });
                }
            });

            const primaryIframe = matchChannels.length > 0 ? matchChannels[0].iframe : '';
            const primaryChannelName = matchChannels.length > 0 ? matchChannels[0].name : '';

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
                iframe: primaryIframe, // For backwards compatibility
                channelName: primaryChannelName, // For backwards compatibility
                channels: matchChannels, // Array of channels
                isAutoImported: prevMatch.isAutoImported || false,
                apiFixtureId: prevMatch.apiFixtureId,
                apiStatus: prevMatch.apiStatus || 'NS',
                liveHomeScore: prevMatch.liveHomeScore,
                liveAwayScore: prevMatch.liveAwayScore,
                liveStatus: prevMatch.liveStatus,
                liveMinute: prevMatch.liveMinute
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
