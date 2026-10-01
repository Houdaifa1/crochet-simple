'use client';
import { useFormModified } from '@payloadcms/ui';
import { useEffect } from 'react';

const QUESTION = 'You have changes that are not saved yet. Leave this page and lose them?';

// kept outside the component: the admin may remount the form when Back is pressed
let changed = false;
let trappedAt: string | null = null;
let listening = false;

// a copy of this page in the history, so Back lands here first and can be stopped
const trap = () => {
  window.history.pushState(window.history.state, '', window.location.href);
  trappedAt = window.location.href;
};

const onBack = () => {
  // only a step back from the copy to this same page is an attempt to leave
  if (trappedAt !== window.location.href) return;
  if (!changed || window.confirm(QUESTION)) {
    trappedAt = null;
    window.history.back();
  } else trap();
};

// the admin already asks before links and closing the tab; this covers the browser's back button
export function BackGuard() {
  const modified = useFormModified();

  useEffect(() => {
    if (!listening) {
      window.addEventListener('popstate', onBack);
      listening = true;
    }
    return () => {
      changed = false;
    };
  }, []);

  useEffect(() => {
    changed = modified;
    if (modified && trappedAt !== window.location.href) trap();
  }, [modified]);

  return null;
}
