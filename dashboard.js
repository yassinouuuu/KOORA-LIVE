// dashboard.js - Management logic
document.addEventListener('DOMContentLoaded', () => {
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
            item.innerHTML = `
                <span>${channel.name}</span>
                <button class="btn-delete" onclick="deleteChannel(${index})"><i class="fas fa-trash"></i> حذف</button>
            `;
            adminChannelsList.appendChild(item);
        });
    }

    btnTest.addEventListener('click', () => {
        let code = iframeInput.value.trim();
        if (!code) {
            alert('يرجى وضع كود الـ IFRAME أو رابط القناة أولاً');
            return;
        }
        
        // Smart handling of URLs vs Iframe code
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

    window.logout = () => {
        localStorage.removeItem('adminAuth');
        window.location.href = 'admin.html';
    };

    loadChannels();
});
