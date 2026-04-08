// =====================================================
//   KOORA LIVE - Firebase Cloud Database Config
// =====================================================
//
//  HOW TO SET UP (One-time, 5 minutes):
//
//  1. Go to https://console.firebase.google.com/
//  2. Click "Add project" → name it "koora-live" → Continue
//  3. Disable Google Analytics (optional) → Create project
//  4. Left menu: Build → Realtime Database → Create database
//     → Choose "Start in test mode" → Enable
//  5. Left menu: Project Settings (gear icon) → Your apps → </> (Web)
//     → Register app → Copy the firebaseConfig values below
//
// =====================================================

const firebaseConfig = {
    apiKey:            "PASTE_YOUR_API_KEY_HERE",
    authDomain:        "PASTE_YOUR_AUTH_DOMAIN_HERE",
    databaseURL:       "PASTE_YOUR_DATABASE_URL_HERE",
    projectId:         "PASTE_YOUR_PROJECT_ID_HERE",
    storageBucket:     "PASTE_YOUR_STORAGE_BUCKET_HERE",
    messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
    appId:             "PASTE_YOUR_APP_ID_HERE"
};

// ---- Initialize Firebase ----
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.database();
        window.FIREBASE_READY = true;
        console.log('[KOORA LIVE] Firebase connected ✅');
    }
} catch(e) {
    window.FIREBASE_READY = false;
    console.warn('[KOORA LIVE] Firebase not configured, using localStorage fallback.');
}

// ---- Unified Data Layer ----
// Instead of calling localStorage directly, use these functions everywhere.
// They write to BOTH Firebase (cloud) AND localStorage (offline cache).

window.DB = {

    // Save any data by key
    save: function(key, data) {
        // Always update localStorage as cache
        localStorage.setItem(key, JSON.stringify(data));

        // If Firebase is ready, sync to cloud
        if (window.FIREBASE_READY && window.db) {
            window.db.ref(key).set(data)
                .then(function() { console.log('[DB] Saved to cloud:', key); })
                .catch(function(err) { console.warn('[DB] Cloud save failed:', err); });
        }
    },

    // Get data once (from localStorage cache, then refresh from cloud)
    get: function(key, callback) {
        // Immediately return localStorage data (fast)
        var cached = JSON.parse(localStorage.getItem(key)) || [];
        callback(cached);

        // Then fetch from cloud and update if different
        if (window.FIREBASE_READY && window.db) {
            window.db.ref(key).once('value')
                .then(function(snapshot) {
                    var cloudData = snapshot.val();
                    if (cloudData !== null) {
                        var data = Array.isArray(cloudData) ? cloudData : Object.values(cloudData);
                        localStorage.setItem(key, JSON.stringify(data));
                        callback(data);
                    }
                })
                .catch(function(err) { console.warn('[DB] Cloud read failed:', err); });
        }
    },

    // Listen for real-time changes (live updates)
    listen: function(key, callback) {
        // Start with cached data immediately
        var cached = JSON.parse(localStorage.getItem(key)) || [];
        callback(cached);

        // Then subscribe to real-time Firebase updates
        if (window.FIREBASE_READY && window.db) {
            window.db.ref(key).on('value', function(snapshot) {
                var cloudData = snapshot.val();
                if (cloudData !== null) {
                    var data = Array.isArray(cloudData) ? cloudData : Object.values(cloudData);
                    localStorage.setItem(key, JSON.stringify(data));
                    callback(data);
                } else {
                    callback([]);
                }
            });
        }
    },

    // Remove a key completely
    remove: function(key) {
        localStorage.removeItem(key);
        if (window.FIREBASE_READY && window.db) {
            window.db.ref(key).remove();
        }
    }
};
