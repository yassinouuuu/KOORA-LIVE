// main.js - Logic for channels page
document.addEventListener('DOMContentLoaded', function () {

    var channelsGrid = document.getElementById('channelsGrid');
    var playerSection = document.getElementById('playerSection');
    var videoWrapper = document.getElementById('videoWrapper');
    var currentlyPlaying = document.getElementById('currentlyPlaying');
    var closePlayer = document.getElementById('closePlayer');

    // Only run if we are on the channels page
    if (!channelsGrid) return;

    function getChannels() {
        try {
            var data = localStorage.getItem('channels');
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('خطأ في قراءة القنوات:', e);
        }
        return [];
    }

    function playVideo(iframeCode, channelName) {
        if (!playerSection || !videoWrapper) return;

        playerSection.style.display = 'block';
        if (currentlyPlaying) currentlyPlaying.textContent = channelName;

        var code = iframeCode.trim();

        // If it's a direct URL, wrap it in an iframe
        if (code.indexOf('<') === -1 && code.indexOf('http') === 0) {
            code = '<iframe src="' + code + '" width="100%" height="100%" allowfullscreen frameborder="0" scrolling="no" allow="autoplay; encrypted-media"></iframe>';
        } else {
            // Force the iframe to fill the container
            code = code.replace(/width="[^"]*"/gi, 'width="100%"');
            code = code.replace(/height="[^"]*"/gi, 'height="100%"');
            // Add allowfullscreen if missing
            if (code.indexOf('allowfullscreen') === -1) {
                code = code.replace('<iframe', '<iframe allowfullscreen');
            }
            if (code.indexOf('frameborder') === -1) {
                code = code.replace('<iframe', '<iframe frameborder="0"');
            }
        }

        videoWrapper.innerHTML = code;

        // Scroll to top of page so user sees the player
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function loadChannels() {
        var channels = getChannels();

        if (channels.length === 0) {
            channelsGrid.innerHTML = '<div style="text-align:center; width:100%; grid-column:1/-1; padding:60px 0;"><i class="fas fa-tv" style="font-size:4rem; color:#555; display:block; margin-bottom:20px;"></i><p style="color:#888; font-size:1.2rem;">لا توجد قنوات حالياً.<br>قم بإضافتها من لوحة التحكم.</p></div>';
            return;
        }

        channelsGrid.innerHTML = '';

        for (var i = 0; i < channels.length; i++) {
            (function (channel) {
                var card = document.createElement('div');
                card.className = 'channel-card';
                card.innerHTML = '<div class="channel-icon"><i class="fas fa-tv"></i></div><h3>' + channel.name + '</h3><button class="btn-watch">&#9654; شاهد الآن</button>';

                var btn = card.querySelector('.btn-watch');
                var iframeCode = channel.iframe;
                var name = channel.name;

                btn.onclick = function () {
                    playVideo(iframeCode, name);
                };

                channelsGrid.appendChild(card);
            })(channels[i]);
        }
    }

    if (closePlayer) {
        closePlayer.onclick = function () {
            playerSection.style.display = 'none';
            videoWrapper.innerHTML = '';
        };
    }

    loadChannels();
});
