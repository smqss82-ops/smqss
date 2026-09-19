/* ── SMQSS i18n Module ── */
(function() {
    'use strict';

    var _currentLang = 'en';
    var _translations = {};
    var _loadedLangs = {};
    var _API_BASE = window.location.origin;
    var _pollTimer = null;

    function t(key, params) {
        var val = _translations[key] || (window._i18nFallback && window._i18nFallback[key]) || key;
        if (params) {
            Object.keys(params).forEach(function(k) {
                val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
            });
        }
        return val;
    }

    function translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var key = el.getAttribute('data-i18n');
            var val = t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.hasAttribute('placeholder')) {
                    el.setAttribute('placeholder', val);
                } else {
                    el.value = val;
                }
            } else {
                el.textContent = val;
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', t(key));
        });
        document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
            var key = el.getAttribute('data-i18n-title');
            el.setAttribute('title', t(key));
        });
    }

    function setLanguage(lang) {
        _currentLang = lang;
        localStorage.setItem('smqss_lang', lang);

        function loadAndApply(data) {
            _loadedLangs[lang] = data;
            _translations = data;
            if (lang !== 'en' && _loadedLangs['en']) {
                Object.keys(_loadedLangs['en']).forEach(function(k) {
                    if (!_translations[k]) _translations[k] = _loadedLangs['en'][k];
                });
            }
            translatePage();
        }

        if (_loadedLangs[lang]) {
            loadAndApply(_loadedLangs[lang]);
            return Promise.resolve();
        }

        var ensureEnglish = Promise.resolve();
        if (!_loadedLangs['en'] && lang !== 'en') {
            ensureEnglish = fetch('/static/i18n/en.json')
                .then(function(r) { return r.json(); })
                .then(function(data) { _loadedLangs['en'] = data; });
        }

        return ensureEnglish.then(function() {
            return fetch('/static/i18n/' + lang + '.json');
        })
        .then(function(r) { return r.json(); })
        .then(loadAndApply)
        .catch(function(e) {
            console.warn('[i18n] Failed to load ' + lang + ':', e);
            if (lang !== 'en') {
                _currentLang = 'en';
                if (_loadedLangs['en']) {
                    _translations = _loadedLangs['en'];
                    translatePage();
                }
            }
        });
    }

    function getCurrentLanguage() {
        return _currentLang;
    }

    function pollLanguage() {
        fetch(_API_BASE + '/api/public/language')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success && data.language && data.language !== _currentLang) {
                    setLanguage(data.language);
                }
            })
            .catch(function() {});
    }

    function startPolling(intervalMs) {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(pollLanguage, intervalMs || 30000);
    }

    function initI18n(opts) {
        opts = opts || {};
        var lang = opts.language || 'en';
        return setLanguage(lang).then(function() {
            if (opts.poll !== false) {
                startPolling(opts.pollInterval || 30000);
            }
        });
    }

    window.SMSS_i18n = {
        t: t,
        setLanguage: setLanguage,
        getCurrentLanguage: getCurrentLanguage,
        translatePage: translatePage,
        pollLanguage: pollLanguage,
        startPolling: startPolling,
        initI18n: initI18n
    };
})();
