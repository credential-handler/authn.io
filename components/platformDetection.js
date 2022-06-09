import {detect} from 'detect-browser';

const browser = detect();

export function shouldUseFirstPartyMode() {
  if(browser && browser.name === 'chrome') {
    return false;
  }

  return true;
}
