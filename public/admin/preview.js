// Live preview for the Limitless PA content manager.
//
// Instead of a plain text preview, each editor shows the real website page
// (same design, fonts, and logo) and pushes the unsaved changes into it as
// you type. Desktop / Tablet / Phone buttons resize the page like a device.
// The page side of this lives in src/scripts/cms-preview.ts.
(function () {
  var CMS = window.CMS;
  var h = window.h;
  var createClass = window.createClass;
  if (!CMS || !h || !createClass) return;

  var DEVICES = [
    { label: 'Desktop', width: 1280 },
    { label: 'Tablet', width: 820 },
    { label: 'Phone', width: 390 },
  ];

  // Which page(s) each "Page text" file appears on.
  var PAGES = {
    home: [{ label: 'Home', path: '/' }],
    about: [{ label: 'About', path: '/about/' }],
    'for-businesses': [{ label: 'For businesses', path: '/for-businesses/' }],
    resources: [{ label: 'Resources', path: '/resources/' }],
    donate: [{ label: 'Donate', path: '/donate/' }],
    'places-page': [{ label: 'Find places', path: '/places/' }],
    'events-page': [{ label: 'Events', path: '/events/' }],
    forms: [
      { label: 'Suggest a place', path: '/suggest/' },
      { label: 'Share an event', path: '/submit-event/' },
      { label: 'Contact', path: '/contact/' },
      { label: 'Thank-you page', path: '/thank-you/' },
      { label: 'Newsletter confirmation', path: '/subscribed/' },
    ],
    privacy: [{ label: 'Privacy', path: '/privacy/' }],
    site: [{ label: 'Footer (on every page)', path: '/', focus: '.site-footer' }],
  };

  var btn = function (active) {
    return {
      font: '500 13px/1 system-ui, sans-serif',
      padding: '8px 12px',
      borderRadius: '999px',
      border: '1px solid ' + (active ? '#11404e' : '#cfd4d6'),
      background: active ? '#11404e' : '#fff',
      color: active ? '#fff' : '#11404e',
      cursor: 'pointer',
    };
  };

  function makePreview(opts) {
    // opts.scope: 'entry' or a page file name; opts.pages(props) -> [{label, path, focus}]
    return createClass({
      getInitialState: function () {
        return { device: 0, page: 0, scale: 1, frameHeight: 900, fallback: false };
      },

      pages: function () {
        return opts.pages(this.props, this.state);
      },

      src: function () {
        var page = this.pages()[this.state.page] || this.pages()[0];
        return page.path + (page.path.indexOf('?') === -1 ? '?' : '&') + 'cms-preview';
      },

      componentDidMount: function () {
        var self = this;
        this.win = this.root.ownerDocument.defaultView;
        this.onMessage = function (e) {
          if (self.frame && e.source === self.frame.contentWindow && e.data && e.data.type === 'limitless-cms:ready') {
            self.send();
          }
        };
        this.win.addEventListener('message', this.onMessage);
        this.onResize = function () {
          self.fit();
        };
        this.win.addEventListener('resize', this.onResize);
        if (this.win.ResizeObserver) {
          this.ro = new this.win.ResizeObserver(this.onResize);
          this.ro.observe(this.root);
        }
        this.fit();
      },

      componentWillUnmount: function () {
        this.win.removeEventListener('message', this.onMessage);
        this.win.removeEventListener('resize', this.onResize);
        if (this.ro) this.ro.disconnect();
      },

      componentDidUpdate: function (prevProps, prevState) {
        if (prevState.device !== this.state.device) this.fit();
        this.send();
      },

      fit: function () {
        if (!this.root) return;
        var available = Math.max(200, this.root.clientWidth - 32);
        var device = DEVICES[this.state.device].width;
        var scale = Math.min(1, available / device);
        var frameHeight = Math.max(600, (this.win.innerHeight - 64) / scale);
        if (Math.abs(scale - this.state.scale) > 0.001 || Math.abs(frameHeight - this.state.frameHeight) > 1) {
          this.setState({ scale: scale, frameHeight: frameHeight });
        }
      },

      send: function () {
        var frame = this.frame;
        if (!frame || !frame.contentWindow) return;
        var data = this.props.entry.get('data');
        frame.contentWindow.postMessage(
          { type: 'limitless-cms:update', scope: opts.scope, data: data && data.toJS ? data.toJS() : {} },
          window.location.origin,
        );
      },

      onFrameLoad: function () {
        var doc;
        try {
          doc = this.frame.contentDocument;
        } catch (e) {
          return;
        }
        if (!doc) return;
        // An entry whose page isn't published yet: switch to the blank layout.
        if (opts.scope === 'entry' && !this.state.fallback && !doc.querySelector('[data-cms^="entry:"]')) {
          this.setState({ fallback: true });
          return;
        }
        var page = this.pages()[this.state.page] || {};
        if (page.focus) {
          var target = doc.querySelector(page.focus);
          if (target) target.scrollIntoView({ block: 'start' });
        }
      },

      render: function () {
        var self = this;
        var pages = this.pages();
        var device = DEVICES[this.state.device];
        var scale = this.state.scale;
        var page = pages[this.state.page] || pages[0];

        var toolbar = h(
          'div',
          {
            style: {
              position: 'sticky',
              top: 0,
              zIndex: 2,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              // room on the right for the CMS's own preview buttons
              padding: '10px 72px 10px 16px',
              background: '#f6f6f6',
              borderBottom: '1px solid #e2e2e2',
              font: '13px/1.3 system-ui, sans-serif',
              color: '#555',
            },
          },
          h('strong', { style: { color: '#11404e', marginRight: '4px' } }, 'Live preview'),
          DEVICES.map(function (d, i) {
            return h(
              'button',
              {
                key: d.label,
                type: 'button',
                style: btn(i === self.state.device),
                'aria-pressed': i === self.state.device,
                onClick: function () {
                  self.setState({ device: i });
                },
              },
              d.label,
            );
          }),
          h('span', { style: { flex: 1 } }),
          page.path.indexOf('/admin/') === 0
            ? h('span', { style: { color: '#555' } }, 'Not on the website yet')
            : h(
            'a',
            {
              href: page.path,
              target: '_blank',
              rel: 'noopener',
              style: { color: '#11404e' },
              title: 'Opens the published version of this page',
            },
            'Open live page ↗',
          ),
        );

        var tabs =
          pages.length > 1
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '10px 16px 0',
                    font: '13px/1.3 system-ui, sans-serif',
                  },
                },
                h('span', { style: { color: '#555', alignSelf: 'center', marginRight: '4px' } }, 'Show:'),
                pages.map(function (p, i) {
                  return h(
                    'button',
                    {
                      key: p.path,
                      type: 'button',
                      style: btn(i === self.state.page),
                      'aria-pressed': i === self.state.page,
                      onClick: function () {
                        self.setState({ page: i });
                      },
                    },
                    p.label,
                  );
                }),
              )
            : null;

        var note = h(
          'p',
          { style: { margin: '10px 16px 0', font: '12px/1.4 system-ui, sans-serif', color: '#555' } },
          'Changes show here as you type. Visitors see them after you click Publish.',
        );

        var frame = h(
          'div',
          {
            style: {
              width: device.width * scale + 'px',
              height: this.state.frameHeight * scale + 'px',
              margin: '12px auto 24px',
              overflow: 'hidden',
              borderRadius: device.width < 1000 ? '16px' : '6px',
              boxShadow: '0 2px 12px rgb(0 0 0 / 12%)',
              background: '#fff',
            },
          },
          h('iframe', {
            key: this.src(),
            ref: function (el) {
              self.frame = el;
            },
            src: this.src(),
            title: 'Live preview of ' + page.label,
            onLoad: function () {
              self.onFrameLoad();
            },
            style: {
              width: device.width + 'px',
              height: this.state.frameHeight + 'px',
              border: 0,
              transform: 'scale(' + scale + ')',
              transformOrigin: 'top left',
              display: 'block',
            },
          }),
        );

        return h(
          'div',
          {
            ref: function (el) {
              self.root = el;
            },
            style: { minHeight: '100vh', background: '#eceeef', margin: '-8px' },
          },
          toolbar,
          tabs,
          note,
          frame,
        );
      },
    });
  }

  // Page text files
  Object.keys(PAGES).forEach(function (name) {
    CMS.registerPreviewTemplate(
      name,
      makePreview({
        scope: name,
        pages: function () {
          return PAGES[name];
        },
      }),
    );
  });

  // Events and places: show the real listing page, or a blank layout for
  // new entries and drafts that aren't on the site yet.
  ['event', 'place'].forEach(function (kind) {
    CMS.registerPreviewTemplate(
      kind + 's',
      makePreview({
        scope: 'entry',
        pages: function (props, state) {
          var entry = props.entry;
          var slug = entry.get('slug');
          var unpublished = entry.get('newRecord') || entry.getIn(['data', 'draft']) || !slug || state.fallback;
          var label = kind === 'event' ? 'Event page' : 'Place page';
          return [
            {
              label: label,
              path: unpublished ? '/admin/preview/' + kind + '/' : '/' + kind + 's/' + slug + '/',
            },
          ];
        },
      }),
    );
  });
})();
