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
  apiKey: "AIzaSyBoCT3hUgvjaYqqsZU0Kc_a3qa932MHq-U",
  authDomain: "kooralive-bc7f9.firebaseapp.com",
  databaseURL: "https://kooralive-bc7f9-default-rtdb.firebaseio.com",
  projectId: "kooralive-bc7f9",
  storageBucket: "kooralive-bc7f9.firebasestorage.app",
  messagingSenderId: "761757816089",
  appId: "1:761757816089:web:19683362a0948917d82188"
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
        var cached = JSON.parse(localStorage.getItem(key)) || [];
        callback(cached);

        if (window.FIREBASE_READY && window.db) {
            window.db.ref(key).once('value')
                .then(function(snapshot) {
                    var cloudData = snapshot.val();
                    if (cloudData !== null) {
                        var data = Array.isArray(cloudData) ? cloudData : Object.values(cloudData);
                        localStorage.setItem(key, JSON.stringify(data));
                        callback(data);
                    }
                });
        }
    },

    // Listen for real-time changes (live updates)
    listen: function(key, callback) {
        var localData = JSON.parse(localStorage.getItem(key)) || [];
        
        // Initial fast render from cache
        callback(localData);

        if (window.FIREBASE_READY && window.db) {
            // First time sync check: if local has data but cloud is empty, migrate to cloud
            window.db.ref(key).once('value').then(function(snapshot) {
                if (snapshot.val() === null && localData.length > 0) {
                    console.log('[DB] Migrating local data to cloud for:', key);
                    window.db.ref(key).set(localData);
                }
            });

            // Listen for regular updates
            window.db.ref(key).on('value', function(snapshot) {
                var cloudData = snapshot.val();
                if (cloudData !== null) {
                    var data = Array.isArray(cloudData) ? cloudData : Object.values(cloudData);
                    localStorage.setItem(key, JSON.stringify(data));
                    callback(data);
                } else {
                    // Only return empty if local is also empty (or after migration finishes)
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
