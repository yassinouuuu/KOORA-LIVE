// =====================================================
//   KOORA LIVE - Cloud Database Configuration
// =====================================================
//
//   Uses jsonblob.com as FREE cloud JSON storage.
//   - No signup needed
//   - No API key needed  
//   - Public read/write via simple REST API
//   - Data persists indefinitely
//
//   The Blob ID below stores all match & channel data.
//   Anyone with this ID can read the data (which is what we want!)
//
// =====================================================

// ---- JSONBlob Configuration ----
var JSONBLOB_ID = '019e55ce-5d96-74fa-9e94-28e1788f4d4f';
var JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob/' + JSONBLOB_ID;

// ---- Initialize Firebase (keep as optional backup) ----
const firebaseConfig = {
    apiKey: "AIzaSyBoCT3hUgvjaYqqsZU0Kc_a3qa932MHq-U",
    authDomain: "kooralive-bc7f9.firebaseapp.com",
    databaseURL: "https://kooralive-bc7f9-default-rtdb.firebaseio.com",
    projectId: "kooralive-bc7f9",
    storageBucket: "kooralive-bc7f9.firebasestorage.app",
    messagingSenderId: "761757816089",
    appId: "1:761757816089:web:19683362a0948917d82188"
};

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.database();
        window.FIREBASE_READY = true;
        console.log('[KOORA LIVE] Firebase connected ✅');
    }
} catch(e) {
    window.FIREBASE_READY = false;
}

// ---- JSONBlob Cloud Engine ----
var CloudDB = {
    _cache: null,
    _cacheTime: 0,
    _cacheDuration: 3000, // Cache for 3 seconds

    // Read all data from cloud (PUBLIC - no auth needed)
    readAll: function(callback) {
        var now = Date.now();
        // Return cache if fresh
        if (CloudDB._cache && (now - CloudDB._cacheTime) < CloudDB._cacheDuration) {
            if (callback) callback(CloudDB._cache);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', JSONBLOB_API, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 8000;
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        CloudDB._cache = data;
                        CloudDB._cacheTime = Date.now();
                        console.log('[CloudDB] Read success ✅');
                        if (callback) callback(data);
                    } catch (e) {
                        console.error('[CloudDB] Parse error:', e);
                        if (callback) callback(null);
                    }
                } else {
                    console.warn('[CloudDB] Read failed, status:', xhr.status);
                    if (callback) callback(null);
                }
            }
        };
        xhr.ontimeout = function() {
            console.warn('[CloudDB] Read timeout');
            if (callback) callback(null);
        };
        xhr.onerror = function() {
            console.warn('[CloudDB] Read network error');
            if (callback) callback(null);
        };
        xhr.send();
    },

    // Write all data to cloud (PUBLIC - no auth needed)
    writeAll: function(data, callback) {
        var body = JSON.stringify(data);
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', JSONBLOB_API, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.timeout = 10000;
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // Update cache
                    CloudDB._cache = data;
                    CloudDB._cacheTime = Date.now();
                    console.log('[CloudDB] Saved to cloud ✅');
                    if (callback) callback(true);
                } else {
                    console.error('[CloudDB] Write failed, status:', xhr.status);
                    if (callback) callback(false);
                }
            }
        };
        xhr.ontimeout = function() {
            console.warn('[CloudDB] Write timeout');
            if (callback) callback(false);
        };
        xhr.onerror = function() {
            console.warn('[CloudDB] Write network error');
            if (callback) callback(false);
        };
        xhr.send(body);
    },

    // Read a specific key
    read: function(key, callback) {
        CloudDB.readAll(function(data) {
            if (data && data[key] !== undefined) {
                callback(data[key]);
            } else {
                callback(null);
            }
        });
    },

    // Write a specific key (read-modify-write)
    write: function(key, value, callback) {
        CloudDB.readAll(function(data) {
            if (!data) data = {};
            data[key] = value;
            CloudDB.writeAll(data, callback);
        });
    }
};

// ---- Unified Data Layer ----
// Priority: localStorage (instant) → JSONBlob cloud (shared) → Firebase (backup)

