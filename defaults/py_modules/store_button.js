// Injected into Steam store app pages by store_button.py.
// Adds one button to the game card at the top left of the page, between the description
// and the price, rendered by the store's own React button component. The card is a single
// gamepad focus target, so the button is not a focus target of its own: the card's Y
// button (unused by the store) opens the same window and shows the label in the footer.
// Clicking either calls the CDP binding, which opens the artwork window in the plugin.
(() => {
  const LABEL = __SGDB_LABEL__;
  const BINDING = __SGDB_BINDING__;
  // The newest backend owns the button; others ignore its clicks. Tokens start with a
  // zero-padded start time, so the newest compares greatest. A plugin reload can leave an
  // older backend running for a while, and it must not take the button back.
  const OWNER = __SGDB_OWNER__;
  const KEY = 'sgdb-artwork';
  const VERSION = 4;

  const existing = window.__sgdbStoreButton;
  if (existing && existing.version === VERSION) {
    existing.setOwner(OWNER);
    existing.setLabel(LABEL);
    return 'updated';
  }
  // A copy from another plugin version: take it down before installing this one.
  if (existing) { try { existing.stop(); } catch (e) { delete window.__sgdbStoreButton; } }

  const state = { label: LABEL, owner: OWNER, orig: null, patched: null, buttonType: null };

  const containerKey = (el) => Object.keys(el).find((k) => k.startsWith('__reactContainer'));
  const elementsOf = (c) => (Array.isArray(c) ? c : [c]).filter((x) => x && typeof x === 'object' && x.props);

  const walkFibers = (visit) => {
    const host = [...document.querySelectorAll('body, body *')].find((el) => containerKey(el));
    if (!host) return;
    const stack = [host[containerKey(host)]];
    while (stack.length) {
      const f = stack.pop();
      if (!f) continue;
      if (visit(f) === false) return;
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
  };

  // The game card: a component with an `appid` prop that renders a focusable whose A button
  // jumps to the purchase options and whose X button toggles the wishlist.
  const isCard = (f) => typeof f.type === 'function' && f.memoizedProps && 'appid' in f.memoizedProps &&
    f.child && f.child.memoizedProps && 'onActivate' in f.child.memoizedProps &&
    'onOptionsButton' in f.child.memoizedProps && 'onSecondaryButton' in f.child.memoizedProps;

  const findCards = () => {
    const found = [];
    walkFibers((f) => { if (f.type === state.patched || isCard(f)) found.push(f); });
    return found;
  };

  // The store's base button: it takes `focusable: false` to render a plain <button>.
  const learnButton = () => {
    walkFibers((f) => {
      const p = f.memoizedProps;
      if (typeof f.type !== 'function' || !p || !('color' in p) || !('onClick' in p) || !('children' in p)) return true;
      const src = String(f.type);
      if (src.includes('focusable:') && src.includes('variant:') && src.includes('loading:') && src.includes('navProps:')) {
        state.buttonType = f.type;
        return false;
      }
      return true;
    });
    return Boolean(state.buttonType);
  };

  const open = (appid) => {
    try { window[BINDING](JSON.stringify({ appid: Number(appid), owner: state.owner })); } catch (e) { /* plugin gone */ }
  };

  // Card output: focusable > panel > [header image, body column > [title, description, price row]].
  const addButton = (ret, props) => {
    const panel = ret && ret.props && elementsOf(ret.props.children)[0];
    const panelKids = panel && panel.props.children;
    if (!Array.isArray(panelKids)) return ret;
    const bodyIdx = panelKids.findIndex((e) => e && e.props && e.props.direction === 'column' && Array.isArray(e.props.children));
    if (bodyIdx < 0) return ret;
    const body = panelKids[bodyIdx];
    const kids = body.props.children;
    if (kids.length < 2 || !kids[0] || kids.some((k) => k && k.key === KEY)) return ret;

    const onClick = (e) => {
      // The card itself jumps to the purchase options on click.
      if (e && e.stopPropagation) e.stopPropagation();
      open(props.appid);
    };
    const button = {
      ...kids[0],
      type: state.buttonType,
      key: null,
      props: { variant: 'basic', color: 'greyneutral', width: '100%', focusable: false, onClick, children: state.label },
    };
    const wrapper = {
      ...kids[0],
      type: 'div',
      key: KEY,
      props: { style: { flex: '0 0 auto', margin: '6px 0 8px' }, children: button },
    };
    // After the description, before the price row.
    const newKids = [...kids.slice(0, 2), wrapper, ...kids.slice(2)];
    const newPanelKids = [...panelKids];
    newPanelKids[bodyIdx] = { ...body, props: { ...body.props, children: newKids } };
    return {
      ...ret,
      props: {
        ...ret.props,
        onOptionsButton: () => open(props.appid),
        onOptionsActionDescription: state.label,
        children: { ...panel, props: { ...panel.props, children: newPanelKids } },
      },
    };
  };

  const makePatched = (orig) => function SgdbStoreCard(props) {
    const ret = orig(props);
    if (!state.buttonType) return ret;
    try { return addButton(ret, props); } catch (e) { return ret; }
  };

  // Re-render a card now: mark its store hook's snapshot stale (so React treats the
  // render as an update instead of keeping the old children) and notify the store.
  const refresh = (f) => {
    let observer = null;
    for (const fiber of [f, f.alternate]) {
      let h = fiber && fiber.memoizedState;
      while (h) {
        const s = h.memoizedState;
        if (s && typeof s.subscribe === 'function' && s.listeners) observer = s;
        if (h.queue && 'getSnapshot' in h.queue) { h.queue.value = { stale: true }; h.memoizedState = { stale: true }; }
        h = h.next;
      }
    }
    if (observer) observer.listeners.forEach((l) => { try { l(); } catch (e) { /* ignore */ } });
  };

  // Only `type` changes: React matches children by `elementType`, so the card keeps the
  // patched function when its parent re-renders.
  const setType = (f, type) => {
    f.type = type;
    if (f.alternate) f.alternate.type = type;
  };

  const tick = () => {
    try {
      if (!state.buttonType && !learnButton()) return;
      for (const f of findCards()) {
        if (f.type === state.patched) continue;
        if (!state.orig) {
          state.orig = f.type;
          state.patched = makePatched(f.type);
        }
        if (f.type !== state.orig) continue;
        setType(f, state.patched);
        refresh(f);
      }
    } catch (e) { /* the page changed under us; try again next tick */ }
  };

  const timer = window.setInterval(tick, 1500);
  tick();

  window.__sgdbStoreButton = {
    version: VERSION,
    setOwner(owner) { if (owner > state.owner) state.owner = owner; },
    setLabel(label) {
      state.label = label;
      for (const f of findCards()) if (f.type === state.patched) refresh(f);
    },
    stop() {
      window.clearInterval(timer);
      for (const f of findCards()) {
        if (f.type === state.patched && state.orig) { setType(f, state.orig); refresh(f); }
      }
      delete window.__sgdbStoreButton;
    },
  };
  return 'installed';
})()
