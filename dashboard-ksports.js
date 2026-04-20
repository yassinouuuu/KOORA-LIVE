// =====================================================
//   Dashboard KSportsAPI Integration UI Logic
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    // ---- Elements ----
    var apiKeyInput = document.getElementById('apiKeyInput');
    var btnSaveApiKey = document.getElementById('btnSaveApiKey');
    var btnPreviewAPI = document.getElementById('btnPreviewAPI');
    var btnAutoImport = document.getElementById('btnAutoImport');
    var btnClearAutoImported = document.getElementById('btnClearAutoImported');
    var apiPreviewContainer = document.getElementById('apiPreviewContainer');
    var apiPreviewList = document.getElementById('apiPreviewList');
    var channelMappingInfo = document.getElementById('channelMappingInfo');

    // Stats elements
    var statAutoCount = document.getElementById('statAutoCount');
    var statManualCount = document.getElementById('statManualCount');
    var statChannelCount = document.getElementById('statChannelCount');

    // ---- Load saved API key ----
    if (window.KSportsAPI) {
        window.KSportsAPI.loadConfig(function(config) {
            if (config && config.apiKey) {
                apiKeyInput.value = config.apiKey;
            }
        });

        // Update stats
        updateImportStats();
        
        // Show channel-league mapping
        showChannelMapping();
    }

    // ---- Save API Key ----
    if (btnSaveApiKey) {
        btnSaveApiKey.addEventListener('click', function() {
            var key = apiKeyInput.value.trim();
            if (!key) {
                showNotification('يرجى إدخال مفتاح الـ API أولاً', 'error');
                return;
            }

            window.KSportsAPI.saveConfig({ apiKey: key });
            showNotification('تم حفظ مفتاح الـ API بنجاح! ✅', 'success');
        });
    }

    // ---- Preview Matches ----
    if (btnPreviewAPI) {
        btnPreviewAPI.addEventListener('click', function() {
            btnPreviewAPI.disabled = true;
            btnPreviewAPI.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري السحب...';

            window.KSportsAPI.previewMatches(function(result) {
                btnPreviewAPI.disabled = false;
                btnPreviewAPI.innerHTML = '<i class="fas fa-eye"></i> معاينة المباريات';

                if (!result.success) {
                    showNotification('خطأ: ' + result.error, 'error');
                    return;
                }

                apiPreviewContainer.style.display = 'block';

                if (result.matches.length === 0) {
                    apiPreviewList.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-dim);"><i class="fas fa-moon" style="font-size:2rem; display:block; margin-bottom:10px;"></i>لا توجد مباريات اليوم للقنوات المتاحة</div>';
                    return;
                }

                var html = '<div style="padding:10px; margin-bottom:10px; background:rgba(0,236,188,0.08); border-radius:8px; text-align:center; font-size:0.85rem; color:#00ecbc;">' +
                    '<i class="fas fa-chart-bar"></i> ' +
                    'إجمالي من API: <strong>' + result.totalFromAPI + '</strong> | ' +
                    'متوافقة مع القنوات: <strong>' + result.filteredCount + '</strong> | ' +
                    'الدوريات: <strong>' + result.leagues.length + '</strong>' +
                    '</div>';

                // Group by league
                var leagueGroups = {};
                result.matches.forEach(function(m) {
                    var league = m.league || 'أخرى';
                    if (!leagueGroups[league]) leagueGroups[league] = [];
                    leagueGroups[league].push(m);
                });

                Object.keys(leagueGroups).forEach(function(league) {
                    html += '<div style="margin-top:15px;">';
                    html += '<div style="font-weight:800; color:#fc466b; padding:8px 12px; background:rgba(252,70,107,0.08); border-radius:6px; margin-bottom:8px; display:flex; align-items:center; gap:8px;">';
                    html += '<i class="fas fa-trophy"></i> ' + league + ' <span style="font-size:0.75rem; color:var(--text-dim);">(' + leagueGroups[league].length + ' مباراة)</span>';
                    html += '</div>';

                    leagueGroups[league].forEach(function(m) {
                        var statusBadge = getStatusBadge(m.apiStatus);
                        html += '<div class="channel-list-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px; border-bottom:1px solid rgba(255,255,255,0.03); gap:10px;">';
                        
                        // Teams
                        html += '<div style="display:flex; align-items:center; gap:10px; flex:1;">';
                        html += '<img src="' + m.homeBadge + '" style="width:26px; height:26px; object-fit:contain; border-radius:4px;" onerror="this.style.display=\'none\'">';
                        html += '<span style="font-weight:700; font-size:0.9rem;">' + m.home + '</span>';
                        html += '<span style="color:var(--text-dim); font-size:0.8rem;">vs</span>';
                        html += '<span style="font-weight:700; font-size:0.9rem;">' + m.away + '</span>';
                        html += '<img src="' + m.awayBadge + '" style="width:26px; height:26px; object-fit:contain; border-radius:4px;" onerror="this.style.display=\'none\'">';
                        html += '</div>';

                        // Time & Channel
                        html += '<div style="display:flex; align-items:center; gap:12px;">';
                        html += statusBadge;
                        html += '<span style="color:#00ecbc; font-weight:700; font-size:0.85rem;"><i class="fas fa-clock"></i> ' + m.time + '</span>';
                        html += '<span style="color:var(--text-dim); font-size:0.75rem; background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:4px;"><i class="fas fa-tv"></i> ' + m.channelName + '</span>';
                        html += '</div>';

                        html += '</div>';
                    });

                    html += '</div>';
                });

                apiPreviewList.innerHTML = html;

                // Scroll into view
                apiPreviewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // ---- Auto Import ----
    if (btnAutoImport) {
        btnAutoImport.addEventListener('click', function() {
            if (!confirm('سيتم سحب مباريات اليوم وإضافتها تلقائياً حسب القنوات المتوفرة. متابعة؟')) return;

            btnAutoImport.disabled = true;
            btnAutoImport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الاستيراد...';

            window.KSportsAPI.autoImportMatches(function(result) {
                btnAutoImport.disabled = false;
                btnAutoImport.innerHTML = '<i class="fas fa-cloud-download-alt"></i> سحب وإضافة المباريات';

                if (!result.success) {
                    showNotification('خطأ: ' + result.error, 'error');
                    return;
                }

                if (result.imported === 0) {
                    showNotification('لا توجد مباريات جديدة للاستيراد (قد تكون مستوردة مسبقاً)', 'info');
                } else {
                    showNotification(
                        'تم استيراد ' + result.imported + ' مباراة بنجاح! ⚽\n' +
                        'إجمالي المتاحة: ' + result.total + ' | القنوات: ' + result.channels,
                        'success'
                    );
                }

                updateImportStats();
                
                // Refresh matches list if available
                if (typeof loadMatchesAdmin === 'function') {
                    loadMatchesAdmin();
                } else if (window.loadMatchesAdmin) {
                    window.loadMatchesAdmin();
                }
            });
        });
    }

    // ---- Clear Auto Imported ----
    if (btnClearAutoImported) {
        btnClearAutoImported.addEventListener('click', function() {
            if (!confirm('سيتم حذف جميع المباريات المستوردة تلقائياً فقط. المباريات المضافة يدوياً ستبقى. متابعة؟')) return;

            window.KSportsAPI.clearAutoImported(function(count) {
                showNotification('تم حذف ' + count + ' مباراة مستوردة', 'success');
                updateImportStats();
                
                if (typeof loadMatchesAdmin === 'function') {
                    loadMatchesAdmin();
                } else if (window.loadMatchesAdmin) {
                    window.loadMatchesAdmin();
                }
            });
        });
    }

    // ---- Update Import Stats ----
    function updateImportStats() {
        if (!window.KSportsAPI) return;
        
        window.KSportsAPI.getImportStatus(function(stats) {
            if (statAutoCount) statAutoCount.textContent = stats.auto;
            if (statManualCount) statManualCount.textContent = stats.manual;
        });

        window.DB.get('channels', function(channels) {
            if (statChannelCount) statChannelCount.textContent = channels ? channels.length : 0;
        });
    }

    // ---- Show Channel-League Mapping ----
    function showChannelMapping() {
        if (!channelMappingInfo || !window.KSportsAPI) return;

        window.DB.get('channels', function(channels) {
            if (!channels || channels.length === 0) {
                channelMappingInfo.innerHTML = '<span style="color:#ffbb33;"><i class="fas fa-exclamation-triangle"></i> لا توجد قنوات مضافة. أضف قنوات أولاً ليتم ربطها بالدوريات المناسبة.</span>';
                return;
            }

            var html = '';
            channels.forEach(function(ch) {
                var normalized = ch.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, ' ').trim();
                var mappedLeagues = [];

                Object.keys(window.KSportsAPI.CHANNEL_LEAGUE_MAP).forEach(function(mapKey) {
                    if (mapKey === '_default') return;
                    var mapNorm = mapKey.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, '').replace(/\s+/g, ' ').trim();
                    
                    if (normalized.includes(mapNorm) || mapNorm.includes(normalized) ||
                        normalized.replace(/\s/g, '').includes(mapNorm.replace(/\s/g, ''))) {
                        window.KSportsAPI.CHANNEL_LEAGUE_MAP[mapKey].leagues.forEach(function(id) {
                            var name = window.KSportsAPI.LEAGUE_NAMES[id];
                            if (name && mappedLeagues.indexOf(name) === -1) {
                                mappedLeagues.push(name);
                            }
                        });
                    }
                });

                if (mappedLeagues.length === 0) {
                    // Add default leagues
                    window.KSportsAPI.CHANNEL_LEAGUE_MAP['_default'].leagues.forEach(function(id) {
                        var name = window.KSportsAPI.LEAGUE_NAMES[id];
                        if (name && mappedLeagues.indexOf(name) === -1) {
                            mappedLeagues.push(name);
                        }
                    });
                }

                html += '<div style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03);">';
                html += '<span style="color:#00ecbc; font-weight:700;"><i class="fas fa-tv"></i> ' + ch.name + '</span>';
                html += ' ← ';
                html += '<span style="color:var(--text-dim);">' + mappedLeagues.join('، ') + '</span>';
                html += '</div>';
            });

            channelMappingInfo.innerHTML = html;
        });
    }

    // ---- Status Badge Helper ----
    function getStatusBadge(status) {
        var s = (status || '').toUpperCase();
        var label, color, bg;
        
        switch(s) {
            case 'NS': label = 'لم تبدأ'; color = '#a0a0a0'; bg = 'rgba(160,160,160,0.1)'; break;
            case '1H': label = '🔴 الشوط الأول'; color = '#00ec70'; bg = 'rgba(0,236,100,0.15)'; break;
            case 'HT': label = '⏸ استراحة'; color = '#ffbb33'; bg = 'rgba(255,187,51,0.15)'; break;
            case '2H': label = '🔴 الشوط الثاني'; color = '#00ec70'; bg = 'rgba(0,236,100,0.15)'; break;
            case 'FT': label = 'انتهت'; color = '#ff6060'; bg = 'rgba(255,80,80,0.15)'; break;
            case 'AET': label = 'إضافي'; color = '#ff9900'; bg = 'rgba(255,153,0,0.15)'; break;
            case 'PEN': label = 'ركلات ترجيح'; color = '#ff4500'; bg = 'rgba(255,69,0,0.15)'; break;
            case 'LIVE': label = '🔴 مباشر'; color = '#00ec70'; bg = 'rgba(0,236,100,0.15)'; break;
            default: label = 'مجدول'; color = '#a0a0a0'; bg = 'rgba(160,160,160,0.1)'; break;
        }

        return '<span style="padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:700; background:' + bg + '; color:' + color + ';">' + label + '</span>';
    }

    // ---- Notification Helper ----
    function showNotification(message, type) {
        // Remove existing notifications
        var existing = document.querySelector('.ksports-notification');
        if (existing) existing.remove();

        var colors = {
            success: { bg: 'rgba(0,236,188,0.15)', border: '#00ecbc', icon: 'check-circle' },
            error: { bg: 'rgba(255,77,77,0.15)', border: '#ff4d4d', icon: 'times-circle' },
            info: { bg: 'rgba(63,94,251,0.15)', border: '#3f5efb', icon: 'info-circle' }
        };
        var style = colors[type] || colors.info;

        var notif = document.createElement('div');
        notif.className = 'ksports-notification';
        notif.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); padding:15px 30px; background:' + style.bg + '; border:1px solid ' + style.border + '; border-radius:12px; color:#fff; font-weight:600; z-index:9999; backdrop-filter:blur(10px); animation:slideDown 0.4s ease; display:flex; align-items:center; gap:10px; max-width:90%; box-shadow:0 10px 30px rgba(0,0,0,0.3);';
        notif.innerHTML = '<i class="fas fa-' + style.icon + '" style="color:' + style.border + '; font-size:1.2rem;"></i><span>' + message.replace(/\n/g, '<br>') + '</span>';

        document.body.appendChild(notif);

        setTimeout(function() {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(-50%) translateY(-20px)';
            notif.style.transition = 'all 0.3s ease';
            setTimeout(function() { notif.remove(); }, 300);
        }, 5000);
    }
});