window.DB = {

    handleError: function(err) {
        if (err && (err.code === 'PERMISSION_DENIED' || (err.message && err.message.includes('PERMISSION_DENIED')))) {
            window.FIREBASE_PERMISSION_DENIED = true;
            if (typeof window.onFirebaseError === 'function') {
                window.onFirebaseError(err);
            }
        }
    },

    // Save any data by key
    save: function(key, data) {
        // 1. Always save to localStorage (instant)
        localStorage.setItem(key, JSON.stringify(data));

        // 2. Save to JSONBlob cloud (shared across all visitors)
        CloudDB.write(key, data, function(success) {
            if (success) {
                console.log('[DB] ☁️ Saved to cloud:', key);
            } else {
                console.warn('[DB] Cloud save failed, data is in localStorage only');
            }
        });

        // 3. Try Firebase as backup (may fail with PERMISSION_DENIED)
        if (window.FIREBASE_READY && window.db && !window.FIREBASE_PERMISSION_DENIED) {
            window.db.ref(key).set(data)
                .catch(function(err) { window.DB.handleError(err); });
        }
    },

    // Get data once
    get: function(key, callback) {
        // 1. Instant: return from localStorage
        var cached = JSON.parse(localStorage.getItem(key)) || [];
        callback(cached);

        // 2. Get from cloud (fresher data shared by admin)
        CloudDB.read(key, function(cloudData) {
            if (cloudData !== null && cloudData !== undefined) {
                var data = Array.isArray(cloudData) ? cloudData :
                           (typeof cloudData === 'object' ? Object.values(cloudData) : []);
                // Update localStorage cache
                localStorage.setItem(key, JSON.stringify(data));
                callback(data);
            }
        });
    },

    // Listen for changes (with polling for cloud updates)
    listen: function(key, callback) {
        // 1. Instant: return from localStorage
        var localData = JSON.parse(localStorage.getItem(key)) || [];
        callback(localData);

        // 2. Fetch from cloud immediately
        CloudDB.read(key, function(cloudData) {
            if (cloudData !== null && cloudData !== undefined) {
                var data = Array.isArray(cloudData) ? cloudData :
                           (typeof cloudData === 'object' ? Object.values(cloudData) : []);
                if (data.length > 0 || localData.length === 0) {
                    localStorage.setItem(key, JSON.stringify(data));
                    callback(data);
                }
            }
        });

        // 3. Poll cloud every 30 seconds for live updates
        setInterval(function() {
            CloudDB._cache = null; // Force refresh
            CloudDB.read(key, function(freshData) {
                if (freshData !== null && freshData !== undefined) {
                    var data = Array.isArray(freshData) ? freshData :
                               (typeof freshData === 'object' ? Object.values(freshData) : []);
                    var currentLocal = JSON.parse(localStorage.getItem(key)) || [];
                    // Only update callback if data actually changed
                    if (JSON.stringify(data) !== JSON.stringify(currentLocal)) {
                        localStorage.setItem(key, JSON.stringify(data));
                        callback(data);
                    }
                }
            });
        }, 30000);

        // 4. Also use Firebase real-time listener if available
        if (window.FIREBASE_READY && window.db && !window.FIREBASE_PERMISSION_DENIED) {
            window.db.ref(key).on('value', function(snapshot) {
                var cloudData = snapshot.val();
                if (cloudData !== null) {
                    var data = Array.isArray(cloudData) ? cloudData : Object.values(cloudData);
                    localStorage.setItem(key, JSON.stringify(data));
                    callback(data);
                }
            }, function(err) {
                window.DB.handleError(err);
            });
        }
    },

    // Remove a key
    remove: function(key) {
        localStorage.removeItem(key);

        // Remove from cloud
        CloudDB.readAll(function(data) {
            if (data) {
                delete data[key];
                CloudDB.writeAll(data);
            }
        });

        // Try Firebase
        if (window.FIREBASE_READY && window.db && !window.FIREBASE_PERMISSION_DENIED) {
            window.db.ref(key).remove()
                .catch(function(err) { window.DB.handleError(err); });
        }
    }
};

// ---- Auto-migration: push localStorage data to cloud if cloud is empty ----
setTimeout(function() {
    CloudDB.readAll(function(cloudData) {
        var isEmpty = !cloudData ||
                     ((!cloudData.customMatches || cloudData.customMatches.length === 0) &&
                      (!cloudData.channels || cloudData.channels.length === 0));

        if (isEmpty) {
            var localMatches = JSON.parse(localStorage.getItem('customMatches')) || [];
            var localChannels = JSON.parse(localStorage.getItem('channels')) || [];

            if (localMatches.length > 0 || localChannels.length > 0) {
                console.log('[DB] 📤 Migrating localStorage data to cloud...');
                var migrateData = cloudData || {};
                migrateData.customMatches = localMatches;
                migrateData.channels = localChannels;
                CloudDB.writeAll(migrateData, function(success) {
                    if (success) {
                        console.log('[DB] ✅ Migration to cloud complete!');
                    }
                });
            }
        } else {
            console.log('[DB] ☁️ Cloud has data, syncing to local...');
            // Sync cloud data to localStorage
            if (cloudData.customMatches) {
                localStorage.setItem('customMatches', JSON.stringify(cloudData.customMatches));
            }
            if (cloudData.channels) {
                localStorage.setItem('channels', JSON.stringify(cloudData.channels));
            }
        }
    });
}, 1500);

console.log('[KOORA LIVE] Database ready - using JSONBlob cloud + localStorage ✅');
